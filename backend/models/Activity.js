const mongoose = require('mongoose');
const ACTIVITY_TYPES = ['created', 'status_changed', 'updated', 'comment'];
const activitySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);
activitySchema.index({
  task: 1,
  createdAt: 1,
});
activitySchema.statics.TYPES = ACTIVITY_TYPES;
module.exports = mongoose.model('Activity', activitySchema);
