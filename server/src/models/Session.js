const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Associated class is required']
    },
    date: {
      type: Date,
      required: [true, 'Session date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time string is required'] // e.g. "09:00"
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    startDateTime: {
      type: Date,
      required: [true, 'Start date time is required']
    },
    endDateTime: {
      type: Date,
      required: [true, 'End date time is required']
    },
    capacity: {
      type: Number,
      required: [true, 'Session capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    primaryInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Primary instructor is required']
    },
    coInstructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room assignment is required']
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
sessionSchema.index({ classId: 1 });
sessionSchema.index({ date: 1 });
sessionSchema.index({ startDateTime: 1, endDateTime: 1 });

// Room Overlap Index: checks if room is occupied during [startDateTime, endDateTime]
sessionSchema.index({ room: 1, startDateTime: 1, endDateTime: 1 });

// Instructor Overlap Indexes: checks if primary instructor or co-instructors are booked during [startDateTime, endDateTime]
sessionSchema.index({ primaryInstructor: 1, startDateTime: 1, endDateTime: 1 });
sessionSchema.index({ coInstructors: 1, startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model('Session', sessionSchema);
