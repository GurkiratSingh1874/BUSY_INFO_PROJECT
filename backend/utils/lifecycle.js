const Task = require('../models/Task');

/**
 * Task Lifecycle State Machine Definition (README Goal 4)
 * 
 * Standard Lifecycle: Backlog -> In Progress -> In Review -> Done
 * 
 * State Rules:
 * 1. Backlog: Can only move forward to In Progress.
 * 2. In Progress: Can move forward to In Review, or become Blocked.
 * 3. In Review: Can move forward to Done (if dependencies resolved), or become Blocked.
 * 4. Blocked: Can only be unblocked back to the state it was blocked from (In Progress or In Review).
 * 5. Done: Can be reopened back to Backlog, In Progress, or In Review.
 * 6. Dependencies: A task cannot transition to Done if any of its blocking dependencies are unfinished (!== 'done').
 */

const ALLOWED_TRANSITIONS = {
  backlog: ['in_progress'],
  in_progress: ['in_review', 'blocked'],
  in_review: ['done', 'blocked'],
  done: ['backlog', 'in_progress', 'in_review'], // Reopening
};

/**
 * Validates a task state transition according to strict lifecycle rules.
 * 
 * @param {string} currentStatus - Current status of the task ('backlog', 'in_progress', 'in_review', 'done', 'blocked').
 * @param {string} targetStatus - Target status requested for transition.
 * @param {string|null} preBlockedStatus - The status before the task became blocked (if currentStatus === 'blocked').
 * @returns {{ isValid: boolean, message: string }}
 */
const validateTransition = (currentStatus, targetStatus, preBlockedStatus = null) => {
  // If target is the same as current, it's a no-op / valid
  if (currentStatus === targetStatus) {
    return { isValid: true, message: `Status is already '${targetStatus}'.` };
  }

  // 1. Handling transition FROM 'blocked' (Unblocking)
  if (currentStatus === 'blocked') {
    if (!preBlockedStatus || !['in_progress', 'in_review'].includes(preBlockedStatus)) {
      return {
        isValid: false,
        message: 'Invalid task state: Task was blocked without a valid prior status to return to.',
      };
    }

    if (targetStatus === preBlockedStatus) {
      return {
        isValid: true,
        message: `Task successfully unblocked and returned to '${preBlockedStatus}'.`,
      };
    }

    return {
      isValid: false,
      message: `Illegal transition: Blocked tasks must return to the state they were blocked from ('${preBlockedStatus}'), not '${targetStatus}'.`,
    };
  }

  // 2. Check transition against the allowed state machine map
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (allowed.includes(targetStatus)) {
    return {
      isValid: true,
      message: `Valid transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // 3. Detailed explanatory messages for illegal transition attempts
  if (currentStatus === 'backlog' && targetStatus === 'done') {
    return {
      isValid: false,
      message: 'Illegal transition: Tasks in Backlog cannot jump directly to Done. Follow the sequence: Backlog -> In Progress -> In Review -> Done.',
    };
  }

  if (currentStatus === 'backlog' && targetStatus === 'in_review') {
    return {
      isValid: false,
      message: 'Illegal transition: Tasks in Backlog cannot skip In Progress to reach In Review.',
    };
  }

  if (currentStatus === 'backlog' && targetStatus === 'blocked') {
    return {
      isValid: false,
      message: 'Illegal transition: Backlog tasks cannot be Blocked. Tasks must be In Progress or In Review to become Blocked.',
    };
  }

  if (currentStatus === 'in_progress' && targetStatus === 'done') {
    return {
      isValid: false,
      message: 'Illegal transition: Tasks In Progress cannot jump directly to Done without passing In Review.',
    };
  }

  if (currentStatus === 'in_progress' && targetStatus === 'backlog') {
    return {
      isValid: false,
      message: 'Illegal transition: Backward transitions from In Progress to Backlog are not permitted.',
    };
  }

  if (currentStatus === 'in_review' && targetStatus === 'in_progress') {
    return {
      isValid: false,
      message: 'Illegal transition: Backward transitions from In Review to In Progress are not permitted.',
    };
  }

  if (currentStatus === 'in_review' && targetStatus === 'backlog') {
    return {
      isValid: false,
      message: 'Illegal transition: Backward transitions from In Review to Backlog are not permitted.',
    };
  }

  if (currentStatus === 'done' && targetStatus === 'blocked') {
    return {
      isValid: false,
      message: 'Illegal transition: Completed tasks cannot be directly marked as Blocked. Reopen the task first.',
    };
  }

  return {
    isValid: false,
    message: `Illegal transition: Cannot transition task from '${currentStatus}' to '${targetStatus}'.`,
  };
};

/**
 * Checks if a task is blocked by any unfinished tasks in its dependency list.
 * 
 * @param {string} taskId - The ID of the task being checked.
 * @returns {Promise<{ isBlocked: boolean, unfinishedBlockers: Array<{ id: string, title: string, status: string }>, error?: string }>}
 */
const checkBlockerDependencies = async (taskId) => {
  try {
    const task = await Task.findById(taskId).populate('blockers');
    if (!task) {
      return { isBlocked: false, error: 'Task not found' };
    }

    if (!task.blockers || task.blockers.length === 0) {
      return { isBlocked: false, unfinishedBlockers: [] };
    }

    // Filter for any blocker whose status is not 'done'
    const unfinished = task.blockers.filter(blocker => blocker.status !== 'done');

    if (unfinished.length > 0) {
      return {
        isBlocked: true,
        unfinishedBlockers: unfinished.map(t => ({
          id: t._id.toString(),
          title: t.title,
          status: t.status,
        })),
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
  ALLOWED_TRANSITIONS,
};
