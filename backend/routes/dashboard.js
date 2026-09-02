const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskTimeline = require('../models/TaskTimeline');
const { protect } = require('../middleware/auth');

/**
 * Returns the Monday 00:00:00 to Sunday 23:59:59 date range for a given date offset in weeks.
 * offsetWeeks = 0 is current week, 1 is 1 week ago, etc.
 */
const getWeekRange = (offsetWeeks = 0) => {
  const now = new Date();
  now.setDate(now.getDate() - offsetWeeks * 7);

  const day = now.getDay();
  // Sunday is day 0 in JS -> diff is -6; Monday is 1 -> diff is 0; etc.
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

/**
 * Formats a week range into a human-readable label like "Aug 11 - Aug 17" or "This Week".
 */
const formatWeekLabel = (start, end, isCurrentWeek) => {
  if (isCurrentWeek) return 'This Week';
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

// @desc    Get dashboard metrics, breakdowns, and 8-week completion trend
// @route   GET /api/dashboard
// @access  Private (Scoped by user role & project membership)
router.get('/', protect, async (req, res) => {
  try {
    const { projectId } = req.query;

    // 1. Determine scoped projects based on user permissions
    let projectFilter = { isArchived: { $ne: true } };

    if (req.user.role !== 'manager') {
      projectFilter.members = req.user._id;
    }

    if (projectId) {
      // If a specific project was requested, verify user has access
      const targetProject = await Project.findOne({ _id: projectId, isArchived: { $ne: true } });
      if (!targetProject) {
        return res.status(404).json({ success: false, error: 'Project not found or archived' });
      }

      if (req.user.role !== 'manager' && !targetProject.members.some(m => m.toString() === req.user._id.toString())) {
        return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this project' });
      }

      projectFilter._id = targetProject._id;
    }

    const accessibleProjects = await Project.find(projectFilter).select('_id name key members');
    const projectIds = accessibleProjects.map(p => p._id);

    if (projectIds.length === 0) {
      // Return empty metrics if user has no accessible projects
      const emptyWeeks = [];
      for (let i = 7; i >= 0; i--) {
        const { startOfWeek, endOfWeek } = getWeekRange(i);
        emptyWeeks.push({
          week: formatWeekLabel(startOfWeek, endOfWeek, i === 0),
          completed: 0,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            openTasks: 0,
            overdueTasks: 0,
            dueThisWeek: 0,
            completedThisWeek: 0,
          },
          byStatus: [
            { status: 'backlog', label: 'Backlog', count: 0 },
            { status: 'in_progress', label: 'In Progress', count: 0 },
            { status: 'in_review', label: 'In Review', count: 0 },
            { status: 'done', label: 'Done', count: 0 },
            { status: 'blocked', label: 'Blocked', count: 0 },
          ],
          byAssignee: [],
          completionsByWeek: emptyWeeks,
          projectsCount: 0,
          totalTasks: 0,
        },
      });
    }

    // 2. Fetch all tasks within the allowed project scope
    const allTasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('assignees', 'name email role')
      .lean();

    const now = new Date();
    const { startOfWeek: currentWeekStart, endOfWeek: currentWeekEnd } = getWeekRange(0);

    // 3. Compute Headline Metrics
    let openTasks = 0;
    let overdueTasks = 0;
    let dueThisWeek = 0;

    const statusCounts = {
      backlog: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      blocked: 0,
    };

    const assigneeMap = new Map(); // userId -> { name, email, count }
    let unassignedCount = 0;

    const doneTaskIds = [];

    for (const task of allTasks) {
      // Status breakdown
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      }

      // Open tasks (anything not 'done')
      if (task.status !== 'done') {
        openTasks++;

        // Overdue check
        if (task.dueDate && new Date(task.dueDate) < now) {
          overdueTasks++;
        }

        // Due this week check
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          if (due >= currentWeekStart && due <= currentWeekEnd) {
            dueThisWeek++;
          }
        }
      } else {
        doneTaskIds.push(task._id);
      }

      // Assignee breakdown
      if (!task.assignees || task.assignees.length === 0) {
        unassignedCount++;
      } else {
        for (const user of task.assignees) {
          const uId = user._id.toString();
          if (!assigneeMap.has(uId)) {
            assigneeMap.set(uId, {
              userId: uId,
              name: user.name,
              email: user.email,
              count: 0,
            });
          }
          assigneeMap.get(uId).count++;
        }
      }
    }

    // 4. Calculate Task Completion Timestamps (using TaskTimeline for precision)
    const completionEvents = await TaskTimeline.find({
      taskId: { $in: doneTaskIds },
      type: 'field_change',
      fieldName: 'status',
      newValue: 'done',
    }).sort({ createdAt: -1 }).lean();

    // Map each done task to its most recent 'done' timeline timestamp, falling back to updatedAt
    const taskDoneDates = new Map();
    for (const event of completionEvents) {
      const tIdStr = event.taskId.toString();
      if (!taskDoneDates.has(tIdStr)) {
        taskDoneDates.set(tIdStr, new Date(event.createdAt));
      }
    }

    const taskCompletions = [];
    for (const task of allTasks) {
      if (task.status === 'done') {
        const date = taskDoneDates.get(task._id.toString()) || new Date(task.updatedAt);
        taskCompletions.push(date);
      }
    }

    // Completed this week count
    const completedThisWeek = taskCompletions.filter(
      d => d >= currentWeekStart && d <= currentWeekEnd
    ).length;

    // 5. Build 8-Week Completion Trend (oldest to newest)
    const completionsByWeek = [];
    for (let i = 7; i >= 0; i--) {
      const { startOfWeek, endOfWeek } = getWeekRange(i);
      const count = taskCompletions.filter(d => d >= startOfWeek && d <= endOfWeek).length;
      completionsByWeek.push({
        week: formatWeekLabel(startOfWeek, endOfWeek, i === 0),
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        completed: count,
      });
    }

    // 6. Format Status Breakdown
    const byStatus = [
      { status: 'backlog', label: 'Backlog', count: statusCounts.backlog },
      { status: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
      { status: 'in_review', label: 'In Review', count: statusCounts.in_review },
      { status: 'done', label: 'Done', count: statusCounts.done },
      { status: 'blocked', label: 'Blocked', count: statusCounts.blocked },
    ];

    // 7. Format Assignee Breakdown
    const byAssignee = Array.from(assigneeMap.values()).sort((a, b) => b.count - a.count);
    if (unassignedCount > 0) {
      byAssignee.push({
        userId: 'unassigned',
        name: 'Unassigned',
        email: '',
        count: unassignedCount,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          openTasks,
          overdueTasks,
          dueThisWeek,
          completedThisWeek,
        },
        byStatus,
        byAssignee,
        completionsByWeek,
        projectsCount: accessibleProjects.length,
        totalTasks: allTasks.length,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Error calculating dashboard metrics: ' + error.message });
  }
});

module.exports = router;
