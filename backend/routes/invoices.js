const express = require('express');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const { newDocument, streamPdf, drawBrandHeader, labelValue, drawTableHeader, drawTableRow, money } = require('../utils/pdf');
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

router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name company email phone address')
      .populate('project', 'name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const doc = newDocument();
    streamPdf(res, doc, `${invoice.invoiceNumber}.pdf`);

    drawBrandHeader(doc, 'INVOICE', invoice.invoiceNumber);

    const infoY = 130;
    labelValue(doc, 50, infoY, 'Bill To', invoice.client?.company || invoice.client?.name || 'Client', { bold: true });
    if (invoice.client?.name && invoice.client?.company) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(9.5).text(invoice.client.name, 50, infoY + 26);
    }
    if (invoice.client?.email) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(9.5).text(invoice.client.email, 50, doc.y + 2);
    }
    if (invoice.client?.address) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(9.5).text(invoice.client.address, 50, doc.y + 2, { width: 240 });
    }

    labelValue(doc, 330, infoY, 'Status', invoice.status.toUpperCase(), { width: 100 });
    labelValue(doc, 430, infoY, 'Issue Date', new Date(invoice.issueDate).toLocaleDateString(), { width: 115 });
    labelValue(doc, 330, infoY + 46, 'Due Date', new Date(invoice.dueDate).toLocaleDateString(), { width: 100 });
    if (invoice.project?.name) {
      labelValue(doc, 430, infoY + 46, 'Project', invoice.project.name, { width: 115 });
    }

    const tableX = 50;
    const columns = [
      { key: 'description', label: 'Description', x: 0, width: 230 },
      { key: 'quantity', label: 'Qty', x: 230, width: 60, align: 'right' },
      { key: 'rate', label: 'Rate', x: 290, width: 90, align: 'right' },
      { key: 'amount', label: 'Amount', x: 380, width: 115, align: 'right' },
    ];
    let y = infoY + 100;
    drawTableHeader(doc, tableX, y, columns);
    y += 24;

    invoice.items.forEach((item, idx) => {
      if (y > 700) {
        doc.addPage();
        y = 60;
        drawTableHeader(doc, tableX, y, columns);
        y += 24;
      }
      if (idx % 2 === 1) {
        doc.rect(tableX, y - 6, 495, 20).fill('#f7f8fa');
      }
      drawTableRow(doc, tableX, y, columns, [
        item.description,
        item.quantity,
        money(item.rate),
        money(item.quantity * item.rate),
      ]);
      y += 22;
    });

    y += 10;
    doc.moveTo(tableX, y).lineTo(545, y).strokeColor('#e2e5ea').lineWidth(1).stroke();
    y += 14;

    const totalsX = 350;
    const totalsWidth = 145;
    const totalRow = (label, value, opts = {}) => {
      doc.fillColor(opts.bold ? '#1a2028' : '#6b7280').font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 12 : 10);
      doc.text(label, totalsX, y, { width: 90 });
      doc.text(value, totalsX + 90, y, { width: 55, align: 'right' });
      y += opts.bold ? 22 : 18;
    };
    totalRow('Subtotal', money(invoice.subtotal));
    if (invoice.taxPercent > 0) totalRow(`Tax (${invoice.taxPercent}%)`, money(invoice.taxAmount));
    if (invoice.discount > 0) totalRow('Discount', `-${money(invoice.discount)}`);
    y += 4;
    doc.moveTo(totalsX, y - 4).lineTo(totalsX + totalsWidth, y - 4).strokeColor('#e2e5ea').stroke();
    totalRow('Total Due', money(invoice.total), { bold: true });

    if (invoice.notes) {
      y += 20;
      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(8.5).text('NOTES', tableX, y);
      doc.fillColor('#1a2028').font('Helvetica').fontSize(10).text(invoice.notes, tableX, y + 14, { width: 495 });
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate invoice PDF', error: err.message });
    } else {
      res.end();
    }
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
