const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const KpiBonus = require('../models/KpiBonus');
const { protect, authorize } = require('../middleware/auth');
const { getTeamMemberIds } = require('../utils/teamAccess');
const router = express.Router();

router.use(protect);

const BONUS_STEP = 100; // every $100 of excess...
const BONUS_PER_STEP = 1000; // ...earns BDT 1000

function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 1);
  return { start, end };
}

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

function parseYearQuarter(req) {
  const fallback = currentQuarter();
  const year = parseInt(req.query.year, 10) || fallback.year;
  let quarter = parseInt(req.query.quarter, 10) || fallback.quarter;
  if (quarter < 1 || quarter > 4) quarter = fallback.quarter;
  return { year, quarter };
}

// Bonus is only earned on the amount ACHIEVED ABOVE the minimum target,
// in whole $100 steps — passing the target on its own earns nothing extra.
function calcBonus(target, achieved) {
  const t = Number(target) || 0;
  const a = Number(achieved) || 0;
  const excess = Math.max(0, a - t);
  const steps = Math.floor(excess / BONUS_STEP);
  return { target: t, achieved: a, excess, bonusAmount: steps * BONUS_PER_STEP };
}

// Sum of projectValue for tasks that are currently Delivered, bucketed by
// the moment they most recently transitioned to Delivered (falls back to
// updatedAt for older tasks with no matching statusHistory entry).
async function computeAchievedMap(employeeIds, start, end) {
  if (employeeIds.length === 0) return {};
  const rows = await Task.aggregate([
    { $match: { assignedTo: { $in: employeeIds }, status: 'delivered' } },
    {
      $addFields: {
        deliveredEntries: {
          $filter: {
            input: { $ifNull: ['$statusHistory', []] },
            as: 'h',
            cond: { $eq: ['$$h.status', 'delivered'] },
          },
        },
      },
    },
    {
      $addFields: {
        deliveredAt: {
          $ifNull: [{ $arrayElemAt: ['$deliveredEntries.changedAt', -1] }, '$updatedAt'],
        },
      },
    },
    { $match: { deliveredAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: '$assignedTo',
        achievedValue: { $sum: { $ifNull: ['$projectValue', 0] } },
        taskCount: { $sum: 1 },
      },
    },
  ]);
  const map = {};
  rows.forEach((r) => {
    map[String(r._id)] = { achievedValue: r.achievedValue, taskCount: r.taskCount };
  });
  return map;
}

async function scopedEmployees(req) {
  const filter = { role: 'employee', isActive: true, minimumTarget: { $ne: null } };
  if (req.user.role === 'manager') {
    const teamIds = await getTeamMemberIds(req.user._id);
    filter._id = { $in: teamIds };
  }
  return User.find(filter).select('name email department minimumTarget').sort({ name: 1 });
}

function buildRow(employee, achievedInfo, kpiDoc) {
  const locked = kpiDoc && kpiDoc.status !== 'pending' && kpiDoc.targetValue != null;
  const calc = locked
    ? {
        target: kpiDoc.targetValue,
        achieved: kpiDoc.achievedValue,
        excess: Math.max(0, kpiDoc.achievedValue - kpiDoc.targetValue),
        bonusAmount: kpiDoc.bonusAmount,
      }
    : calcBonus(employee.minimumTarget, achievedInfo?.achievedValue || 0);

  return {
    kpiId: kpiDoc?._id || null,
    employeeId: employee._id,
    name: employee.name,
    email: employee.email,
    department: employee.department || '',
    taskCount: achievedInfo?.taskCount || 0,
    ...calc,
    status: kpiDoc?.status || 'pending',
    notes: kpiDoc?.notes || '',
    paidOn: kpiDoc?.paidOn || null,
    locked,
  };
}

