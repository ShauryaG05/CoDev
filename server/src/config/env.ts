import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/codev',
  JWT_SECRET: process.env.JWT_SECRET || 'codev_dev_access_secret_super_secure_key_12345',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'codev_dev_refresh_secret_super_secure_key_67890',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  REDIS_URL: process.env.REDIS_URL || '',
  PERSIST_DEBOUNCE_MS: parseInt(process.env.PERSIST_DEBOUNCE_MS || '500', 10),
  SNAPSHOT_EVERY: parseInt(process.env.SNAPSHOT_EVERY || '200', 10),
  MAX_FILE_BYTES: parseInt(process.env.MAX_FILE_BYTES || '1048576', 10),
};
