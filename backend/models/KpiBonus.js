const mongoose = require('mongoose');

const STATUS_VALUES = ['pending', 'approved', 'paid'];

// Each quarter's KPI numbers (target/achieved/bonus) are computed live from
// Task + User data — this model only needs to exist once a quarter's bonus
// is approved or paid, at which point the numbers are snapshotted here so a
// later edit to a task's value can't silently change a bonus that's already
// been signed off.
const kpiBonusSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    quarter: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'pending',
    },
    // Snapshot values — only populated once status is 'approved' or 'paid'.
    targetValue: {
      type: Number,
      default: null,
    },
    achievedValue: {
      type: Number,
      default: null,
    },
    bonusAmount: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidOn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

kpiBonusSchema.index({ employee: 1, year: 1, quarter: 1 }, { unique: true });
kpiBonusSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('KpiBonus', kpiBonusSchema);
