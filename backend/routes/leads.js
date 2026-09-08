const express = require('express');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const { escapeRegex } = require('../utils/escapeRegex');
const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: re }, { company: re }, { email: re }];
    }
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leads', error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const counts = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$estimatedValue' } } }]);
    const byStatus = {};
    Lead.STATUS_VALUES.forEach((s) => (byStatus[s] = { count: 0, value: 0 }));
    counts.forEach((c) => {
      byStatus[c._id] = { count: c.count, value: c.value };
    });
    const openPipelineValue = Lead.STATUS_VALUES.filter((s) => !['won', 'lost'].includes(s)).reduce(
      (sum, s) => sum + (byStatus[s]?.value || 0),
      0
    );
    res.json({ byStatus, openPipelineValue });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch lead stats', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch lead', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, source, status, estimatedValue, assignedTo, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Contact name is required' });
    const lead = await Lead.create({
      name,
      company: company || '',
      email: email || '',
      phone: phone || '',
      source: Lead.SOURCE_VALUES.includes(source) ? source : 'other',
      status: Lead.STATUS_VALUES.includes(status) ? status : 'new',
      estimatedValue: estimatedValue || 0,
      assignedTo: assignedTo || req.user._id,
      notes: notes || '',
      createdBy: req.user._id,
    });
    const populated = await lead.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create lead', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, company, email, phone, source, status, estimatedValue, assignedTo, notes } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (name !== undefined) lead.name = name;
    if (company !== undefined) lead.company = company;
    if (email !== undefined) lead.email = email;
    if (phone !== undefined) lead.phone = phone;
    if (source !== undefined && Lead.SOURCE_VALUES.includes(source)) lead.source = source;
    if (status !== undefined && Lead.STATUS_VALUES.includes(status)) lead.status = status;
    if (estimatedValue !== undefined) lead.estimatedValue = estimatedValue || 0;
    if (assignedTo !== undefined) lead.assignedTo = assignedTo || null;
    if (notes !== undefined) lead.notes = notes;
    await lead.save();
    const populated = await lead.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update lead', error: err.message });
  }
});

// Convert a won lead into a Client record.
// Note: intentionally avoids MongoDB multi-document transactions so this
// works against a standalone `mongod` (not just a replica set/Atlas).
router.post('/:id/convert', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (lead.convertedToClient) {
      return res.status(409).json({ message: 'This lead has already been converted' });
    }
    const client = await Client.create({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      status: 'active',
      notes: lead.notes,
      convertedFromLead: lead._id,
      createdBy: req.user._id,
    });
    lead.status = 'won';
    lead.convertedToClient = client._id;
    await lead.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Failed to convert lead', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete lead', error: err.message });
  }
});

module.exports = router;
