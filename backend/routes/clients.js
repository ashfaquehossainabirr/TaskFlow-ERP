const express = require('express');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/auth');
const { escapeRegex } = require('../utils/escapeRegex');
const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: re }, { company: re }, { email: re }];
    }
    const clients = await Client.find(filter).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch clients', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const invoices = await Invoice.find({ client: client._id }).sort({ createdAt: -1 });
    res.json({ client, invoices });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch client', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, industry, address, status, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Client name is required' });
    const client = await Client.create({
      name,
      company: company || '',
      email: email || '',
      phone: phone || '',
      industry: industry || '',
      address: address || '',
      status: Client.STATUS_VALUES.includes(status) ? status : 'active',
      notes: notes || '',
      createdBy: req.user._id,
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create client', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, company, email, phone, industry, address, status, notes } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (name !== undefined) client.name = name;
    if (company !== undefined) client.company = company;
    if (email !== undefined) client.email = email;
    if (phone !== undefined) client.phone = phone;
    if (industry !== undefined) client.industry = industry;
    if (address !== undefined) client.address = address;
    if (status !== undefined && Client.STATUS_VALUES.includes(status)) client.status = status;
    if (notes !== undefined) client.notes = notes;
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client', error: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const invoiceCount = await Invoice.countDocuments({ client: req.params.id });
    if (invoiceCount > 0) {
      return res.status(409).json({
        message: `This client has ${invoiceCount} invoice(s) on record. Delete those first.`,
      });
    }
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client', error: err.message });
  }
});

module.exports = router;
