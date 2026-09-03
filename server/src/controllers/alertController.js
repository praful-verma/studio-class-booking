const alertService = require('../services/alertService');

/**
 * @route   GET /api/membership-alerts
 * @desc    Get active membership expiry alerts (expired or expiring within 7 days)
 * @access  Private (STAFF only)
 */
const getAlerts = async (req, res, next) => {
  try {
    const data = await alertService.getMembershipAlerts();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/membership-alerts/count
 * @desc    Get count of active membership expiry alerts for badge
 * @access  Private (STAFF only)
 */
const getAlertCount = async (req, res, next) => {
  try {
    const data = await alertService.getMembershipAlertCount();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/membership-alerts/:memberId/dismiss
 * @desc    Dismiss a membership expiry alert without altering member's expiry date
 * @access  Private (STAFF only)
 */
const dismissAlert = async (req, res, next) => {
  try {
    const data = await alertService.dismissMembershipAlert(req.params.memberId);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertCount,
  dismissAlert
};
