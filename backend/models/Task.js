const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a task title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    priorityWeight: {
      type: Number,
      enum: [1, 2, 3],
      default: 2,
      index: true,
    },
    status: {
      type: String,
      enum: ['backlog', 'in_progress', 'in_review', 'done', 'blocked'],
      default: 'backlog',
    },
    preBlockedStatus: {
      type: String,
      enum: ['in_progress', 'in_review', null],
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    blockers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate numeric priority weight for correct non-alphabetical sorting
TaskSchema.pre('save', function (next) {
  const weights = { high: 3, medium: 2, low: 1 };
  this.priorityWeight = weights[this.priority] || 2;
  next();
});

// Indexes to speed up server-side sorting, search, and filtering
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ priorityWeight: -1 });
TaskSchema.index({ title: 'text', description: 'text' }); // Text search index

module.exports = mongoose.model('Task', TaskSchema);
