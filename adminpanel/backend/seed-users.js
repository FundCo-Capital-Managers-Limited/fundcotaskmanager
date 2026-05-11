import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

const seedNormalUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const defaultPassword = 'user123';   // You can change this if you want

    const usersToCreate = [
      { firstName: 'Abdulateef', lastName: 'Adekunle', email: 'aanjorin@electrifymicrogrid.ng' },
      { firstName: 'Achadu Onazi', lastName: 'Eunice', email: 'aonazie@electrifymicrogrid.ng' },
      { firstName: 'Dauda Ijai', lastName: 'Gadzama', email: 'dauda.g@electrifymicrogrid.ng' },
      { firstName: 'Emmanuel', lastName: 'Ogwuche', email: 'eogwuche@electrifymicrogrid.ng' },
      { firstName: 'Israel', lastName: 'Akomodesegbe', email: 'iakomodesegbe@electrifymicrogrid.ng' },
      { firstName: 'Margaret', lastName: 'Gabe-Oji', email: 'mgabeoji@electrifymicrogrid.ng' },
      { firstName: 'Tolulope', lastName: 'Omodele', email: 'otolulope@electrifymicrogrid.ng' },
      { firstName: 'Taiwo', lastName: 'Popoola', email: 'tpopoola@electrifymicrogrid.ng' },
      { firstName: 'Victor', lastName: 'Esang', email: 'vesang@electrifymicrogrid.ng' },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const data of usersToCreate) {
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        console.log(`⏭️  Skipped - Already exists: ${normalizedEmail}`);
        skippedCount++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const newUser = new User({
        firstName: data.firstName,
        lastName: data.lastName,
        otherName: '',
        position: data.position || '',
        unitSector: '',
        email: normalizedEmail,
        password: hashedPassword,
        role: 'standard',           // Normal user (not admin)
        isActive: true,
        activityLogs: [],
      });

      await newUser.save();
      console.log(`✅ Created user: ${normalizedEmail}`);
      createdCount++;
    }

    console.log('\n🎉 SEEDING COMPLETED!');
    console.log('══════════════════════════════════════');
    console.log(`Total users processed : ${usersToCreate.length}`);
    console.log(`New users created    : ${createdCount}`);
    console.log(`Skipped (already exist): ${skippedCount}`);
    console.log(`Default password     : ${defaultPassword}`);
    console.log('══════════════════════════════════════');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedNormalUsers();