// src/middleware/logger.ts
import type { Context, Next } from 'hono';
import { type HonoContext, type ActivityLog, ActivityAction } from '../types/index.js';
import { db } from '../config/index.js';
import { createMiddleware } from './core.js';

// Action mapping based on path patterns and methods
const ACTION_MAPPINGS = [
  // User Management
  { pattern: /\/users/, method: 'POST', action: ActivityAction.USER_CREATED },
  { pattern: /\/users/, method: 'PATCH', action: ActivityAction.USER_UPDATED },
  { pattern: /\/users/, method: 'DELETE', action: ActivityAction.USER_DELETED },
  { pattern: /\/users.*\/reset-password/, method: 'POST', action: ActivityAction.PASSWORD_RESET },
  
  // Admin Management
  { pattern: /\/admins/, method: 'POST', action: ActivityAction.USER_CREATED },
  { pattern: /\/admins/, method: 'PATCH', action: ActivityAction.USER_UPDATED },
  { pattern: /\/admins/, method: 'DELETE', action: ActivityAction.USER_DELETED },
  { pattern: /\/admins.*\/reset-password/, method: 'POST', action: ActivityAction.PASSWORD_RESET },
  
  // Authentication
  { pattern: /\/auth\/login/, method: 'POST', action: ActivityAction.USER_LOGIN },
  { pattern: /\/auth\/logout/, method: 'POST', action: ActivityAction.USER_LOGOUT },
  
  // Projects
  { pattern: /\/projects$/, method: 'POST', action: ActivityAction.PROJECT_CREATED },
  { pattern: /\/projects\/[^\/]+$/, method: 'PATCH|PUT', action: ActivityAction.PROJECT_UPDATED },
  { pattern: /\/projects\/[^\/]+$/, method: 'DELETE', action: ActivityAction.PROJECT_DELETED },
  
  // Images
  { pattern: /\/images\/upload/, method: 'POST', action: ActivityAction.IMAGES_UPLOADED },
  { pattern: /\/images\/[^\/]+$/, method: 'DELETE', action: ActivityAction.IMAGE_DELETED },
  
  // Assignments, Annotations, etc...
  // Add other mappings similarly...
];

export const logActivity = createMiddleware(async (c: Context<HonoContext>, next: Next) => {
  const startTime = c.get('requestStartTime') || Date.now();
  await next();
  
  const user = c.get('user');
  if (!user) return;
  
  const project = c.get('project');
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  
  // Determine action from mappings
  let action = ActivityAction.UNKNOWN_EVENT;
  for (const mapping of ACTION_MAPPINGS) {
    if (mapping.pattern.test(path) && 
        (mapping.method === method || mapping.method.includes(method))) {
      action = mapping.action;
      break;
    }
  }
  
  const database = db.getDb();
  const log: Omit<ActivityLog, '_id'> = {
    userId: user._id,
    projectId: project?._id,
    timestamp: new Date(),
    action,
    apiPath: path,
    method,
    userIp: c.req.header('X-Forwarded-For') || 
            c.req.header('X-Real-IP') || 
            c.req.header('CF-Connecting-IP') || 
            '0.0.0.0',
    userAgent: c.req.header('User-Agent') || '',
    details: {
      responseTime: Date.now() - startTime,
      status: c.res.status,
    },
  };
  
  await database.collection('activity_logs').insertOne(log);
});