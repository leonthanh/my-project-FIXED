const sequelize = require('../db');
const User = require('../models/User');

async function resetDatabase() {
  try {
    // Force sync will drop the table if it exists
    await User.sync({ force: true });
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();