const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const TaskTimeline = require('../models/TaskTimeline');
const { protect, authorize, verifyProjectAccess } = require('../middleware/auth');
const { validateTransition, checkBlockerDependencies } = require('../utils/lifecycle');
const { logTimelineEvent } = require('../utils/timeline');

const router = express.Router();

// Helper to determine added and removed items between two arrays
const getArrayDiff = (oldArr, newArr) => {
  const oldSet = new Set(oldArr.map(id => id.toString()));
  const newSet = new Set(newArr.map(id => id.toString()));

  const added = newArr.filter(id => !oldSet.has(id.toString()));
  const removed = oldArr.filter(id => !newSet.has(id.toString()));

  return { added, removed };
};

// @desc    Get all tasks with server-side text search, filtering, sorting, and pagination (README Goal 6)
// @route   GET /api/tasks
// @access  Private (Scoped by project access permissions)
router.get('/', protect, async (req, res) => {
  try {
    const {
      search,
      projectId,
      status,
      assigneeId,
      priority,
      overdue,
      myTasks,
      includeArchived,
      sortBy = 'updatedAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    // 1. Determine Allowed Projects based on user role & membership
    let projectScopeQuery = {};
    if (req.user.role !== 'manager') {
      projectScopeQuery.members = req.user._id;
    }
    if (includeArchived !== 'true') {
      projectScopeQuery.isArchived = { $ne: true };
    }

    const allowedProjects = await Project.find(projectScopeQuery).select('_id');
    const allowedProjectIds = allowedProjects.map(p => p._id);

    let query = {};

    // 2. Project Filter
    if (projectId) {
      const isAllowed = allowedProjectIds.some(id => id.toString() === projectId);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to view tasks for this project.',
        });
      }
      query.projectId = projectId;
    } else {
      query.projectId = { $in: allowedProjectIds };
    }

    // 3. Text Search over Title and Description
    if (search && search.trim()) {
      const trimmed = search.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    }

    // 4. Status Filter
    if (status) {
      query.status = status;
    }

    // 5. Assignee Filter
    if (assigneeId) {
      query.assignees = assigneeId;
    }

    // 6. "My Tasks" Filter Shortcut
    if (myTasks === 'true') {
      query.assignees = req.user._id;
      if (!status) {
        query.status = { $ne: 'done' };
      }
    }

    // 7. Priority Filter
    if (priority) {
      query.priority = priority;
    }

    // 8. Overdue Filter
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date(), $ne: null };
      if (!status) {
        query.status = { $ne: 'done' };
      }
    }

    // 9. Server-Side Sorting
    let sortObj = {};
    const sortDirection = order === 'asc' ? 1 : -1;

    if (sortBy === 'dueDate') {
      sortObj = { dueDate: sortDirection, createdAt: -1 };
    } else if (sortBy === 'priority') {
      sortObj = { priority: sortDirection, updatedAt: -1 };
    } else if (sortBy === 'createdAt') {
      sortObj = { createdAt: sortDirection };
    } else {
      sortObj = { updatedAt: sortDirection };
    }

    // 10. Execute Server-Side Query and Count in parallel
    const [total, tasks] = await Promise.all([
      Task.countDocuments(query),
      Task.find(query)
        .populate('projectId', 'key name isArchived')
        .populate('assignees', 'name email role')
        .populate('blockers', 'title status')
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit),
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasPrevPage: parsedPage > 1,
        hasNextPage: parsedPage < totalPages,
      },
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error querying tasks: ' + error.message,
    });
  }
});

// @desc    Get tasks under a specific project
// @route   GET /api/projects/:projectId/tasks
// @access  Private (scoping verified by verifyProjectAccess)
router.get('/project/:projectId', protect, verifyProjectAccess, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignees', 'name email role')
      .populate('blockers', 'title status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching project tasks: ' + error.message });
  }
});

// @desc    Get single task details with its immutable timeline history
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('projectId', 'key name members isArchived')
      .populate('assignees', 'name email role')
      .populate('blockers', 'title status');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Verify project access
    if (req.user.role !== 'manager' && !task.projectId.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this task\'s project' });
    }

    // Fetch chronological timeline events and populate actor details
    const timeline = await TaskTimeline.find({ taskId: task._id })
      .populate('userId', 'name email role')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: task, timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching task details: ' + error.message });
  }
});

// @desc    Create a task inside a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private (scoping verified by verifyProjectAccess)
router.post('/project/:projectId', protect, verifyProjectAccess, async (req, res) => {
  const { title, description, priority, dueDate, assignees, blockers } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Task title is required' });
  }

  try {
    const project = req.project; // Pre-loaded by verifyProjectAccess middleware

    // Validate that all assignees belong to the project membership
    if (assignees && assignees.length > 0) {
      const invalidAssignees = assignees.filter(id => !project.members.includes(id));
      if (invalidAssignees.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Assignment failed: All task assignees must be registered project members.',
        });
      }
    }

    // Validate blockers belong to the same project
    if (blockers && blockers.length > 0) {
      const matchingTasksCount = await Task.countDocuments({
        _id: { $in: blockers },
        projectId: req.params.projectId,
      });
      if (matchingTasksCount !== blockers.length) {
        return res.status(400).json({
          success: false,
          error: 'Dependency failed: Blocker tasks must exist inside the same project.',
        });
      }
    }

    const task = await Task.create({
      projectId: req.params.projectId,
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      assignees: assignees || [],
      blockers: blockers || [],
    });

    // Log creation in timeline
    await logTimelineEvent({
      taskId: task._id,
      userId: req.user._id,
      type: 'create',
    });

    // Log assignments in timeline
    if (assignees && assignees.length > 0) {
      for (const userId of assignees) {
        await logTimelineEvent({
          taskId: task._id,
          userId: req.user._id,
          type: 'assign',
          newValue: userId,
        });
      }
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error creating task: ' + error.message });
  }
});

