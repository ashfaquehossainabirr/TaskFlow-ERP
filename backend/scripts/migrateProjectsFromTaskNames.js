require('dotenv').config();
const connectDB = require('../config/db');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const run = async () => {
  await connectDB();
  const admin = await User.findOne({
    role: 'admin',
  }).sort({
    createdAt: 1,
  });
  if (!admin) {
    console.error('No admin user found. Run `npm run seed` first, then re-run this migration.');
    process.exit(1);
  }
  const rawTasks = await Task.collection
    .find({
      projectName: {
        $exists: true,
      },
      project: {
        $exists: false,
      },
    })
    .toArray();
  if (rawTasks.length === 0) {
    console.log('Nothing to migrate — every task already references a Project document.');
    process.exit(0);
  }
  const names = [...new Set(rawTasks.map((t) => t.projectName).filter(Boolean))];
  console.log(`Found ${names.length} distinct project name(s) across ${rawTasks.length} task(s) to migrate.`);
  const nameToId = {};
  for (const name of names) {
    let project = await Project.findOne({
      name,
    });
    if (!project) {
      project = await Project.create({
        name,
        createdBy: admin._id,
      });
      console.log(`  Created project "${name}"`);
    } else {
      console.log(`  Reusing existing project "${name}"`);
    }
    nameToId[name] = project._id;
  }
  let updated = 0;
  for (const t of rawTasks) {
    if (!t.projectName || !nameToId[t.projectName]) continue;
    await Task.collection.updateOne(
      {
        _id: t._id,
      },
      {
        $set: {
          project: nameToId[t.projectName],
        },
        $unset: {
          projectName: '',
        },
      }
    );
    updated++;
  }
  console.log(`Migrated ${updated} task(s) to reference their new Project document.`);
  console.log('Done. You can now use the Projects page in the app.');
  process.exit(0);
};
run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
