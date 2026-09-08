const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
    },
    isMainAdmin: {
      type: Boolean,
      default: false,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    minimumTarget: {
      type: Number,
      min: 0,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    designation: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time',
    },
    dateOfJoining: {
      type: Date,
      default: null,
    },
    monthlySalary: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isMainAdmin: this.isMainAdmin,
    manager: this.manager,
    department: this.department,
    minimumTarget: this.minimumTarget,
    isActive: this.isActive,
    designation: this.designation,
    phone: this.phone,
    employmentType: this.employmentType,
    dateOfJoining: this.dateOfJoining,
    monthlySalary: this.monthlySalary,
    createdAt: this.createdAt,
  };
};
module.exports = mongoose.model('User', userSchema);
