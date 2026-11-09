import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDB(): Promise<typeof mongoose | null> {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err: any) {
    console.error(`[Database Error] Could not connect to MongoDB at ${ENV.MONGO_URI}:`, err.message);
    console.warn(`[Database Warning] The application will continue running. Please ensure MongoDB is running or update MONGO_URI in .env with your credentials.`);
    return null;
  }
}
