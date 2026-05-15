import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/userModel.js';
import Task from './models/taskModel.js';

const FORCE = process.argv.includes('--force');

const ASSIGNED_BY_EMAIL = 'oluwaseun.odufisan@gmail.com';
const FINANCE_LEAD_EMAIL = 'vumeaku@fundco.ng';

const TASKS = [
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide portfolio and asset data for FundCo AI finance implementation',
    description:
      'Compile and provide the complete portfolio and asset data required to build a centralized finance and portfolio management view inside FundCo AI. This information will be used to structure all AssetCos, projects, investments, classifications, ownership structures, and asset status tracking within the system.',
    priority: 'High',
    dueDate: '2026-05-18T17:00:00.000Z',
    checklist: [
      { text: 'Provide list of all AssetCos', completed: false },
      { text: 'Provide list of all projects', completed: false },
      { text: 'Provide list of all investments', completed: false },
      { text: 'Classify assets/projects by type, sector, or structure', completed: false },
      { text: 'Provide current status of each asset or project, including active, pipeline, completed, or other applicable status', completed: false },
      { text: 'Provide ownership structure for each asset or project where applicable', completed: false },
      { text: 'Confirm that the portfolio and asset data is accurate and ready for system structuring', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide project financial structure documentation',
    description:
      'Compile and provide the financial structure for each project to support project-level financial tracking inside FundCo AI. This will help the system map capital deployed, cost categories, and funding structures across projects and AssetCos.',
    priority: 'High',
    dueDate: '2026-05-18T17:00:00.000Z',
    checklist: [
      { text: 'Provide capital deployed per project', completed: false },
      { text: 'Provide high-level CAPEX categories per project', completed: false },
      { text: 'Provide high-level OPEX categories per project', completed: false },
      { text: 'Document funding structure for each project', completed: false },
      { text: 'Indicate whether each project is funded by equity, debt, mixed funding, or another structure', completed: false },
      { text: 'Confirm whether financial structures differ across AssetCos or project types', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide revenue and returns mapping framework',
    description:
      'Provide the revenue and returns mapping framework required to configure income tracking, collections, and return analysis inside FundCo AI. This will allow the system to understand how each asset generates income and how returns are measured internally.',
    priority: 'High',
    dueDate: '2026-05-19T17:00:00.000Z',
    checklist: [
      { text: 'Provide revenue structure per project', completed: false },
      { text: 'Document how each asset generates income', completed: false },
      { text: 'Provide payment or collection structure for each project', completed: false },
      { text: 'Provide payment timelines and collection frequency where applicable', completed: false },
      { text: 'Provide expected returns framework used internally', completed: false },
      { text: 'Document ROI logic where applicable', completed: false },
      { text: 'Document IRR logic where applicable', completed: false },
      { text: 'Document payback logic where applicable', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide cash flow and liquidity structure',
    description:
      'Compile and provide the cash flow and liquidity management structure required to configure liquidity visibility, cash inflow tracking, cash outflow tracking, and treasury oversight across projects and AssetCos inside FundCo AI.',
    priority: 'High',
    dueDate: '2026-05-19T17:00:00.000Z',
    checklist: [
      { text: 'Document how cash inflows are currently tracked', completed: false },
      { text: 'Document how cash outflows are currently tracked', completed: false },
      { text: 'Provide treasury management approach across projects or AssetCos', completed: false },
      { text: 'Document any central liquidity control structure currently in place', completed: false },
      { text: 'Identify liquidity reporting gaps or manual processes currently used', completed: false },
      { text: 'Confirm how liquidity should be monitored inside FundCo AI', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide repayment and obligations tracking structure',
    description:
      'Provide repayment and obligation tracking information needed to configure repayment schedules, payment timelines, delays, defaults, and financial obligation monitoring inside FundCo AI.',
    priority: 'High',
    dueDate: '2026-05-20T17:00:00.000Z',
    checklist: [
      { text: 'Provide existing repayment structures where applicable', completed: false },
      { text: 'Provide payment schedules for relevant projects or investments', completed: false },
      { text: 'Provide repayment timelines', completed: false },
      { text: 'Document how repayment delays are currently tracked', completed: false },
      { text: 'Document how defaults are currently tracked', completed: false },
      { text: 'Identify any obligations that require automated reminders or escalation', completed: false },
      { text: 'Confirm required reporting format for repayment and obligation tracking', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide portfolio performance tracking framework',
    description:
      'Provide the financial KPI and performance tracking framework required to monitor portfolio performance across all assets, projects, and AssetCos inside FundCo AI.',
    priority: 'High',
    dueDate: '2026-05-20T17:00:00.000Z',
    checklist: [
      { text: 'Provide key financial KPIs used to monitor portfolio performance', completed: false },
      { text: 'Provide existing portfolio performance reporting formats where available', completed: false },
      { text: 'Document how portfolio performance is currently reviewed', completed: false },
      { text: 'Specify whether reviews are weekly, monthly, quarterly, or another frequency', completed: false },
      { text: 'Identify current performance review owners or approvers', completed: false },
      { text: 'Confirm KPIs required for real-time performance tracking in FundCo AI', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide finance reporting requirements and templates',
    description:
      'Provide the reporting requirements needed to configure dashboards, PDF reports, Excel exports, executive-level reports, and internal finance reporting templates inside FundCo AI.',
    priority: 'High',
    dueDate: '2026-05-21T17:00:00.000Z',
    checklist: [
      { text: 'Define expected dashboard reporting requirements', completed: false },
      { text: 'Define expected PDF report outputs', completed: false },
      { text: 'Define expected Excel export formats', completed: false },
      { text: 'Provide executive-level reporting expectations', completed: false },
      { text: 'Provide existing internal reporting templates where available', completed: false },
      { text: 'Confirm reporting frequency for each required report', completed: false },
      { text: 'Confirm who should receive or approve each report type', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide finance system integration requirements',
    description:
      'Provide details of current finance, accounting, and tracking systems so FundCo AI can be designed to support integration, data import, data export, and future automation across finance and portfolio workflows.',
    priority: 'Medium',
    dueDate: '2026-05-21T17:00:00.000Z',
    checklist: [
      { text: 'List current systems used for accounting', completed: false },
      { text: 'List current systems used for project or portfolio tracking', completed: false },
      { text: 'Document whether data is currently stored in Excel, accounting software, databases, or other systems', completed: false },
      { text: 'Provide preferred data import format', completed: false },
      { text: 'Provide preferred data export format', completed: false },
      { text: 'Identify integration constraints or access limitations', completed: false },
      { text: 'Confirm whether system integration is required in the first implementation phase or later', completed: false },
    ],
  },
  {
    ownerEmail: FINANCE_LEAD_EMAIL,
    title: 'Provide scenario and sensitivity analysis inputs',
    description:
      'Provide the scenario and sensitivity analysis inputs required to configure decision-support tools inside FundCo AI. This will enable the system to model financial outcomes, test assumptions, and support portfolio-level decision-making.',
    priority: 'Medium',
    dueDate: '2026-05-22T17:00:00.000Z',
    checklist: [
      { text: 'Provide key variables typically adjusted during financial analysis', completed: false },
      { text: 'Provide standard scenarios used for decision-making', completed: false },
      { text: 'Document sensitivity assumptions commonly used internally', completed: false },
      { text: 'Identify project-level variables that should be adjustable in the system', completed: false },
      { text: 'Identify portfolio-level variables that should be adjustable in the system', completed: false },
      { text: 'Confirm required outputs from scenario and sensitivity analysis', completed: false },
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
  const financeLead = await resolveUserByEmail(FINANCE_LEAD_EMAIL);

  console.log(
    `Finance implementation tasks will be assigned to Finance Lead: ${
      financeLead.fullName || financeLead.email
    } <${financeLead.email}>`
  );

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
    console.log(`Created task: ${task.title} -> ${owner.email}`);
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