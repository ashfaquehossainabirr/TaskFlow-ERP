const express = require('express');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await Invoice.findOne({ invoiceNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
  let next = 1;
  if (last) {
    const lastNum = parseInt(last.invoiceNumber.replace(prefix, ''), 10);
    if (!Number.isNaN(lastNum)) next = lastNum + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.client) filter.client = req.query.client;
    const invoices = await Invoice.find(filter)
      .populate('client', 'name company email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    const now = new Date();
    let outstanding = 0;
    let paidThisMonth = 0;
    let overdueCount = 0;
    invoices.forEach((inv) => {
      const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < now;
      if (isOverdue) overdueCount += 1;
      if (inv.status !== 'paid' && inv.status !== 'cancelled') outstanding += inv.total;
      if (inv.status === 'paid' && inv.paidDate) {
        const pd = new Date(inv.paidDate);
        if (pd.getFullYear() === now.getFullYear() && pd.getMonth() === now.getMonth()) {
          paidThisMonth += inv.total;
        }
      }
    });
    res.json({
      totalInvoices: invoices.length,
      outstanding,
      paidThisMonth,
      overdueCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch invoice stats', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name company email phone address').populate('project', 'name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch invoice', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client, project, items, taxPercent, discount, status, issueDate, dueDate, notes } = req.body;
    if (!client) return res.status(400).json({ message: 'Client is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }
    if (!dueDate) return res.status(400).json({ message: 'Due date is required' });
    const clientExists = await Client.findById(client);
    if (!clientExists) return res.status(404).json({ message: 'Client not found' });
    const invoiceNumber = await generateInvoiceNumber();
    const invoice = await Invoice.create({
      invoiceNumber,
      client,
      project: project || null,
      items,
      taxPercent: taxPercent || 0,
      discount: discount || 0,
      status: Invoice.STATUS_VALUES.includes(status) ? status : 'draft',
      issueDate: issueDate || Date.now(),
      dueDate,
      notes: notes || '',
      createdBy: req.user._id,
    });
    const populated = await invoice.populate([
      { path: 'client', select: 'name company email' },
      { path: 'project', select: 'name' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { client, project, items, taxPercent, discount, status, issueDate, dueDate, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (client !== undefined) invoice.client = client;
    if (project !== undefined) invoice.project = project || null;
    if (items !== undefined) invoice.items = items;
    if (taxPercent !== undefined) invoice.taxPercent = taxPercent || 0;
    if (discount !== undefined) invoice.discount = discount || 0;
    if (issueDate !== undefined) invoice.issueDate = issueDate;
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (status !== undefined && Invoice.STATUS_VALUES.includes(status)) {
      invoice.status = status;
      if (status === 'paid' && !invoice.paidDate) invoice.paidDate = new Date();
      if (status !== 'paid') invoice.paidDate = null;
    }
    await invoice.save();
    const populated = await invoice.populate([
      { path: 'client', select: 'name company email' },
      { path: 'project', select: 'name' },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update invoice', error: err.message });
  }
});

router.patch('/:id/mark-paid', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    invoice.status = 'paid';
    invoice.paidDate = new Date();
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark invoice as paid', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete invoice', error: err.message });
  }
});

module.exports = router;
