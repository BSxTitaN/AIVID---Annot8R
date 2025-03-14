// src/middleware/auth.ts
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ObjectId } from 'mongodb';
import type { HonoContext, User } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { db } from '../config/index.js';
import { createMiddleware } from './core.js';

export const authenticate = createMiddleware(async (c: Context<HonoContext>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized: Missing or invalid token' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload?.sub) {
    throw new HTTPException(401, { message: 'Unauthorized: Invalid token' });
  }
  
  const database = db.getDb();
  const user = await database.collection<User>('users').findOne({
    _id: new ObjectId(payload.sub as string),
    isActive: true
  });
  
  if (!user) {
    throw new HTTPException(401, { message: 'Unauthorized: User not found or inactive' });
  }
  
  await database.collection('auth_tokens').updateOne(
    { token, isRevoked: false },
    { $set: { lastUsedAt: new Date() } }
  );
  
  c.set('user', user);
  c.set('requestStartTime', Date.now());
  
  await next();
});