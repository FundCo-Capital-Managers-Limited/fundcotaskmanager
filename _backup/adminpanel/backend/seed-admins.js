import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

const seedVivian = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const data = {
      firstName: 'Vivian',
      lastName: 'Umeaku',
      email: 'vumeaku@fundco.ng',
      password: 'lead123',
      role: 'team-lead',
      position: 'Team Lead',
      unitSector: 'Finance',
    };

    // Delete any existing record with this email
    await User.deleteOne({ email: data.email.toLowerCase().trim() });
    console.log('🗑️  Old record deleted (if existed)');

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const vivian = new User({
      firstName: data.firstName,
      lastName: data.lastName,
      otherName: '',
      position: data.position,
      unitSector: data.unitSector,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: data.role,
      isActive: true,
      activityLogs: [],
    });

    await vivian.save();

    console.log('\n VIVIAN UMEAKU CREATED SUCCESSFULLY');
    console.log('══════════════════════════════════════');
    console.log('Email:    ', data.email);
    console.log('Password: ', data.password);
    console.log('Role:     ', data.role);
    console.log('Unit:     ', data.unitSector);
    console.log('══════════════════════════════════════');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedVivian();