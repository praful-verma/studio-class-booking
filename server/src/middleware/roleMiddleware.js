/**
 * Reusable Role Authorization Middleware Factory
 * @param  {...string} allowedRoles Allowed user roles (e.g. 'STAFF', 'INSTRUCTOR')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required before checking authorization.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