// Quarterly KPI board — admin sees everyone, manager sees their team,
// employees are redirected to /my instead.
router.get('/summary', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { year, quarter } = parseYearQuarter(req);
    const { start, end } = quarterRange(year, quarter);

    const employees = await scopedEmployees(req);
    const employeeIds = employees.map((e) => e._id);
    const achievedMap = await computeAchievedMap(employeeIds, start, end);
    const kpiDocs = await KpiBonus.find({ employee: { $in: employeeIds }, year, quarter });
    const kpiDocMap = {};
    kpiDocs.forEach((d) => {
      kpiDocMap[String(d.employee)] = d;
    });

    const rows = employees.map((employee) =>
      buildRow(employee, achievedMap[String(employee._id)], kpiDocMap[String(employee._id)])
    );

    res.json({ year, quarter, bonusStep: BONUS_STEP, bonusPerStep: BONUS_PER_STEP, rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load KPI summary', error: err.message });
  }
});

// The logged-in employee's own quarterly KPI (any role can call this, but it
// only returns data for accounts with a minimum target configured).
router.get('/my', async (req, res) => {
  try {
    const { year, quarter } = parseYearQuarter(req);
    const { start, end } = quarterRange(year, quarter);

    const me = await User.findById(req.user._id).select('name email department minimumTarget role');
    if (!me || me.minimumTarget == null) {
      return res.json({ year, quarter, bonusStep: BONUS_STEP, bonusPerStep: BONUS_PER_STEP, kpi: null });
    }

    const achievedMap = await computeAchievedMap([me._id], start, end);
    const kpiDoc = await KpiBonus.findOne({ employee: me._id, year, quarter });
    const row = buildRow(me, achievedMap[String(me._id)], kpiDoc);

    res.json({ year, quarter, bonusStep: BONUS_STEP, bonusPerStep: BONUS_PER_STEP, kpi: row });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load your KPI', error: err.message });
  }
});

// Bonus payout history for the logged-in employee (approved/paid quarters only).
router.get('/my/history', async (req, res) => {
  try {
    const docs = await KpiBonus.find({
      employee: req.user._id,
      status: { $in: ['approved', 'paid'] },
    }).sort({ year: -1, quarter: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load KPI history', error: err.message });
  }
});

// Approve / mark paid / reopen a quarter's bonus. Admin only — same
// sensitivity level as Payroll/Invoices/Expenses in this app.
router.post('/:employeeId/:year/:quarter/mark', authorize('admin'), async (req, res) => {
  try {
    const { employeeId, year: yearParam, quarter: quarterParam } = req.params;
    const year = parseInt(yearParam, 10);
    const quarter = parseInt(quarterParam, 10);
    const { status, notes } = req.body;

    if (!KpiBonus.STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (quarter < 1 || quarter > 4) {
      return res.status(400).json({ message: 'Invalid quarter' });
    }

    const employee = await User.findOne({ _id: employeeId, role: 'employee' }).select(
      'name email department minimumTarget'
    );
    if (!employee || employee.minimumTarget == null) {
      return res.status(404).json({ message: 'Employee not found or has no KPI target set' });
    }

    const update = {
      status,
      markedBy: req.user._id,
      ...(notes !== undefined ? { notes } : {}),
    };

    if (status === 'pending') {
      // Reopen: drop the snapshot so numbers go live again.
      update.targetValue = null;
      update.achievedValue = null;
      update.bonusAmount = null;
      update.paidOn = null;
    } else {
      const { start, end } = quarterRange(year, quarter);
      const achievedMap = await computeAchievedMap([employee._id], start, end);
      const calc = calcBonus(employee.minimumTarget, achievedMap[String(employee._id)]?.achievedValue || 0);
      update.targetValue = calc.target;
      update.achievedValue = calc.achieved;
      update.bonusAmount = calc.bonusAmount;
      update.paidOn = status === 'paid' ? new Date() : null;
    }

    const doc = await KpiBonus.findOneAndUpdate(
      { employee: employee._id, year, quarter },
      { $set: update, $setOnInsert: { employee: employee._id, year, quarter } },
      { upsert: true, new: true }
    );

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update KPI bonus status', error: err.message });
  }
});

module.exports = router;
