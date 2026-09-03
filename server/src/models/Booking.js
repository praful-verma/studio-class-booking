const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required']
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session reference is required']
    },
    status: {
      type: String,
      enum: {
        values: ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'],
        message: 'Invalid booking status'
      },
      required: [true, 'Booking status is required'],
      default: 'BOOKED'
    }
  },
  {
    timestamps: true
  }
);

// Database-level constraint: Duplicate booking prevention for the same session per member
bookingSchema.index({ member: 1, session: 1 }, { unique: true });

// Indexes for fast server-side filtering, roster generation, sorting, and pagination
bookingSchema.index({ session: 1, status: 1 });
bookingSchema.index({ session: 1, createdAt: -1 });
bookingSchema.index({ member: 1, status: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
