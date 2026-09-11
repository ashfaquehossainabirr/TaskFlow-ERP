const NotificationClear = require('../models/NotificationClear');

// Loads the current clear-state for a user/type pair, if any.
async function getClearedState(userId, type) {
  const record = await NotificationClear.findOne({ user: userId, type });
  if (!record) return null;
  return {
    clearedAt: record.clearedAt,
    idSet: new Set(record.clearedIds.map((id) => String(id))),
  };
}

// An item stays hidden only if it was cleared AND hasn't changed since.
function isCleared(item, clearedState) {
  if (!clearedState || !clearedState.idSet.has(String(item._id))) return false;
  if (!item.updatedAt) return true;
  return new Date(item.updatedAt) <= clearedState.clearedAt;
}

function filterCleared(items, clearedState) {
  if (!clearedState) return items;
  return items.filter((item) => !isCleared(item, clearedState));
}

// Persists the current set of visible items as "cleared" for this user/type.
async function clearAll(userId, type, items) {
  const now = new Date();
  const ids = items.map((item) => item._id);
  await NotificationClear.findOneAndUpdate(
    { user: userId, type },
    { user: userId, type, clearedAt: now, clearedIds: ids },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { clearedAt: now, count: ids.length };
}

module.exports = {
  getClearedState,
  isCleared,
  filterCleared,
  clearAll,
};
