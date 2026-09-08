const User = require('../models/User');
async function getTeamMemberIds(managerId) {
  const members = await User.find({
    manager: managerId,
  }).select('_id');
  return members.map((m) => m._id);
}
async function isTeamMember(managerId, employeeId) {
  if (!employeeId) return false;
  const match = await User.exists({
    _id: employeeId,
    manager: managerId,
  });
  return Boolean(match);
}
module.exports = {
  getTeamMemberIds,
  isTeamMember,
};
