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
    // Snapshot of how attendance-based deductions were computed at
    // generation time, for transparency on the payslip. `deductions`
    // above remains the single editable total used in netPay.
    attendance: {
      presentDays: { type: Number, default: 0 },
      lateDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      leaveDays: { type: Number, default: 0 },
      holidayDays: { type: Number, default: 0 },
      // Calendar days in the month with no attendance record at all (admin
      // never set them — shown as "N/A" on the employee's calendar). These
      // are unpaid, same as an absence, so the employee is only paid for
      // days that actually have attendance recorded.
      unsetDays: { type: Number, default: 0 },
      totalDaysInMonth: { type: Number, default: 0 },
      dailyRate: { type: Number, default: 0 },
      lateDeduction: { type: Number, default: 0 },
      halfDayDeduction: { type: Number, default: 0 },
      absentDeduction: { type: Number, default: 0 },
      unsetDeduction: { type: Number, default: 0 },
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
