const User = require('../models/User');

/**
 * Service to fetch active users filtered by role.
 */
const getUsers = async (queryParams = {}) => {
  const filter = { isActive: true };

  if (queryParams.role) {
    filter.role = queryParams.role;
  }

  const users = await User.find(filter)
    .select('_id name email role')
    .sort({ name: 1 });

  return users;
};

module.exports = {
  getUsers
};
