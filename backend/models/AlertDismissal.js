const mongoose = require('mongoose');

const AlertDismissalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    associatedDueDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can only dismiss a specific task alert once
AlertDismissalSchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('AlertDismissal', AlertDismissalSchema);
