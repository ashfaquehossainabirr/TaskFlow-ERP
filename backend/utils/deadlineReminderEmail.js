function daysRemaining(deadline) {
  const now = new Date();
  const due = new Date(deadline);
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((startOfDue - startOfNow) / msPerDay);
}
function formatDaysRemaining(deadline) {
  const days = daysRemaining(deadline);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}
const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  hold: 'On Hold',
};
function buildReminderEmail(user, tasks) {
  const rows = tasks
    .map((t) => {
      const remaining = formatDaysRemaining(t.deadline);
      const isUrgent = daysRemaining(t.deadline) <= 0;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${escapeHtml(t.title)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${escapeHtml(t.projectName)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${STATUS_LABELS[t.status] || t.status}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${new Date(t.deadline).toDateString()}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-weight:600;color:${isUrgent ? '#c0392b' : '#b8860b'};">${remaining}</td>
        </tr>`;
    })
    .join('');
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px;margin:0 auto;">
      <h2 style="color:#111;margin-bottom:4px;">Hi ${escapeHtml(user.name)},</h2>
      <p style="color:#444;">You have <strong>${tasks.length}</strong> task${tasks.length === 1 ? '' : 's'} with an approaching or passed deadline:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px;">
        <thead>
          <tr style="background:#f5f5f5;text-align:left;">
            <th style="padding:10px 12px;">Task</th>
            <th style="padding:10px 12px;">Project</th>
            <th style="padding:10px 12px;">Status</th>
            <th style="padding:10px 12px;">Deadline</th>
            <th style="padding:10px 12px;">Remaining</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#888;font-size:12.5px;">
        This is an automated daily reminder from TaskFlow. Log in to update the status of these tasks.
      </p>
    </div>`;
  const text = [
    `Hi ${user.name},`,
    '',
    `You have ${tasks.length} task(s) with an approaching or passed deadline:`,
    '',
    ...tasks.map(
      (t) =>
        `- ${t.title} (${t.projectName}) — ${STATUS_LABELS[t.status] || t.status} — due ${new Date(t.deadline).toDateString()} — ${formatDaysRemaining(t.deadline)}`
    ),
    '',
    'Log in to TaskFlow to update these tasks.',
  ].join('\n');
  return {
    subject: `TaskFlow: ${tasks.length} task${tasks.length === 1 ? '' : 's'} need${tasks.length === 1 ? 's' : ''} your attention`,
    html,
    text,
  };
}
function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
module.exports = {
  buildReminderEmail,
  formatDaysRemaining,
  daysRemaining,
};
