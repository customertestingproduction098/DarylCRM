require('dotenv').config();
const bcryptjs = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/User');

const seed = async () => {
  try {
    await connectDB();

    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
      process.exit(1);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`User ${email} already exists, skipping.`);
    } else {
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      await new User({
        firstName: 'Admin',
        lastName: 'User',
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }).save();
      console.log(`Created admin user: ${email}`);
    }

    console.log('Seed complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
