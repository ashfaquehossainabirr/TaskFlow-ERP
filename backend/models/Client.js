const mongoose = require('mongoose');

const STATUS_VALUES = ['active', 'inactive'];

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
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
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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

clientSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('Client', clientSchema);
