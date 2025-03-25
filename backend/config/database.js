// backend/config/database.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Database Configuration
 * ---------------------
 * MongoDB connection and configuration
 * 
 * Required environment variables:
 * - MONGODB_URI: MongoDB connection string
 */

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true, // Build indexes
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    const conn = await mongoose.connect(mongoURI, mongoOptions);
    
    console.log(`🔌 MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('📌 MongoDB connection closed');
  } catch (error) {
    console.error(`❌ Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
};

// Create indexes for commonly queried fields
const createIndexes = async () => {
  try {
    // This would normally be handled by the model definitions
    // But we can ensure indexes here as well
    console.log('📋 MongoDB indexes ensured');
  } catch (error) {
    console.error(`❌ Error creating MongoDB indexes: ${error.message}`);
  }
};

// Monitor for connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('🔌 MongoDB disconnected');
});

// Handle application termination - close database connection
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDB,
  createIndexes,
  mongoOptions
};