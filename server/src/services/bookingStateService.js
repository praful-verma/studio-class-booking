/**
 * Centralized Booking Status Transition State Machine
 * Validates allowed lifecycle status transitions for Class Bookings.
 */

const ALLOWED_TRANSITIONS = {
  NONE: ['BOOKED', 'WAITLISTED'],
  BOOKED: ['CANCELLED', 'ATTENDED', 'NO_SHOW'],
  WAITLISTED: ['CANCELLED', 'BOOKED'], // WAITLISTED -> BOOKED allowed via waitlist auto-promotion
  CANCELLED: [],                       // Terminal state
  ATTENDED: [],                        // Terminal state
  NO_SHOW: []                          // Terminal state
};

/**
 * Checks if a transition from oldStatus to newStatus is valid.
 * @param {string} oldStatus Current status (or 'NONE' for new bookings)
 * @param {string} newStatus Target status
 * @returns {boolean}
 */
const isValidTransition = (oldStatus, newStatus) => {
  const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
  return allowed.includes(newStatus);
};

/**
 * Asserts that a status transition is valid, throwing a 400 Bad Request error if invalid.
 * @param {string} oldStatus Current status
 * @param {string} newStatus Target status
 */
const validateTransition = (oldStatus, newStatus) => {
  if (!isValidTransition(oldStatus, newStatus)) {
    const error = new Error(`Invalid status transition from '${oldStatus}' to '${newStatus}'.`);
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  ALLOWED_TRANSITIONS,
  isValidTransition,
  validateTransition
};
