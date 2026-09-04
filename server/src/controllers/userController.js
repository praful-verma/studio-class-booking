const userService = require('../services/userService');

/**
 * @route   GET /api/users
 * @desc    Get active users list (optional role filter)
 * @access  Private (Authenticated users)
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers(req.query);
    res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers
};
