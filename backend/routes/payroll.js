const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

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
    const toCreate = employees
      .filter((emp) => !existingIds.has(String(emp._id)))
      .map((emp) => ({
        employee: emp._id,
        month,
        baseSalary: emp.monthlySalary,
        allowances: 0,
        bonus: 0,
        deductions: 0,
        status: 'pending',
        generatedBy: req.user._id,
      }));
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
