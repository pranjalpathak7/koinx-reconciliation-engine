import mongoose from 'mongoose';
import { logger } from './logger.js';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/koinx-recon-db';
    const conn = await mongoose.connect(mongoUri);
    logger.info(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};