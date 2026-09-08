const express = require('express');
const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'manager'));

// Lightweight cross-module snapshot for the Overview dashboard.
router.get('/business-snapshot', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [openLeadsCount, activeClientsCount, invoices, expenseAgg] = await Promise.all([
      Lead.countDocuments({ status: { $nin: ['won', 'lost'] } }),
      Client.countDocuments({ status: 'active' }),
      req.user.role === 'admin' ? Invoice.find() : Promise.resolve([]),
      req.user.role === 'admin'
        ? Expense.aggregate([
            { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
        : Promise.resolve([]),
    ]);

    let outstandingInvoices = 0;
    let revenueThisMonth = 0;
    invoices.forEach((inv) => {
      if (inv.status !== 'paid' && inv.status !== 'cancelled') outstandingInvoices += inv.total;
      if (inv.status === 'paid' && inv.paidDate) {
        const pd = new Date(inv.paidDate);
        if (pd.getFullYear() === now.getFullYear() && pd.getMonth() === now.getMonth()) {
          revenueThisMonth += inv.total;
        }
      }
    });

    res.json({
      openLeadsCount,
      activeClientsCount,
      outstandingInvoices,
      revenueThisMonth,
      expensesThisMonth: expenseAgg[0]?.total || 0,
      financeVisible: req.user.role === 'admin',
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch business snapshot', error: err.message });
  }
});

module.exports = router;
