const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    membershipExpiry: {
      type: Date,
      required: [true, 'Membership expiry date is required']
    },
    dismissedExpiryDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
memberSchema.index({ membershipExpiry: 1 });

module.exports = mongoose.model('Member', memberSchema);
