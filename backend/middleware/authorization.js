const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions for this operation' });
    }
    next();
  };
};

const ownerOrAdminMiddleware = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resource = await resourceModel.findById(req.params.id);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check if user owns the resource or has admin privileges
      const isOwner = resource.createdBy && resource.createdBy.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: you do not own this resource' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = {
  roleMiddleware,
  ownerOrAdminMiddleware
};
