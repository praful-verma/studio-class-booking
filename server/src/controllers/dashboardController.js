const dashboardService = require('../services/dashboardService');

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard metrics (sessions, bookings, waitlists, trends)
 * @access  Private (STAFF only)
 */
const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardMetrics();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};
