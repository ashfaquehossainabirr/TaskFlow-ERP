const mongoose = require('mongoose');

// One document per user per notification type. clearedIds is the set of
// source-record ids (Attendance docs, Task docs, ...) that were visible at
// the moment "Clear all" was pressed. clearedAt is the cutoff time: an item
// stays hidden only while its own updatedAt is at or before clearedAt, so an
// item that changes again after being cleared (e.g. a task's deadline is
// pushed out again, or a late mark is re-edited) naturally reappears.
const notificationClearSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['attendance', 'deadline'],
      required: true,
    },
    clearedAt: {
      type: Date,
      required: true,
    },
    clearedIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  {
    timestamps: true,
  }
);

notificationClearSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('NotificationClear', notificationClearSchema);
