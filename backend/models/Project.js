const mongoose = require('mongoose');
const STATUS_VALUES = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
const MILESTONE_STATUS_VALUES = ['pending', 'in-progress', 'completed'];
const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    dueDate: {
      type: Date,
      required: [true, 'Milestone due date is required'],
    },
    status: {
      type: String,
      enum: MILESTONE_STATUS_VALUES,
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    client: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'planning',
    },
    startDate: {
      type: Date,
    },
    targetEndDate: {
      type: Date,
    },
    milestones: [milestoneSchema],
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
projectSchema.statics.STATUS_VALUES = STATUS_VALUES;
projectSchema.statics.MILESTONE_STATUS_VALUES = MILESTONE_STATUS_VALUES;
module.exports = mongoose.model('Project', projectSchema);
