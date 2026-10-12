// Creates (or promotes) a superAdmin user directly in MongoDB.
// Needed because self-registration is disabled and admin creation via the
// API requires an existing admin — there is no bootstrap path otherwise.
//
// Usage:
//   MONGO_URI="<connection string>" node scripts/create-admin.mjs <email> <password> [role]
//
// role defaults to "admin" (superAdmin). Valid roles: standard, team-lead, executive, admin.
// Run this from the backend/ directory so it can resolve its dependencies (mongoose, bcryptjs).

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const [, , email, password, role = 'admin'] = process.argv;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Set MONGO_URI in the environment before running this script.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage: MONGO_URI="..." node scripts/create-admin.mjs <email> <password> [role]');
  process.exit(1);
}
if (!['standard', 'team-lead', 'executive', 'admin'].includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: standard, team-lead, executive, admin.`);
  process.exit(1);
}

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('BootstrapUser', userSchema);

const run = async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    await User.updateOne({ email: normalizedEmail }, { $set: { password: hash, role, isActive: true } });
    console.log(`Updated existing user: ${normalizedEmail} -> role "${role}"`);
  } else {
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: normalizedEmail,
      password: hash,
      role,
      isActive: true,
      createdAt: new Date(),
    });
    console.log(`Created new user: ${normalizedEmail} -> role "${role}"`);
  }

  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
