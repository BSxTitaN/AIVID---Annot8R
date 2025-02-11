// src/config/mongo.ts
import { MongoClient } from 'mongodb';
import { env } from './env.js';
import type { Admin, WebUser } from '../types/auth.types.js';
import type { SecurityLog } from '../types/log.types.js';

const client = new MongoClient(env.MONGODB_URI);

try {
  await client.connect();
  console.log('Successfully connected to MongoDB');
  
  const adminCount = await client.db('annot8r').collection('admins').countDocuments();
  console.log('Number of admins in database:', adminCount);
} catch (error) {
  console.error('MongoDB connection error:', error);
}

export const db = client.db('annot8r');
export const WebUsers = db.collection<WebUser>('web_users');
export const Admins = db.collection<Admin>('admins');
export const SecurityLogs = db.collection<SecurityLog>('security_logs');