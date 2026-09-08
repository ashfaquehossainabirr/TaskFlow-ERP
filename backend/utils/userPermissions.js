const canCreateRole = (actor, role) => {
  if (role !== 'admin') return true;
  return Boolean(actor.isMainAdmin);
};
const canChangePassword = (actor, targetUser) => {
  if (String(actor._id) === String(targetUser._id)) return true;
  if (targetUser.role !== 'admin') return true;
  return Boolean(actor.isMainAdmin);
};
const canGrantAdminRole = (actor) => Boolean(actor.isMainAdmin);
const canChangeAdminRole = (actor, currentRole, newRole) => {
  if (newRole === currentRole) return true;
  if (newRole !== 'admin' && currentRole !== 'admin') return true;
  return Boolean(actor.isMainAdmin);
};
const canDeleteUser = (actor, targetUser) => {
  if (targetUser.isMainAdmin) return false;
  if (targetUser.role !== 'admin') return true;
  return Boolean(actor.isMainAdmin);
};
module.exports = {
  canCreateRole,
  canChangePassword,
  canGrantAdminRole,
  canChangeAdminRole,
  canDeleteUser,
};
