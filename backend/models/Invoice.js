const mongoose = require('mongoose');

const STATUS_VALUES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one line item is required',
      },
    },
    taxPercent: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'draft',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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

invoiceSchema.virtual('subtotal').get(function getSubtotal() {
  return (this.items || []).reduce((sum, item) => sum + item.quantity * item.rate, 0);
});

invoiceSchema.virtual('taxAmount').get(function getTaxAmount() {
  return (this.subtotal * (this.taxPercent || 0)) / 100;
});

invoiceSchema.virtual('total').get(function getTotal() {
  return Math.max(0, this.subtotal + this.taxAmount - (this.discount || 0));
});

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

invoiceSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('Invoice', invoiceSchema);
