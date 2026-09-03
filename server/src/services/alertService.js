const mongoose = require('mongoose');
const Member = require('../models/Member');

/**
 * Calculates active membership expiry alerts for STAFF.
 */
const getMembershipAlerts = async () => {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const sevenDaysFromToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 23, 59, 59, 999));

  // Fetch members expiring on or before sevenDaysFromToday
  const members = await Member.find({
    membershipExpiry: { $lte: sevenDaysFromToday }
  }).sort({ membershipExpiry: 1 });

  // Filter out members whose alert was dismissed for their CURRENT membershipExpiry date
  const activeAlerts = members.filter(m => {
    if (!m.dismissedExpiryDate) return true;
    return new Date(m.dismissedExpiryDate).getTime() !== new Date(m.membershipExpiry).getTime();
  }).map(m => {
    const isExpired = new Date(m.membershipExpiry) < startOfToday;
    const diffMs = new Date(m.membershipExpiry).getTime() - startOfToday.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      memberId: m._id,
      name: m.name,
      email: m.email,
      membershipExpiry: m.membershipExpiry,
      status: isExpired ? 'EXPIRED' : 'EXPIRING_SOON',
      daysRemaining
    };
  });

  return {
    total: activeAlerts.length,
    alerts: activeAlerts
  };
};

/**
 * Returns total count of active membership expiry alerts for navigation badge.
 */
const getMembershipAlertCount = async () => {
  const result = await getMembershipAlerts();
  return { total: result.total };
};

/**
 * Dismisses an alert for a member's current membershipExpiry date.
 * Does NOT alter member's actual membershipExpiry date.
 */
const dismissMembershipAlert = async (memberId) => {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    const error = new Error('Invalid member ID format.');
    error.statusCode = 400;
    throw error;
  }

  const member = await Member.findById(memberId);
  if (!member) {
    const error = new Error('Member not found.');
    error.statusCode = 404;
    throw error;
  }

  // Set dismissedExpiryDate to current membershipExpiry without changing membershipExpiry
  member.dismissedExpiryDate = member.membershipExpiry;
  await member.save();

  return {
    message: 'Membership expiry alert dismissed successfully.',
    member: {
      _id: member._id,
      name: member.name,
      email: member.email,
      membershipExpiry: member.membershipExpiry,
      dismissedExpiryDate: member.dismissedExpiryDate
    }
  };
};

module.exports = {
  getMembershipAlerts,
  getMembershipAlertCount,
  dismissMembershipAlert
};