// @desc    Update task details (and enforce state transition & blocker validations)
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { title, description, priority, dueDate, status, assignees, blockers } = req.body;

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Retrieve associated project details to verify membership checks
    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Associated project not found' });
    }

    // Verify project member boundary permissions
    if (req.user.role !== 'manager' && !project.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Access denied to edit this task' });
    }

    // 1. Validate status transition and blocker constraints if status is changing
    if (status && status !== task.status) {
      // Validate sequential states
      const transition = validateTransition(task.status, status, task.preBlockedStatus);
      if (!transition.isValid) {
        return res.status(400).json({ success: false, error: transition.message });
      }

      // Validate blocker completion rules
      if (status === 'done') {
        const blockerCheck = await checkBlockerDependencies(task._id);
        if (blockerCheck.isBlocked) {
          const names = blockerCheck.unfinishedBlockers.map(t => `'${t.title}' (${t.status})`).join(', ');
          return res.status(400).json({
            success: false,
            error: `Cannot complete task: It is blocked by unfinished tasks: ${names}`,
          });
        }
      }

      // Handle transitions involving the 'blocked' state
      const oldStatus = task.status;
      task.status = status;

      if (status === 'blocked') {
        task.preBlockedStatus = oldStatus;
      } else if (oldStatus === 'blocked') {
        task.preBlockedStatus = null;
      }

      // Log status change in timeline
      await logTimelineEvent({
        taskId: task._id,
        userId: req.user._id,
        type: 'field_change',
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: status,
      });
    }

    // 2. Validate and log assignee updates
    if (assignees) {
      // Assert assignee list comprises project members
      const invalidAssignees = assignees.filter(id => !project.members.includes(id));
      if (invalidAssignees.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Assignment failed: All task assignees must be registered project members.',
        });
      }

      const { added, removed } = getArrayDiff(task.assignees, assignees);
      task.assignees = assignees;

      // Log assignments and unassignments
      for (const userId of added) {
        await logTimelineEvent({
          taskId: task._id,
          userId: req.user._id,
          type: 'assign',
          newValue: userId,
        });
      }
      for (const userId of removed) {
        await logTimelineEvent({
          taskId: task._id,
          userId: req.user._id,
          type: 'unassign',
          newValue: userId,
        });
      }
    }

    // 3. Log field edits for title, description, priority, due date, and blockers
    const fieldsToTrack = [
      { name: 'title', val: title },
      { name: 'description', val: description },
      { name: 'priority', val: priority },
      { name: 'dueDate', val: dueDate },
      { name: 'blockers', val: blockers },
    ];

    for (const field of fieldsToTrack) {
      if (field.val !== undefined) {
        let isChanged = false;
        let oldValue = task[field.name];
        let newValue = field.val;

        if (field.name === 'dueDate') {
          // Compare dates properly
          const oldTime = oldValue ? new Date(oldValue).getTime() : null;
          const newTime = newValue ? new Date(newValue).getTime() : null;
          isChanged = oldTime !== newTime;
        } else if (field.name === 'blockers') {
          // Compare arrays of ObjectIds
          const oldSet = new Set(oldValue.map(id => id.toString()));
          const newSet = new Set(newValue.map(id => id.toString()));
          isChanged = oldSet.size !== newSet.size || [...oldSet].some(x => !newSet.has(x));
        } else {
          isChanged = oldValue !== newValue;
        }

        if (isChanged) {
          task[field.name] = field.val;
          await logTimelineEvent({
            taskId: task._id,
            userId: req.user._id,
            type: 'field_change',
            fieldName: field.name,
            oldValue,
            newValue,
          });
        }
      }
    }

    await task.save();

    const populated = await task.populate([
      { path: 'assignees', select: 'name email role' },
      { path: 'blockers', select: 'title status' },
    ]);

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error updating task: ' + error.message });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private/Manager
router.delete('/:id', protect, authorize('manager'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Clean up timeline entries and dismissals associated with this task
    await TaskTimeline.deleteMany({ taskId: task._id });
    await Task.deleteOne({ _id: task._id });

    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting task: ' + error.message });
  }
});

// @desc    Add comment to task timeline
// @route   POST /api/tasks/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  const { commentText } = req.body;

  if (!commentText) {
    return res.status(400).json({ success: false, error: 'Comment text is required' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Associated project not found' });
    }

    // Verify member permissions
    if (req.user.role !== 'manager' && !project.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Access denied to comment on this task' });
    }

    // Log comment in timeline
    const commentEvent = await logTimelineEvent({
      taskId: task._id,
      userId: req.user._id,
      type: 'comment',
      commentText,
    });

    const populated = await commentEvent.populate('userId', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error adding comment: ' + error.message });
  }
});

module.exports = router;
