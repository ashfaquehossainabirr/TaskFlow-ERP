const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { getTeamMemberIds } = require('../utils/teamAccess');
const router = express.Router();

router.use(protect);

// Employees can view their own attendance; admin/manager can view & mark for their team.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      const day = new Date(req.query.date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      filter.date = { $gte: day, $lt: nextDay };
    } else if (req.query.month) {
      // 'YYYY-MM'
      const [y, m] = req.query.month.split('-').map(Number);
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }
    if (req.query.employee) filter.employee = req.query.employee;

    if (req.user.role === 'employee') {
      filter.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      const teamIds = await getTeamMemberIds(req.user._id);
      teamIds.push(req.user._id);
      if (filter.employee) {
        if (!teamIds.map(String).includes(String(filter.employee))) {
          return res.status(403).json({ message: 'You can only view attendance for your own team' });
        }
      } else {
        filter.employee = { $in: teamIds };
      }
    }

    const records = await Attendance.find(filter).populate('employee', 'name email department').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

router.get('/roster', authorize('admin', 'manager'), async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.user.role === 'manager') {
      const teamIds = await getTeamMemberIds(req.user._id);
      filter._id = { $in: teamIds };
    }
    const employees = await User.find(filter).select('name email department role').sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roster', error: err.message });
  }
});

// Mark or update a single day's attendance (upsert).
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { employee, date, status, checkIn, checkOut, notes } = req.body;
    if (!employee || !date) {
      return res.status(400).json({ message: 'Employee and date are required' });
    }
    if (req.user.role === 'manager') {
      const teamIds = (await getTeamMemberIds(req.user._id)).map(String);
      if (!teamIds.includes(String(employee))) {
        return res.status(403).json({ message: 'You can only mark attendance for your own team' });
      }
    }
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const record = await Attendance.findOneAndUpdate(
      { employee, date: day },
      {
        employee,
        date: day,
        status: Attendance.STATUS_VALUES.includes(status) ? status : 'present',
        checkIn: checkIn || '',
        checkOut: checkOut || '',
        notes: notes || '',
        markedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('employee', 'name email department');
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark attendance', error: err.message });
  }
});

// Bulk mark attendance for multiple employees on one day, or across a range of
// days at once (e.g. "mark all present" for today, or "set an off day" for a
// week). Accepts either `date` (single day, back-compat) or `dates` (array of
// day strings) plus `entries`: [{ employee, status, notes? }]. `notes` at the
// top level applies to every entry unless the entry has its own.
router.post('/bulk', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { date, dates, entries, notes } = req.body;
    const dateList = Array.isArray(dates) && dates.length > 0 ? dates : date ? [date] : [];
    if (dateList.length === 0 || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'At least one date and one entry are required' });
    }
    let allowedIds = null;
    if (req.user.role === 'manager') {
      allowedIds = (await getTeamMemberIds(req.user._id)).map(String);
    }
    const results = [];
    for (const rawDate of dateList) {
      const day = new Date(rawDate);
      if (Number.isNaN(day.getTime())) continue;
      day.setHours(0, 0, 0, 0);
      for (const entry of entries) {
        if (allowedIds && !allowedIds.includes(String(entry.employee))) continue;
        const record = await Attendance.findOneAndUpdate(
          { employee: entry.employee, date: day },
          {
            employee: entry.employee,
            date: day,
            status: Attendance.STATUS_VALUES.includes(entry.status) ? entry.status : 'present',
            notes: entry.notes || notes || '',
            markedBy: req.user._id,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(record);
      }
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to bulk mark attendance', error: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    if (req.user.role === 'manager') {
      const teamIds = (await getTeamMemberIds(req.user._id)).map(String);
      if (!teamIds.includes(String(record.employee))) {
        return res.status(403).json({ message: 'You can only manage attendance for your own team' });
      }
    }
    await record.deleteOne();
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete attendance record', error: err.message });
  }
});

module.exports = router;
