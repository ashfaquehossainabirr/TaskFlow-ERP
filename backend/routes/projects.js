const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const { getTeamMemberIds } = require('../utils/teamAccess');
const { escapeRegex } = require('../utils/escapeRegex');
const router = express.Router();
router.use(protect);
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search)
      filter.name = {
        $regex: escapeRegex(req.query.search),
        $options: 'i',
      };
    const projects = await Project.find(filter).sort({
      createdAt: -1,
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch projects',
      error: err.message,
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    res.json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch project',
      error: err.message,
    });
  }
});
router.get('/:id/stats', async (req, res) => {
  try {
    const filter = {
      project: req.params.id,
    };
    if (req.user.role === 'manager') {
      const teamIds = await getTeamMemberIds(req.user._id);
      filter.assignedTo = {
        $in: teamIds,
      };
    } else if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }
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
      message: 'Failed to fetch project stats',
      error: err.message,
    });
  }
});
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, description, client, status, startDate, targetEndDate } = req.body;
    if (!name)
      return res.status(400).json({
        message: 'Project name is required',
      });
    const existing = await Project.findOne({
      name,
    });
    if (existing)
      return res.status(409).json({
        message: 'A project with this name already exists',
      });
    const project = await Project.create({
      name,
      description,
      client,
      status: status || 'planning',
      startDate,
      targetEndDate,
      createdBy: req.user._id,
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create project',
      error: err.message,
    });
  }
});
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { name, description, client, status, startDate, targetEndDate } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (client !== undefined) project.client = client;
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate;
    if (targetEndDate !== undefined) project.targetEndDate = targetEndDate;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update project',
      error: err.message,
    });
  }
});
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const taskCount = await Task.countDocuments({
      project: req.params.id,
    });
    if (taskCount > 0) {
      return res.status(409).json({
        message: `This project has ${taskCount} task(s) linked to it. Reassign or delete those tasks first.`,
      });
    }
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    res.json({
      message: 'Project deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete project',
      error: err.message,
    });
  }
});
router.post('/:id/milestones', authorize('admin'), async (req, res) => {
  try {
    const { title, description, dueDate, status } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({
        message: 'Milestone title and due date are required',
      });
    }
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    project.milestones.push({
      title,
      description,
      dueDate,
      status: status || 'pending',
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add milestone',
      error: err.message,
    });
  }
});
router.put('/:id/milestones/:milestoneId', authorize('admin'), async (req, res) => {
  try {
    const { title, description, dueDate, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone)
      return res.status(404).json({
        message: 'Milestone not found',
      });
    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (dueDate !== undefined) milestone.dueDate = dueDate;
    if (status !== undefined) milestone.status = status;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update milestone',
      error: err.message,
    });
  }
});
router.delete('/:id/milestones/:milestoneId', authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({
        message: 'Project not found',
      });
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone)
      return res.status(404).json({
        message: 'Milestone not found',
      });
    milestone.deleteOne();
    await project.save();
    await Task.updateMany(
      {
        milestone: req.params.milestoneId,
      },
      {
        $set: {
          milestone: null,
        },
      }
    );
    res.json(project);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete milestone',
      error: err.message,
    });
  }
});
module.exports = router;
