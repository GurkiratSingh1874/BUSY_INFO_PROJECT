const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const TaskTimeline = require('../models/TaskTimeline');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Members can only see projects they belong to
    if (req.user.role !== 'manager') {
      query.members = req.user._id;
    }

    // By default, exclude archived projects unless includeArchived=true
    if (req.query.includeArchived !== 'true') {
      query.isArchived = false;
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: true, error: 'Error fetching projects: ' + error.message });
  }
});

// @desc    Get single project details
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Members can only see projects they belong to
    if (req.user.role !== 'manager' && !project.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this project' });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error fetching project details: ' + error.message });
  }
});

// @desc    Create a project
// @route   POST /api/projects
// @access  Private/Manager
router.post('/', protect, authorize('manager'), async (req, res) => {
  const { key, name, description, ownerId, members } = req.body;

  if (!key || !name || !ownerId) {
    return res.status(400).json({ success: false, error: 'Please provide a project key, name, and owner' });
  }

  try {
    // Verify owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'Project owner user not found' });
    }

    // Build members list (must include owner)
    let projectMembers = members || [];
    if (!projectMembers.includes(ownerId)) {
      projectMembers.push(ownerId);
    }

    const project = await Project.create({
      key,
      name,
      description,
      owner: ownerId,
      members: projectMembers,
    });

    const populatedProject = await project.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members', select: 'name email role' }
    ]);

    res.status(201).json({ success: true, data: populatedProject });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Project key already exists' });
    }
    res.status(500).json({ success: false, error: 'Error creating project: ' + error.message });
  }
});

// @desc    Edit project details
// @route   PUT /api/projects/:id
// @access  Private/Manager
router.put('/:id', protect, authorize('manager'), async (req, res) => {
  const { name, description, ownerId } = req.body;

  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (ownerId) {
      const owner = await User.findById(ownerId);
      if (!owner) {
        return res.status(404).json({ success: false, error: 'Specified owner user not found' });
      }
      project.owner = ownerId;
      // Auto add owner to members if not present
      if (!project.members.includes(ownerId)) {
        project.members.push(ownerId);
      }
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();

    const populated = await project.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members', select: 'name email role' }
    ]);

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error editing project: ' + error.message });
  }
});

// @desc    Toggle project archive status
// @route   PUT /api/projects/:id/archive
// @access  Private/Manager
router.put('/:id/archive', protect, authorize('manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project.isArchived = !project.isArchived;
    await project.save();

    res.status(200).json({
      success: true,
      message: `Project successfully ${project.isArchived ? 'archived' : 'restored'}`,
      data: project,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error toggling project archive status: ' + error.message });
  }
});

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private/Manager
router.post('/:id/members', protect, authorize('manager'), async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User to add not found' });
    }

    // Check if user is already a member
    if (project.members.includes(userId)) {
      return res.status(400).json({ success: false, error: 'User is already a member of this project' });
    }

    project.members.push(userId);
    await project.save();

    const populated = await project.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members', select: 'name email role' }
    ]);

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error adding project member: ' + error.message });
  }
});

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private/Manager
router.delete('/:id/members/:userId', protect, authorize('manager'), async (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Cannot remove the project owner
    if (project.owner.toString() === userId) {
      return res.status(400).json({ success: false, error: 'Cannot remove the project owner from the project' });
    }

    // Check if user is in members list
    if (!project.members.includes(userId)) {
      return res.status(400).json({ success: false, error: 'User is not a member of this project' });
    }

    // Remove member from project members array
    project.members = project.members.filter(member => member.toString() !== userId);
    await project.save();

    // CRITICAL REQUIREMENT: Automatically unassign user from all tasks under this project
    await Task.updateMany(
      { projectId: projectId },
      { $pull: { assignees: userId } }
    );

    // Get updated populated project
    const populated = await project.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members', select: 'name email role' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Member removed and successfully unassigned from all project tasks.',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error removing project member: ' + error.message });
  }
});

// @desc    Delete a project and all associated tasks and timelines
// @route   DELETE /api/projects/:id
// @access  Private/Manager
router.delete('/:id', protect, authorize('manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Find all tasks associated with this project
    const tasks = await Task.find({ projectId: project._id });
    const taskIds = tasks.map(t => t._id);

    // Clean up all timeline entries for these tasks
    await TaskTimeline.deleteMany({ taskId: { $in: taskIds } });
    
    // Delete all tasks in the project
    await Task.deleteMany({ projectId: project._id });
    
    // Delete the project itself
    await Project.deleteOne({ _id: project._id });

    res.status(200).json({
      success: true,
      message: 'Project and all associated tasks and timelines deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting project: ' + error.message });
  }
});

module.exports = router;
