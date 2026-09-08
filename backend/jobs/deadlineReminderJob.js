const Task = require('../models/Task');
const { sendMail } = require('../utils/mailer');
const { buildReminderEmail } = require('../utils/deadlineReminderEmail');
const THRESHOLD_DAYS = Number(process.env.REMINDER_DAYS_THRESHOLD || 3);
async function runDeadlineReminderJob() {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const tasks = await Task.find({
    deadline: {
      $lte: thresholdDate,
    },
    status: {
      $nin: ['delivered', 'cancelled'],
    },
  })
    .populate('assignedTo', 'name email isActive')
    .sort({
      deadline: 1,
    });
  const byEmployee = new Map();
  tasks.forEach((task) => {
    const employee = task.assignedTo;
    if (!employee || !employee.isActive || !employee.email) return;
    const key = String(employee._id);
    if (!byEmployee.has(key))
      byEmployee.set(key, {
        user: employee,
        tasks: [],
      });
    byEmployee.get(key).tasks.push(task);
  });
  const results = [];
  for (const { user, tasks: userTasks } of byEmployee.values()) {
    try {
      const { subject, html, text } = buildReminderEmail(user, userTasks);
      await sendMail({
        to: user.email,
        subject,
        html,
        text,
      });
      results.push({
        email: user.email,
        sent: true,
        taskCount: userTasks.length,
      });
    } catch (err) {
      results.push({
        email: user.email,
        sent: false,
        error: err.message,
      });
    }
  }
  console.log(
    `[deadline-reminder] Checked ${tasks.length} task(s) due within ${THRESHOLD_DAYS} day(s); emailed ${results.filter((r) => r.sent).length}/${byEmployee.size} employee(s).`
  );
  return results;
}
module.exports = {
  runDeadlineReminderJob,
};
