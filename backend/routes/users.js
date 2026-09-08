const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const { escapeRegex } = require('../utils/escapeRegex');
const {
  canCreateRole,
  canChangePassword,
  canChangeAdminRole,
  canDeleteUser,
} = require('../utils/userPermissions');
const router = express.Router();
router.use(protect);
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({
        message: 'You do not have access to the team list',
      });
    }
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.user.role === 'manager') {
      filter.manager = req.user._id;
    }
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        {
          name: re,
        },
        {
          email: re,
        },
      ];
    }
    const users = await User.find(filter).sort({
      createdAt: -1,
    });
    res.json(users.map((u) => u.toSafeObject()));
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch users',
      error: err.message,
    });
  }
});
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      manager,
      minimumTarget,
      designation,
      phone,
      employmentType,
      dateOfJoining,
      monthlySalary,
    } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }
    const existing = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existing) {
      return res.status(409).json({
        message: 'A user with this email already exists',
      });
    }
    const resolvedRole = ['admin', 'manager', 'employee'].includes(role) ? role : 'employee';
    if (!canCreateRole(req.user, resolvedRole)) {
      return res.status(403).json({
        message: 'Only the main admin can create admin accounts',
      });
    }
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: resolvedRole,
      department: department || '',
      manager: resolvedRole === 'employee' ? manager || null : null,
      minimumTarget:
        resolvedRole === 'employee' && minimumTarget !== '' && minimumTarget !== undefined
          ? minimumTarget
          : null,
      designation: designation || '',
      phone: phone || '',
      employmentType: ['full-time', 'part-time', 'contract', 'intern'].includes(employmentType)
        ? employmentType
        : 'full-time',
      dateOfJoining: dateOfJoining || null,
      monthlySalary: monthlySalary !== '' && monthlySalary !== undefined ? monthlySalary : null,
    });
    res.status(201).json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create user',
      error: err.message,
    });
  }
});
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      department,
      manager,
      isActive,
      password,
      isMainAdmin,
      minimumTarget,
      designation,
      phone,
      employmentType,
      dateOfJoining,
      monthlySalary,
    } = req.body;
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({
        message: 'User not found',
      });
    if (password && !canChangePassword(req.user, user)) {
      return res.status(403).json({
        message: "Only the main admin can change another admin's password",
      });
    }
    if (role !== undefined && !canChangeAdminRole(req.user, user.role, role)) {
      return res.status(403).json({
        message: 'Only the main admin can change a user into or out of the admin role',
      });
    }
    if (isMainAdmin === true) {
      if (!req.user.isMainAdmin) {
        return res.status(403).json({
          message: 'Only the main admin can transfer main admin status',
        });
      }
      if (user.role !== 'admin' && role !== 'admin') {
        return res.status(400).json({
          message: 'Main admin status can only be granted to an admin',
        });
      }
      if (String(user._id) !== String(req.user._id)) {
        await User.updateOne(
          {
            _id: req.user._id,
          },
          {
            isMainAdmin: false,
          }
        );
      }
      user.isMainAdmin = true;
    }
    if (user.isMainAdmin && role !== undefined && role !== 'admin') {
      return res.status(400).json({
        message: "Transfer main admin status to another admin before changing this account's role",
      });
    }
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase();
    if (role !== undefined && ['admin', 'manager', 'employee'].includes(role)) user.role = role;
    if (department !== undefined) user.department = department;
    if (minimumTarget !== undefined) user.minimumTarget = minimumTarget === '' ? null : minimumTarget;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;
    if (manager !== undefined) user.manager = user.role === 'employee' ? manager || null : null;
    if (designation !== undefined) user.designation = designation;
    if (phone !== undefined) user.phone = phone;
    if (employmentType !== undefined && ['full-time', 'part-time', 'contract', 'intern'].includes(employmentType))
      user.employmentType = employmentType;
    if (dateOfJoining !== undefined) user.dateOfJoining = dateOfJoining || null;
    if (monthlySalary !== undefined) user.monthlySalary = monthlySalary === '' ? null : monthlySalary;
    if (user.role !== 'employee') {
      user.manager = null;
      user.minimumTarget = null;
    }
    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update user',
      error: err.message,
    });
  }
});
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({
        message: 'You cannot delete your own account',
      });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.json({
        message: 'User already deleted',
      });
    }
    if (!canDeleteUser(req.user, user)) {
      return res.status(403).json({
        message: user.isMainAdmin
          ? 'The main admin account cannot be deleted'
          : 'Only the main admin can delete another admin account',
      });
    }
    const assignedCount = await Task.countDocuments({
      assignedTo: req.params.id,
    });
    if (assignedCount > 0) {
      return res.status(409).json({
        message: `This user has ${assignedCount} task(s) assigned. Reassign or delete those tasks first.`,
      });
    }
    const reportCount = await User.countDocuments({
      manager: req.params.id,
    });
    if (reportCount > 0) {
      return res.status(409).json({
        message: `This user has ${reportCount} employee(s) reporting to them. Reassign those employees to a different manager first.`,
      });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({
      message: 'User deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete user',
      error: err.message,
    });
  }
});
module.exports = router;
