// src/routes/auth.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WebUsers } from '../config/mongo.js';
import { AuthService } from '../services/auth.service.js';
import { webAuthMiddleware } from '../middleware/auth.middleware.js';
import type { 
  Admin, 
  WebUser 
} from '../types/auth.types.js';

// Define context variable types
type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceInfo: z.object({
    platform: z.string(),
    screenResolution: z.string(),
    language: z.string(),
    timezone: z.string()
  }).optional()
});

// Get current user info
app.get('/me', webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const userInfo = await AuthService.getUserInfo(token);
    if (!userInfo) {
      return c.json({ error: 'User not found' }, 401);
    }

    return c.json(userInfo);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return c.json({ error: 'Failed to fetch user info' }, 500);
  }
});

// Login endpoint
app.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { username, password, deviceInfo } = await c.req.json();
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    // First check web users
    const webUser = await WebUsers.findOne({ username });
    if (webUser) {
      const result = await AuthService.loginWebUser(
        username,
        password,
        ip,
        userAgent,
        JSON.stringify(deviceInfo || {})
      );

      if (!result) {
        return c.json({ error: 'Invalid credentials or account locked' }, 401);
      }

      return c.json(result);
    }

    // Then check admins
    const result = await AuthService.loginAdmin(username, password, ip, userAgent);
    if (!result) {
      return c.json({ error: 'Invalid credentials or account locked' }, 401);
    }

    return c.json(result);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Verify token
app.post('/verify', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const deviceInfo = await c.req.json();

    const verificationResult = await AuthService.verifyToken(token, ip, userAgent, deviceInfo);
    if (!verificationResult.valid) {
      return c.json({ error: verificationResult.error }, 401);
    }

    return c.json({ 
      valid: true, 
      role: verificationResult.role 
    });
  } catch (error) {
    console.error('Verification error:', error);
    return c.json({ error: 'Failed to verify token' }, 500);
  }
});

// Refresh token
app.post('/refresh', webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const refreshedToken = await AuthService.refreshToken(token);
    if (!refreshedToken) {
      return c.json({ error: 'Failed to refresh token' }, 401);
    }

    return c.json(refreshedToken);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return c.json({ error: 'Failed to refresh token' }, 500);
  }
});

// Logout endpoint
app.post('/logout', webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const success = await AuthService.logout(token);
    if (!success) {
      return c.json({ error: 'Failed to logout' }, 500);
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    return c.json({ error: 'Failed to process logout request' }, 500);
  }
});

export { app as authRoutes };