export function daysRemaining(deadline) {
  const now = new Date();
  const due = new Date(deadline);
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((startOfDue - startOfNow) / msPerDay);
}
export function formatDaysRemaining(deadline) {
  const days = daysRemaining(deadline);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}
export function urgencyLevel(deadline, status) {
  if (status === 'delivered' || status === 'cancelled') return 'closed';
  const days = daysRemaining(deadline);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'normal';
}
export const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  hold: 'On Hold',
};
export const STATUS_ORDER = ['todo', 'in-progress', 'hold', 'delivered', 'cancelled'];
