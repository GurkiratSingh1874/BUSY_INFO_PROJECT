const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busy_info_db';
    if (!process.env.MONGO_URI) {
      console.warn('WARNING: MONGO_URI is not set in environment variables! Defaulting to local connection.');
    }
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Check your MONGO_URI and ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.');
  }
};

module.exports = connectDB;
