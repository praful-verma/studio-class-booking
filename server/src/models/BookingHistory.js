const mongoose = require('mongoose');

const bookingHistorySchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required']
    },
    oldStatus: {
      type: String,
      enum: ['NONE', 'BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'],
      required: [true, 'Old status is required']
    },
    newStatus: {
      type: String,
      enum: ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'],
      required: [true, 'New status is required']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User triggering change is required']
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    staffNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: false
  }
);

// Compound index for audit trail lookups ordered chronologically
bookingHistorySchema.index({ booking: 1, timestamp: -1 });

// Application/Schema level constraint: Ensure append-only immutability
bookingHistorySchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('BookingHistory documents are immutable and cannot be updated.'));
  }
  next();
});

const preventUpdateOrDelete = function (next) {
  next(new Error('BookingHistory collection is append-only. Updates and deletions are strictly forbidden.'));
};

bookingHistorySchema.pre('updateOne', preventUpdateOrDelete);
bookingHistorySchema.pre('updateMany', preventUpdateOrDelete);
bookingHistorySchema.pre('findOneAndUpdate', preventUpdateOrDelete);
bookingHistorySchema.pre('deleteOne', preventUpdateOrDelete);
bookingHistorySchema.pre('deleteMany', preventUpdateOrDelete);
bookingHistorySchema.pre('findOneAndDelete', preventUpdateOrDelete);

module.exports = mongoose.model('BookingHistory', bookingHistorySchema);
