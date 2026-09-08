const mongoose = require('mongoose');

const STATUS_VALUES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const SOURCE_VALUES = ['website', 'referral', 'upwork', 'fiverr', 'linkedin', 'cold-outreach', 'other'];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: SOURCE_VALUES,
      default: 'other',
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'new',
    },
    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    convertedToClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
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

leadSchema.statics.STATUS_VALUES = STATUS_VALUES;
leadSchema.statics.SOURCE_VALUES = SOURCE_VALUES;

module.exports = mongoose.model('Lead', leadSchema);
