const mongoose = require('mongoose');

const STATUS_VALUES = ['present', 'absent', 'half-day', 'leave', 'holiday'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'present',
    },
    checkIn: {
      type: String,
      trim: true,
      default: '',
    },
    checkOut: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per employee per day.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

attendanceSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('Attendance', attendanceSchema);
