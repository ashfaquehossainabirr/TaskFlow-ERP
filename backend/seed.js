require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const run = async () => {
  await connectDB();
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@taskflow.com').toLowerCase();
  const existing = await User.findOne({
    email,
  });
  if (existing) {
    console.log(`Admin account already exists for ${email}. Skipping seed.`);
    process.exit(0);
  }
  const admin = await User.create({
    name: process.env.SEED_ADMIN_NAME || 'Admin User',
    email,
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
    isMainAdmin: true,
  });
  console.log('Admin account created:');
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'}`);
  console.log('This account is the main admin - it is the only account that can create/delete');
  console.log("other admins or change another admin's password. Log in and change this password.");
  process.exit(0);
};
run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
