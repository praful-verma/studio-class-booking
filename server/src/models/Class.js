const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    discipline: {
      type: String,
      required: [true, 'Discipline is required'],
      trim: true
    },
    defaultDuration: {
      type: Number,
      required: [true, 'Default duration (in minutes) is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    defaultCapacity: {
      type: Number,
      required: [true, 'Default capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
classSchema.index({ title: 'text', discipline: 'text' });
classSchema.index({ isArchived: 1 });

module.exports = mongoose.model('Class', classSchema);
