const mongoose = require('mongoose');
const NOTICE_PRIORITY = ['normal', 'important', 'urgent'];
const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notice message is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: NOTICE_PRIORITY,
      default: 'normal',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
noticeSchema.index({
  pinned: -1,
  createdAt: -1,
});
noticeSchema.statics.PRIORITY_VALUES = NOTICE_PRIORITY;
module.exports = mongoose.model('Notice', noticeSchema);
