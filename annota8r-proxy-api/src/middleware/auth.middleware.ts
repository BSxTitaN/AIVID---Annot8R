// src/middleware/auth.middleware.ts
import type { Next } from 'hono';
import { WebUsers, Admins } from '../config/mongo.js';
import { AuthService } from '../services/auth.service.js';
import { UserRole } from '../types/auth.types.js';

export async function webAuthMiddleware(c: any, next: Next) {
  const startTime = Date.now();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const endpoint = c.req.path;
  
  console.log('Auth middleware check:', {
    token: token ? 'provided' : 'missing',
    userAgent,
    endpoint,
  });
  
  if (!token) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  // First check web users
  const webUser = await WebUsers.findOne({ accessToken: token });
  if (webUser) {
    const isValid = await AuthService.verifyRequest(token, ip, userAgent, endpoint, startTime);
    if (!isValid) {
      return c.json({ error: 'Unauthorized - Invalid token or device mismatch' }, 401);
    }

    c.set("user", webUser);
  } else {
    // Check if it's an admin token
    const admin = await Admins.findOne({ accessToken: token });
    if (!admin) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // For admins, just verify token expiry
    if (!admin.tokenExpiry || new Date() > admin.tokenExpiry) {
      return c.json({ error: 'Unauthorized - Token expired' }, 401);
    }

    c.set("adminUser", admin);
  }
  
  await next();
}

export async function adminAuthMiddleware(c: any, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const admin = await Admins.findOne({ accessToken: token });
  if (!admin || !admin.tokenExpiry || new Date() > admin.tokenExpiry) {
    return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401);
  }

  c.set("adminUser", admin);

  await next();
}

// Helper to get user info from token
export async function getUserFromToken(token: string): Promise<{
  username: string;
  role: UserRole;
  deviceInfo?: any;
} | null> {
  // Check web users first
  const webUser = await WebUsers.findOne({ accessToken: token });
  if (webUser) {
    return {
      username: webUser.username,
      role: UserRole.USER,
      deviceInfo: webUser.activeDevice
    };
  }

  // Check admins
  const admin = await Admins.findOne({ accessToken: token });
  if (admin) {
    return {
      username: admin.username,
      role: UserRole.ADMIN
    };
  }

  return null;
}