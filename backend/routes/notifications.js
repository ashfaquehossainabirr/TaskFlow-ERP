const express = require('express');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { getTeamMemberIds } = require('../utils/teamAccess');
const { getClearedState, filterCleared, clearAll } = require('../utils/notificationClear');
const router = express.Router();

router.use(protect);

const THRESHOLD_DAYS = 3;

// Same scoping as the rest of the app: employees see their own assigned
// tasks, managers see their team's, admins see everyone's.
async function scopeToUser(req) {
  if (req.user.role === 'admin') return {};
  if (req.user.role === 'manager') {
    const teamIds = await getTeamMemberIds(req.user._id);
    return { assignedTo: { $in: teamIds } };
  }
  return { assignedTo: req.user._id };
}

async function findUpcomingDeadlines(req) {
  const filter = await scopeToUser(req);
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  filter.deadline = { $lte: thresholdDate };
  filter.status = { $nin: ['delivered', 'cancelled'] };
  return Task.find(filter)
    .populate('assignedTo', 'name email department')
    .populate('project', 'name status')
    .sort({ deadline: 1 })
    .limit(20);
}

// Dashboard deadline-notification feed (distinct from /tasks/deadlines/upcoming,
// which the Deadline Watch page uses and always shows the full unfiltered list).
router.get('/deadline-alerts', async (req, res) => {
  try {
    const tasks = await findUpcomingDeadlines(req);
    const clearedState = await getClearedState(req.user._id, 'deadline');
    res.json(filterCleared(tasks, clearedState));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch deadline alerts', error: err.message });
  }
});

// Dismiss all deadline alerts currently visible to this user. Persisted in
// the database so it stays cleared across devices/sessions.
router.post('/deadline-alerts/clear', async (req, res) => {
  try {
    const tasks = await findUpcomingDeadlines(req);
    const result = await clearAll(req.user._id, 'deadline', tasks);
    res.json({ message: 'Deadline alerts cleared', ...result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear deadline alerts', error: err.message });
  }
});

module.exports = router;
