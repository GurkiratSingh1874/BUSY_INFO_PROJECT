const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const AlertDismissal = require('../models/AlertDismissal');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper to get project IDs accessible by the user
const getAccessibleProjectIds = async (user) => {
  let projectQuery = { isArchived: false };
  if (user.role !== 'manager') {
    projectQuery.members = user._id;
  }
  const projects = await Project.find(projectQuery).select('_id');
  return projects.map(p => p._id);
};

// @desc    Get overdue alerts for the logged-in user
// @route   GET /api/alerts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const accessibleProjectIds = await getAccessibleProjectIds(req.user);

    const now = new Date();

    // Query overdue, unfinished tasks in accessible projects
    const tasks = await Task.find({
      projectId: { $in: accessibleProjectIds },
      status: { $ne: 'done' },
      dueDate: { $ne: null, $lt: now },
    })
      .populate('projectId', 'name key')
      .populate('assignees', 'name email role')
      .sort({ dueDate: 1 }); // Most overdue first

    // Fetch this user's alert dismissals
    const dismissals = await AlertDismissal.find({ userId: req.user._id });
    const dismissalMap = new Map();
    for (const d of dismissals) {
      dismissalMap.set(d.taskId.toString(), new Date(d.associatedDueDate).getTime());
    }

    const activeAlerts = [];
    const dismissedAlerts = [];

    for (const task of tasks) {
      const taskDueDateMs = task.dueDate ? new Date(task.dueDate).getTime() : 0;
      const dismissedDueDateMs = dismissalMap.get(task._id.toString());

      // Valid dismissal requires the dismissed date to match current task due date
      const isDismissed = dismissedDueDateMs !== undefined && dismissedDueDateMs === taskDueDateMs;
      const isAssignedToCurrentUser = task.assignees.some(
        a => a._id.toString() === req.user._id.toString()
      );

      const alertItem = {
        ...task.toObject(),
        isDismissed,
        isAssignedToCurrentUser,
      };

      if (isDismissed) {
        dismissedAlerts.push(alertItem);
      } else {
        activeAlerts.push(alertItem);
      }
    }

    res.status(200).json({
      success: true,
      count: activeAlerts.length,
      activeAlerts,
      dismissedAlerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching overdue alerts: ' + error.message });
  }
});

// @desc    Get active overdue alerts count for navigation badge
// @route   GET /api/alerts/count
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    const accessibleProjectIds = await getAccessibleProjectIds(req.user);
    const now = new Date();

    const tasks = await Task.find({
      projectId: { $in: accessibleProjectIds },
      status: { $ne: 'done' },
      dueDate: { $ne: null, $lt: now },
    }).select('_id dueDate');

    const dismissals = await AlertDismissal.find({ userId: req.user._id });
    const dismissalMap = new Map();
    for (const d of dismissals) {
      dismissalMap.set(d.taskId.toString(), new Date(d.associatedDueDate).getTime());
    }

    let activeCount = 0;
    for (const task of tasks) {
      const taskDueDateMs = task.dueDate ? new Date(task.dueDate).getTime() : 0;
      const dismissedDueDateMs = dismissalMap.get(task._id.toString());
      if (dismissedDueDateMs === undefined || dismissedDueDateMs !== taskDueDateMs) {
        activeCount++;
      }
    }

    res.status(200).json({ success: true, count: activeCount });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching alert count: ' + error.message });
  }
});

// @desc    Dismiss an overdue alert for an assigned task
// @route   POST /api/alerts/:taskId/dismiss
// @access  Private
router.post('/:taskId/dismiss', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Must be overdue and not done
    const now = new Date();
    if (!task.dueDate || new Date(task.dueDate) >= now) {
      return res.status(400).json({ success: false, error: 'Task is not overdue' });
    }

    if (task.status === 'done') {
      return res.status(400).json({ success: false, error: 'Completed tasks cannot generate overdue alerts' });
    }

    // REQUIREMENT: A person can dismiss an alert for a task they are assigned to. Unassigned cannot dismiss.
    const isAssigned = task.assignees.some(a => a.toString() === req.user._id.toString());
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only dismiss overdue alerts for tasks you are assigned to.',
      });
    }

    // Upsert the dismissal with the task's current due date
    await AlertDismissal.findOneAndUpdate(
      { userId: req.user._id, taskId: task._id },
      { associatedDueDate: task.dueDate },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Alert dismissed successfully.',
      taskId: task._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error dismissing alert: ' + error.message });
  }
});

// @desc    Undismiss / restore an overdue alert
// @route   POST /api/alerts/:taskId/undismiss
// @access  Private
router.post('/:taskId/undismiss', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const isAssigned = task.assignees.some(a => a.toString() === req.user._id.toString());
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only manage overdue alerts for tasks you are assigned to.',
      });
    }

    await AlertDismissal.deleteOne({ userId: req.user._id, taskId: task._id });

    res.status(200).json({
      success: true,
      message: 'Alert restored successfully.',
      taskId: task._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error restoring alert: ' + error.message });
  }
});

module.exports = router;
