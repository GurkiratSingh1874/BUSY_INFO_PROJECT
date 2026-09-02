const mongoose = require('mongoose');

const TaskTimelineSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['create', 'field_change', 'assign', 'unassign', 'comment'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fieldName: {
    type: String,
    default: null,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  commentText: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true, // Enforce database-level immutability
  },
});

// Prevent saving modifications to existing timeline documents
TaskTimelineSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Timeline events are immutable and cannot be updated after creation.'));
  }
  next();
});

// Prevent Mongoose from ever performing updates on the timeline model
TaskTimelineSchema.pre('updateOne', function (next) {
  next(new Error('Timeline events are immutable and cannot be updated.'));
});
TaskTimelineSchema.pre('updateMany', function (next) {
  next(new Error('Timeline events are immutable and cannot be updated.'));
});
TaskTimelineSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Timeline events are immutable and cannot be updated.'));
});
TaskTimelineSchema.pre('replaceOne', function (next) {
  next(new Error('Timeline events are immutable and cannot be updated.'));
});

// Prevent Mongoose from ever performing deletions on the timeline model
TaskTimelineSchema.pre('deleteOne', function (next) {
  next(new Error('Timeline events are immutable and cannot be deleted.'));
});
TaskTimelineSchema.pre('deleteMany', function (next) {
  if (this.getOptions() && this.getOptions().bypassImmutability) {
    return next();
  }
  next(new Error('Timeline events are immutable and cannot be deleted.'));
});
TaskTimelineSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Timeline events are immutable and cannot be deleted.'));
});
TaskTimelineSchema.pre('remove', function (next) {
  next(new Error('Timeline events are immutable and cannot be deleted.'));
});

module.exports = mongoose.model('TaskTimeline', TaskTimelineSchema);
