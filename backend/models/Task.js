const mongoose = require('mongoose');
const STATUS_VALUES = ['todo', 'in-progress', 'delivered', 'cancelled', 'hold'];
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project'],
    },
    projectValue: {
      type: Number,
      min: 0,
      default: null,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must be assigned to an employee'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: STATUS_VALUES,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
taskSchema.index({
  assignedTo: 1,
  status: 1,
});
taskSchema.index({
  deadline: 1,
});
taskSchema.index({
  project: 1,
});
taskSchema.statics.STATUS_VALUES = STATUS_VALUES;
module.exports = mongoose.model('Task', taskSchema);
