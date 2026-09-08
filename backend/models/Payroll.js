const mongoose = require('mongoose');

const STATUS_VALUES = ['pending', 'paid'];

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      // Stored as 'YYYY-MM'
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    allowances: {
      type: Number,
      min: 0,
      default: 0,
    },
    bonus: {
      type: Number,
      min: 0,
      default: 0,
    },
    deductions: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'pending',
    },
    paidOn: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

payrollSchema.virtual('netPay').get(function getNetPay() {
  return Math.max(0, (this.baseSalary || 0) + (this.allowances || 0) + (this.bonus || 0) - (this.deductions || 0));
});

payrollSchema.set('toJSON', { virtuals: true });
payrollSchema.set('toObject', { virtuals: true });

payrollSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('Payroll', payrollSchema);
