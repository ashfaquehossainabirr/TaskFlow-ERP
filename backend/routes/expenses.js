const express = require('express');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    const expenses = await Expense.find(filter).populate('addedBy', 'name').sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expenses', error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [thisMonth, byCategory] = await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([{ $group: { _id: '$category', total: { $sum: '$amount' } } }]),
    ]);
    res.json({
      thisMonthTotal: thisMonth[0]?.total || 0,
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expense stats', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, category, amount, date, vendor, paymentMethod, notes } = req.body;
    if (!title || amount === undefined) {
      return res.status(400).json({ message: 'Title and amount are required' });
    }
    const expense = await Expense.create({
      title,
      category: Expense.CATEGORY_VALUES.includes(category) ? category : 'other',
      amount,
      date: date || Date.now(),
      vendor: vendor || '',
      paymentMethod: Expense.PAYMENT_METHOD_VALUES.includes(paymentMethod) ? paymentMethod : 'bank-transfer',
      notes: notes || '',
      addedBy: req.user._id,
    });
    res.status(201).json(await expense.populate('addedBy', 'name'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to create expense', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, category, amount, date, vendor, paymentMethod, notes } = req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (title !== undefined) expense.title = title;
    if (category !== undefined && Expense.CATEGORY_VALUES.includes(category)) expense.category = category;
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = date;
    if (vendor !== undefined) expense.vendor = vendor;
    if (paymentMethod !== undefined && Expense.PAYMENT_METHOD_VALUES.includes(paymentMethod))
      expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = notes;
    await expense.save();
    res.json(await expense.populate('addedBy', 'name'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update expense', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete expense', error: err.message });
  }
});

module.exports = router;
