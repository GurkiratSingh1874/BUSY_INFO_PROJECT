const Task = require('../models/Task');

/**
 * Validates a task state transition according to the strict lifecycle rules.
 * Rules:
 * - Backlog -> In Progress (Allowed)
 * - In Progress -> In Review (Allowed)
 * - In Progress -> Blocked (Allowed)
 * - In Review -> Done (Allowed, if blockers are Done)
 * - In Review -> Blocked (Allowed)
 * - Blocked -> Unblocked (returns to In Progress or In Review depending on preBlockedStatus)
 * - Done -> Reopen (Backlog, In Progress, or In Review)
 * - All other transitions are rejected.
 * 
 * @param {string} currentStatus - The current status of the task.
 * @param {string} targetStatus - The status we want to transition to.
 * @param {string} preBlockedStatus - The status before it was blocked (if currentStatus is 'blocked').
 * @returns {object} { isValid: boolean, message: string }
 */
const validateTransition = (currentStatus, targetStatus, preBlockedStatus) => {
  if (currentStatus === targetStatus) {
    return { isValid: true, message: 'Status is already ' + targetStatus };
  }

  // 1. Reopening Done tasks is allowed to Backlog, In Progress, or In Review
  if (currentStatus === 'done') {
    if (['backlog', 'in_progress', 'in_review'].includes(targetStatus)) {
      return { isValid: true, message: 'Task successfully reopened' };
    }
    return {
      isValid: false,
      message: 'Reopening a completed task is only allowed to Backlog, In Progress, or In Review.',
    };
  }

  // 2. Unblocking tasks
  if (currentStatus === 'blocked') {
    if (targetStatus === preBlockedStatus) {
      return { isValid: true, message: 'Task successfully unblocked' };
    }
    return {
      isValid: false,
      message: `Unblocking a task must return it to its pre-blocked state: '${preBlockedStatus}'.`,
    };
  }

  // 3. From Backlog, you can only move to In Progress
  if (currentStatus === 'backlog') {
    if (targetStatus === 'in_progress') {
      return { isValid: true, message: 'Moved to In Progress' };
    }
    return {
      isValid: false,
      message: 'From Backlog, you can only transition to In Progress (backward or skipped transitions are rejected).',
    };
  }

  // 4. From In Progress, you can move to In Review or Blocked
  if (currentStatus === 'in_progress') {
    if (targetStatus === 'in_review') {
      return { isValid: true, message: 'Moved to In Review' };
    }
    if (targetStatus === 'blocked') {
      return { isValid: true, message: 'Task marked as Blocked' };
    }
    return {
      isValid: false,
      message: 'From In Progress, you can only transition forward to In Review or mark it as Blocked.',
    };
  }

  // 5. From In Review, you can move to Done or Blocked
  if (currentStatus === 'in_review') {
    if (targetStatus === 'done') {
      return { isValid: true, message: 'Moved to Done' };
    }
    if (targetStatus === 'blocked') {
      return { isValid: true, message: 'Task marked as Blocked' };
    }
    return {
      isValid: false,
      message: 'From In Review, you can only transition forward to Done or mark it as Blocked.',
    };
  }

  return { isValid: false, message: `Invalid transition from ${currentStatus} to ${targetStatus}` };
};

/**
 * Checks if a task is blocked by any unfinished tasks in its dependency chain.
 * @param {string} taskId - The ID of the task.
 * @returns {object} { isBlocked: boolean, unfinishedBlockers: Array }
 */
const checkBlockerDependencies = async (taskId) => {
  try {
    const task = await Task.findById(taskId).populate('blockers');
    if (!task) {
      return { isBlocked: false, error: 'Task not found' };
    }

    // Find any blocker that is not 'done'
    const unfinished = task.blockers.filter(blocker => blocker.status !== 'done');

    if (unfinished.length > 0) {
      return {
        isBlocked: true,
        unfinishedBlockers: unfinished.map(t => ({ id: t._id, title: t.title, status: t.status })),
      };
    }

    return { isBlocked: false, unfinishedBlockers: [] };
  } catch (error) {
    return { isBlocked: false, error: error.message };
  }
};

module.exports = {
  validateTransition,
  checkBlockerDependencies,
};
