const User = require('../models/User');

const seedUsers = async () => {
  try {
    // Check if any users exist
    const count = await User.countDocuments();
    if (count > 0) {
      console.log('Database already has users. Skipping seeding.');
      return;
    }

    // Passwords read from environment variables or safe defaults
    const managerPassword = process.env.SEED_MANAGER_PASSWORD || 'manager123';
    const memberPassword = process.env.SEED_MEMBER_PASSWORD || 'member123';

    // Create seed data
    const users = [
      {
        email: 'manager@example.com',
        name: 'Admin Manager',
        password: managerPassword,
        role: 'manager',
      },
      {
        email: 'member1@example.com',
        name: 'Worker Alice',
        password: memberPassword,
        role: 'member',
      },
      {
        email: 'member2@example.com',
        name: 'Worker Bob',
        password: memberPassword,
        role: 'member',
      },
    ];

    // Insert seeded users
    await User.create(users);
    console.log('Database successfully seeded with default Manager and Member accounts.');
  } catch (error) {
    console.error(`Error seeding users: ${error.message}`);
  }
};

module.exports = seedUsers;
