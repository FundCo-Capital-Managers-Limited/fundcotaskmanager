import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/userModel.js';
import Task from './models/taskModel.js';

const FORCE = process.argv.includes('--force');

const ASSIGNED_BY_EMAIL = 'aoni@fundco.ng';

const TASKS = [
  {
    ownerEmail: 'aoni@fundco.ng',
    title: 'Check Foodelo project development data room',
    description:
      'Review the Foodelo project development data room to ensure project documents, updates, and supporting materials are organized, accessible, and up to date. Confirm that key project information needed for management oversight, stakeholder reviews, and operational continuity is available and properly maintained.',
    priority: 'High',
    dueDate: '2026-05-16T17:00:00.000Z',
    checklist: [
      {
        text: 'Review overall organization and completeness of the data room',
        completed: false,
      },
      {
        text: 'Confirm key project documents are up to date',
        completed: false,
      },
      {
        text: 'Check that recent progress updates and reports are included',
        completed: false,
      },
      {
        text: 'Verify important links and folders are accessible',
        completed: false,
      },
      {
        text: 'Identify any missing or outdated information',
        completed: false,
      },
      {
        text: 'Ensure action items and pending deliverables are clearly tracked',
        completed: false,
      },
      {
        text: 'Note any risks, blockers, or follow-up requirements',
        completed: false,
      },
      {
        text: 'Prepare a brief summary for management review',
        completed: false,
      },
    ],
  },
];

const requireForce = () => {
  if (FORCE) return;
  console.log('Dry run only. Add --force to write tasks to the database.');
  process.exit(0);
};

const resolveUserByEmail = async (email) => {
  const user = await User.findOne({
    email: String(email || '').trim().toLowerCase(),
  }).select('_id email fullName position unitSector role');

  if (!user) throw new Error(`User not found for email: ${email}`);
  return user;
};

const main = async () => {
  requireForce();
  await connectDB();

  const assignedBy = await resolveUserByEmail(ASSIGNED_BY_EMAIL);

  let created = 0;
  let skippedExisting = 0;

  for (const task of TASKS) {
    const owner = await resolveUserByEmail(task.ownerEmail);

    const existing = await Task.findOne({
      owner: owner._id,
      title: task.title,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    }).select('_id');

    if (existing) {
      skippedExisting += 1;
      console.log(`Skipping existing task: ${task.title} -> ${owner.email}`);
      continue;
    }

    await Task.create({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      owner: owner._id,
      checklist: Array.isArray(task.checklist) ? task.checklist : [],
      createdByAdmin: true,
      assignedBy: assignedBy._id,
    });

    created += 1;
    console.log(
      `Created task: ${task.title} -> ${owner.email} | assigned by ${assignedBy.email}`
    );
  }

  console.log(
    `Done. Created ${created} task(s). Skipped existing: ${skippedExisting}.`
  );

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('seed-tasks failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});