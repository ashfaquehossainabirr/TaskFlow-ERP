require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const run = async () => {
  await connectDB();
  const existingMainAdmin = await User.findOne({
    isMainAdmin: true,
  });
  if (existingMainAdmin) {
    console.log(`Main admin already set: ${existingMainAdmin.email}. Nothing to do.`);
    process.exit(0);
  }
  const oldestAdmin = await User.findOne({
    role: 'admin',
  }).sort({
    createdAt: 1,
  });
  if (!oldestAdmin) {
    console.error('No admin account found. Run `npm run seed` first, then re-run this migration.');
    process.exit(1);
  }
  oldestAdmin.isMainAdmin = true;
  await oldestAdmin.save();
  console.log(`Promoted ${oldestAdmin.email} to main admin.`);
  process.exit(0);
};
run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
