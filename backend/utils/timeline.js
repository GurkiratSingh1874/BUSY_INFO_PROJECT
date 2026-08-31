const TaskTimeline = require('../models/TaskTimeline');

/**
 * Creates an immutable audit log entry in the TaskTimeline collection.
 * 
 * @param {object} params
 * @param {string} params.taskId - Target Task ID
 * @param {string} params.userId - Actor User ID
 * @param {string} params.type - 'create' | 'field_change' | 'assign' | 'unassign' | 'comment'
 * @param {string} [params.fieldName] - Field changed (e.g. 'status', 'priority')
 * @param {any} [params.oldValue] - Value before update
 * @param {any} [params.newValue] - Value after update
 * @param {string} [params.commentText] - Text content for comments
 * @returns {Promise<object>} Timeline document
 */
const logTimelineEvent = async ({
  taskId,
  userId,
  type,
  fieldName = null,
  oldValue = null,
  newValue = null,
  commentText = null,
}) => {
  try {
    const event = await TaskTimeline.create({
      taskId,
      userId,
      type,
      fieldName,
      oldValue,
      newValue,
      commentText,
    });
    return event;
  } catch (error) {
    console.error('Error logging timeline event:', error.message);
    // Don't fail request if logging fails, but log it
    return null;
  }
};

module.exports = {
  logTimelineEvent,
};
