const express = require('express');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        message: 'This account has been deactivated. Contact your admin.',
      });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error during login',
      error: err.message,
    });
  }
});
router.get('/me', protect, async (req, res) => {
  res.json({
    user: req.user.toSafeObject(),
  });
});
module.exports = router;
