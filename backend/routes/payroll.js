const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Every this-many "late" days in a month costs the employee this fraction
// of their base salary (e.g. 4 late days => 1% deducted).
const LATE_DAYS_PER_PENALTY = 4;
const LATE_PENALTY_RATE = 0.01;

// How many whole penalty units a given number of late days earns, e.g.
// 4-7 late days => 1 unit, 8-11 => 2 units, etc.
function lateDeductionUnits(lateCount) {
  return Math.floor(lateCount / LATE_DAYS_PER_PENALTY);
}

router.use(protect);

// Employees can see their own payslips; admin manages everything.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.user.role !== 'admin') {
      filter.employee = req.user._id;
    } else if (req.query.employee) {
      filter.employee = req.query.employee;
    }
    const records = await Payroll.find(filter).populate('employee', 'name email department designation').sort({ month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payroll records', error: err.message });
  }
});

router.use(authorize('admin'));

// Generate (or refresh) draft payroll for every active employee with a
// monthly salary set, for the given month. Skips employees who already
// have a record for that month.
router.post('/generate', async (req, res) => {
  try {
    const { month } = req.body; // 'YYYY-MM'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'A valid month (YYYY-MM) is required' });
    }
    const employees = await User.find({
      isActive: true,
      monthlySalary: { $ne: null, $gt: 0 },
    });
    const existing = await Payroll.find({ month }).select('employee');
    const existingIds = new Set(existing.map((e) => String(e.employee)));
    const employeesToPay = employees.filter((emp) => !existingIds.has(String(emp._id)));

    // Count "late" attendance days this month per employee, so we can apply
    // the late-arrival salary deduction (every 4 late days = 1% of base pay).
    const [y, m] = month.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 1);
    const lateCounts = await Attendance.aggregate([
      {
        $match: {
          employee: { $in: employeesToPay.map((emp) => emp._id) },
          status: 'late',
          date: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: '$employee', count: { $sum: 1 } } },
    ]);
    const lateCountByEmployee = new Map(lateCounts.map((row) => [String(row._id), row.count]));

    const toCreate = employeesToPay.map((emp) => {
      const lateCount = lateCountByEmployee.get(String(emp._id)) || 0;
      const units = lateDeductionUnits(lateCount);
      const deductions = Math.round(emp.monthlySalary * LATE_PENALTY_RATE * units * 100) / 100;
      const notes = units > 0
        ? `Late deduction: ${lateCount} late day(s) this month (-${units * LATE_PENALTY_RATE * 100}% salary).`
        : '';
      return {
        employee: emp._id,
        month,
        baseSalary: emp.monthlySalary,
        allowances: 0,
        bonus: 0,
        deductions,
        status: 'pending',
        notes,
        generatedBy: req.user._id,
      };
    });
    const created = toCreate.length ? await Payroll.insertMany(toCreate) : [];
    res.status(201).json({
      created: created.length,
      skipped: employees.length - created.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate payroll', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { baseSalary, allowances, bonus, deductions, status, notes } = req.body;
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    if (baseSalary !== undefined) record.baseSalary = baseSalary;
    if (allowances !== undefined) record.allowances = allowances;
    if (bonus !== undefined) record.bonus = bonus;
    if (deductions !== undefined) record.deductions = deductions;
    if (notes !== undefined) record.notes = notes;
    if (status !== undefined && Payroll.STATUS_VALUES.includes(status)) {
      record.status = status;
      record.paidOn = status === 'paid' ? new Date() : null;
    }
    await record.save();
    res.json(await record.populate('employee', 'name email department designation'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payroll record', error: err.message });
  }
});

router.patch('/:id/mark-paid', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    record.status = 'paid';
    record.paidOn = new Date();
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark payroll as paid', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await Payroll.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete payroll record', error: err.message });
  }
});

module.exports = router;
