const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Please add a short project key'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Key must be at least 2 characters'],
      maxlength: [10, 'Key cannot exceed 10 characters'],
    },
    name: {
      type: String,
      required: [true, 'Please add a project name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', ProjectSchema);
