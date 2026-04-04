const mongoose = require('mongoose');

/**
 * Database Reset Script
 * Drops the entire database and recreates it cleanly
 * Run with: node src/seeders/resetDatabase.js
 */

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Smart Kirana');
    console.log('✅ Connected to MongoDB');

    // Drop the entire database
    await mongoose.connection.db.dropDatabase();
    console.log('🗑️ Database dropped successfully');

    console.log('✅ Database reset completed successfully!');
    console.log('🚀 You can now run the seeder: npm run seed');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

// Run reset if called directly
if (require.main === module) {
  require('dotenv').config();
  resetDatabase();
}

module.exports = { resetDatabase };
