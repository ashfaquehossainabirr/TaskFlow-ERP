const mongoose = require('mongoose');

const CATEGORY_VALUES = [
  'software-subscriptions',
  'salaries',
  'office-rent',
  'utilities',
  'marketing',
  'contractor-payments',
  'equipment',
  'travel',
  'other',
];

const PAYMENT_METHOD_VALUES = ['bank-transfer', 'card', 'cash', 'paypal', 'other'];

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORY_VALUES,
      default: 'other',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vendor: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD_VALUES,
      default: 'bank-transfer',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.statics.CATEGORY_VALUES = CATEGORY_VALUES;
expenseSchema.statics.PAYMENT_METHOD_VALUES = PAYMENT_METHOD_VALUES;

module.exports = mongoose.model('Expense', expenseSchema);
