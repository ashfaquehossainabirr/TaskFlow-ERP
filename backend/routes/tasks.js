const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect, authorize } = require('../middleware/auth');
const { runDeadlineReminderJob } = require('../jobs/deadlineReminderJob');
const { getTeamMemberIds, isTeamMember } = require('../utils/teamAccess');
const { escapeRegex } = require('../utils/escapeRegex');
const router = express.Router();
router.use(protect);
const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  hold: 'On Hold',
};
const scopeToUser = async (req) => {
  if (req.user.role === 'admin') return {};
  if (req.user.role === 'manager') {
    const teamIds = await getTeamMemberIds(req.user._id);
    return {
      assignedTo: {
        $in: teamIds,
      },
    };
  }
  return {
    assignedTo: req.user._id,
  };
};
const canAccessTask = async (req, task) => {
  if (req.user.role === 'admin') return true;
  const assignedToId = String(task.assignedTo?._id ?? task.assignedTo ?? '');
  if (assignedToId === String(req.user._id)) return true;
  if (req.user.role === 'manager') return isTeamMember(req.user._id, assignedToId);
  return false;
};
const canManageAssignee = async (req, employeeId) => {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'manager') return isTeamMember(req.user._id, employeeId);
  return false;
};
async function logActivity(taskId, userId, type, message, text = '') {
  try {
    await Activity.create({
      task: taskId,
      user: userId,
      type,
      message,
      text,
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}
router.get('/', async (req, res) => {
  try {
    const filter = await scopeToUser(req);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo && req.user.role !== 'employee') {
      if (req.user.role === 'manager' && !(await isTeamMember(req.user._id, req.query.assignedTo))) {
        return res.status(403).json({
          message: 'You can only view tasks for your own team',
        });
      }
      filter.assignedTo = req.query.assignedTo;
    }
    if (req.query.project) filter.project = req.query.project;
    if (req.query.search)
      filter.title = {
        $regex: escapeRegex(req.query.search),
        $options: 'i',
      };
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email')
      .populate('project', 'name status milestones')
      .sort({
        deadline: 1,
      });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch tasks',
      error: err.message,
    });
  }
});
router.get('/stats', async (req, res) => {
  try {
    const filter = await scopeToUser(req);
    const statuses = Task.STATUS_VALUES;
    const counts = await Task.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$status',
          count: {
            $sum: 1,
          },
        },
      },
    ]);
    const result = statuses.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    counts.forEach((c) => {
      result[c._id] = c.count;
    });
    result.total = Object.values(result).reduce((a, b) => a + b, 0);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch stats',
      error: err.message,
    });
  }
});
router.post('/reminders/send-now', authorize('admin'), async (req, res) => {
  try {
    const results = await runDeadlineReminderJob();
    res.json({
      message: 'Reminder job executed',
      results,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to run reminder job',
      error: err.message,
    });
  }
});
router.get('/stats/by-employee', authorize('admin', 'manager'), async (req, res) => {
  try {
    const employeeFilter = {
      role: 'employee',
    };
    if (req.user.role === 'manager') employeeFilter.manager = req.user._id;
    const employees = await User.find(employeeFilter).select('name email department minimumTarget').sort({
      name: 1,
    });
    const employeeIds = employees.map((e) => e._id);
    const statusAgg = await Task.aggregate([
      {
        $match: {
          assignedTo: {
            $in: employeeIds,
          },
        },
      },
      {
        $group: {
          _id: {
            employee: '$assignedTo',
            status: '$status',
          },
          count: {
            $sum: 1,
          },
          projectValue: {
            $sum: {
              $ifNull: ['$projectValue', 0],
            },
          },
        },
      },
    ]);
    const projectAgg = await Task.aggregate([
      {
        $match: {
          assignedTo: {
            $in: employeeIds,
          },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          projects: {
            $addToSet: '$project',
          },
          total: {
            $sum: 1,
          },
        },
      },
    ]);
    const statusMap = {};
    statusAgg.forEach((row) => {
      const empId = String(row._id.employee);
      if (!statusMap[empId]) statusMap[empId] = {};
      statusMap[empId][row._id.status] = {
        count: row.count,
        projectValue: row.projectValue,
      };
    });
    const projectMap = {};
    projectAgg.forEach((row) => {
      projectMap[String(row._id)] = {
        projectCount: row.projects.length,
        total: row.total,
      };
    });
    const result = employees.map((emp) => {
      const id = String(emp._id);
      const statuses = statusMap[id] || {};
      const proj = projectMap[id] || {
        projectCount: 0,
        total: 0,
      };
      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        minimumTarget: emp.minimumTarget,
        projects: proj.projectCount,
        total: proj.total,
        todo: statuses.todo?.count || 0,
        'in-progress': statuses['in-progress']?.count || 0,
        hold: statuses.hold?.count || 0,
        delivered: statuses.delivered?.count || 0,
        cancelled: statuses.cancelled?.count || 0,
        inProgressValue: statuses['in-progress']?.projectValue || 0,
        deliveredValue: statuses.delivered?.projectValue || 0,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch employee stats',
      error: err.message,
    });
  }
});
router.get('/deadlines/upcoming', async (req, res) => {
  try {
    const filter = await scopeToUser(req);
    const now = new Date();
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    filter.deadline = {
      $lte: threeDaysOut,
    };
    filter.status = {
      $nin: ['delivered', 'cancelled'],
    };
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email department')
      .populate('project', 'name status milestones')
      .sort({
        deadline: 1,
      });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch upcoming deadlines',
      error: err.message,
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email')
      .populate('project', 'name status milestones')
      .populate('statusHistory.changedBy', 'name');
    if (!task)
      return res.status(404).json({
        message: 'Task not found',
      });
    if (!(await canAccessTask(req, task))) {
      return res.status(403).json({
        message: 'You do not have access to this task',
      });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch task',
      error: err.message,
    });
  }
});
router.get('/:id/activity', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).select('assignedTo');
    if (!task)
      return res.status(404).json({
        message: 'Task not found',
      });
    if (!(await canAccessTask(req, task))) {
      return res.status(403).json({
        message: 'You do not have access to this task',
      });
    }
    const activity = await Activity.find({
      task: req.params.id,
    })
      .populate('user', 'name role')
      .sort({
        createdAt: 1,
      });
    res.json(activity);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch activity',
      error: err.message,
    });
  }
});
router.post('/:id/comments', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        message: 'Comment text is required',
      });
    }
    const task = await Task.findById(req.params.id).select('assignedTo');
    if (!task)
      return res.status(404).json({
        message: 'Task not found',
      });
    if (!(await canAccessTask(req, task))) {
      return res.status(403).json({
        message: 'You do not have access to this task',
      });
    }
    const comment = await Activity.create({
      task: req.params.id,
      user: req.user._id,
      type: 'comment',
      text: text.trim(),
    });
    const populated = await comment.populate('user', 'name role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add comment',
      error: err.message,
    });
  }
});
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const comment = await Activity.findOne({
      _id: req.params.commentId,
      task: req.params.id,
      type: 'comment',
    });
    if (!comment)
      return res.status(404).json({
        message: 'Comment not found',
      });
    if (req.user.role !== 'admin' && String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'You can only delete your own comments',
      });
    }
    await comment.deleteOne();
    res.json({
      message: 'Comment deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete comment',
      error: err.message,
    });
  }
});
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { title, description, project, projectValue, milestone, priority, deadline, assignedTo, status } =
      req.body;
    if (!title || !project || !deadline || !assignedTo) {
      return res.status(400).json({
        message: 'title, project, deadline and assignedTo are required',
      });
    }
    if (!(await canManageAssignee(req, assignedTo))) {
      return res.status(403).json({
        message: 'You can only assign tasks to your own team',
      });
    }
    const task = await Task.create({
      title,
      description,
      project,
      projectValue: projectValue === '' || projectValue === undefined ? null : projectValue,
      milestone: milestone || null,
      priority,
      deadline,
      assignedTo,
      status: status || 'todo',
      createdBy: req.user._id,
      statusHistory: [
        {
          status: status || 'todo',
          changedBy: req.user._id,
        },
      ],
    });
    await logActivity(task._id, req.user._id, 'created', 'created this task');
    const populated = await task.populate([
      {
        path: 'assignedTo',
        select: 'name email department',
      },
      {
        path: 'project',
        select: 'name status milestones',
      },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create task',
      error: err.message,
    });
  }
});
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { title, description, project, projectValue, milestone, priority, deadline, assignedTo, status } =
      req.body;
    const task = await Task.findById(req.params.id);
    if (!task)
      return res.status(404).json({
        message: 'Task not found',
      });
    if (!(await canManageAssignee(req, task.assignedTo))) {
      return res.status(403).json({
        message: 'You can only manage tasks belonging to your own team',
      });
    }
    if (assignedTo !== undefined && String(assignedTo) !== String(task.assignedTo)) {
      if (!(await canManageAssignee(req, assignedTo))) {
        return res.status(403).json({
          message: 'You can only reassign tasks to your own team',
        });
      }
    }
    const changedFields = [];
    if (title !== undefined && title !== task.title) {
      task.title = title;
      changedFields.push('title');
    }
    if (description !== undefined && description !== task.description) {
      task.description = description;
      changedFields.push('description');
    }
    if (project !== undefined && String(project) !== String(task.project)) {
      task.project = project;
      changedFields.push('project');
    }
    if (projectValue !== undefined) {
      const normalizedValue = projectValue === '' ? null : projectValue;
      if (Number(normalizedValue ?? NaN) !== Number(task.projectValue ?? NaN)) {
        task.projectValue = normalizedValue;
        changedFields.push('project value');
      }
    }
    if (milestone !== undefined && String(milestone || '') !== String(task.milestone || '')) {
      task.milestone = milestone || null;
      changedFields.push('milestone');
    }
    if (priority !== undefined && priority !== task.priority) {
      task.priority = priority;
      changedFields.push('priority');
    }
    if (deadline !== undefined && new Date(deadline).getTime() !== new Date(task.deadline).getTime()) {
      task.deadline = deadline;
      changedFields.push('deadline');
    }
    if (assignedTo !== undefined && String(assignedTo) !== String(task.assignedTo)) {
      task.assignedTo = assignedTo;
      changedFields.push('assignee');
    }
    let statusChangedTo = null;
    if (status !== undefined && status !== task.status) {
      statusChangedTo = status;
      task.status = status;
      task.statusHistory.push({
        status,
        changedBy: req.user._id,
      });
    }
    await task.save();
    if (changedFields.length > 0) {
      await logActivity(task._id, req.user._id, 'updated', `updated ${changedFields.join(', ')}`);
    }
    if (statusChangedTo) {
      await logActivity(
        task._id,
        req.user._id,
        'status_changed',
        `changed status to ${STATUS_LABELS[statusChangedTo] || statusChangedTo}`
      );
    }
    const populated = await task.populate([
      {
        path: 'assignedTo',
        select: 'name email department',
      },
      {
        path: 'project',
        select: 'name status milestones',
      },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update task',
      error: err.message,
    });
  }
});
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!Task.STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${Task.STATUS_VALUES.join(', ')}`,
      });
    }
    const task = await Task.findById(req.params.id);
    if (!task)
      return res.status(404).json({
        message: 'Task not found',
      });
    if (!(await canAccessTask(req, task))) {
      return res.status(403).json({
        message: 'You can only update tasks assigned to you or your team',
      });
    }
    task.status = status;
    task.statusHistory.push({
      status,
      changedBy: req.user._id,
    });
    await task.save();
    await logActivity(
      task._id,
      req.user._id,
      'status_changed',
      `changed status to ${STATUS_LABELS[status] || status}`
    );
    const populated = await task.populate([
      {
        path: 'assignedTo',
        select: 'name email department',
      },
      {
        path: 'project',
        select: 'name status milestones',
      },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update task status',
      error: err.message,
    });
  }
});
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.json({
        message: 'Task already deleted',
      });
    }
    if (!(await canManageAssignee(req, task.assignedTo))) {
      return res.status(403).json({
        message: 'You can only delete tasks belonging to your own team',
      });
    }
    await task.deleteOne();
    await Activity.deleteMany({
      task: req.params.id,
    });
    res.json({
      message: 'Task deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete task',
      error: err.message,
    });
  }
});
module.exports = router;
