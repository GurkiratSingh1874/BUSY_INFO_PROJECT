const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

// Protect routes - Verify JWT in HTTP-Only Cookies
const protect = async (req, res, next) => {
  let token;

  // Retrieve token from cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route. Please login.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'local_development_only_secret_key_12345');

    // Attach user to the request (excluding the password)
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this token no longer exists.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please login again.',
    });
  }
};

// Authorize roles (e.g. authorize('manager'))
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user ? req.user.role : 'none'}' is not authorized to perform this action.`,
      });
    }
    next();
  };
};

// Reusable project member access check
const verifyProjectAccess = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project ID is required' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Managers bypass project membership checks. Members must be in the project's member list.
    if (req.user.role !== 'manager' && !project.members.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this project.',
      });
    }

    // Attach project instance to request object to save DB call in router
    req.project = project;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error checking project permissions' });
  }
};

module.exports = {
  protect,
  authorize,
  verifyProjectAccess,
};
