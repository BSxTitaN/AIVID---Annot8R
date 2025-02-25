// src/routes/log.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SecurityLogService } from '../services/log.service.js';
import { adminAuthMiddleware, webAuthMiddleware } from '../middleware/auth.middleware.js';
import { SecurityLogType } from '../types/log.types.js';
import type { Admin, WebUser } from '../types/auth.types.js';

// Define context variable types
type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const securityEventSchema = z.object({
  logType: z.nativeEnum(SecurityLogType),
  keyPressed: z.string().optional(),
  additionalInfo: z.string().optional()
});

// Log security event (from client)
app.post('/events', webAuthMiddleware, zValidator('json', securityEventSchema), async (c) => {
  try {
    const body = await c.req.json();
    const { logType, keyPressed, additionalInfo } = body;

    // Get user info from request
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const path = c.req.path;

    // Get user from context
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const success = await SecurityLogService.logSecurityEvent(
      user.username,
      logType,
      {
        userAgent,
        ip,
        path,
        keyPressed,
        additionalInfo,
        deviceInfo: user.activeDevice?.fingerprint
      }
    );

    if (!success) {
      return c.json({ error: 'Failed to log security event' }, 500);
    }

    return c.json({ success: true, message: 'Security event logged successfully' });
  } catch (error) {
    console.error('Error logging security event:', error);
    return c.json({ error: 'Failed to process security event' }, 500);
  }
});

// Get security logs with filtering (admin only)
app.get('/', adminAuthMiddleware, async (c) => {
  try {
    const {
      userId,
      logType,
      startDate,
      endDate,
      ip,
      page,
      limit
    } = c.req.query();

    const filters = {
      userId,
      logType: logType as SecurityLogType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      ip,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    };

    const logs = await SecurityLogService.getSecurityLogs(filters);
    return c.json(logs);
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return c.json({ error: 'Failed to fetch security logs' }, 500);
  }
});

// Get security statistics (admin only)
app.get('/stats', adminAuthMiddleware, async (c) => {
  try {
    const timeframe = parseInt(c.req.query('timeframe') || '24');
    const stats = await SecurityLogService.getSecurityStats(timeframe);
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching security stats:', error);
    return c.json({ error: 'Failed to fetch security stats' }, 500);
  }
});

// Get user security summary (admin only)
app.get('/users/:userId', adminAuthMiddleware, async (c) => {
  try {
    const userId = c.req.param('userId');
    const summary = await SecurityLogService.getUserSecuritySummary(userId);
    return c.json(summary);
  } catch (error) {
    console.error('Error fetching user security summary:', error);
    return c.json({ error: 'Failed to fetch user security summary' }, 500);
  }
});

// Get admin logs (super admin only)
app.get('/admins/:adminId', adminAuthMiddleware, async (c) => {
  try {
    const adminId = c.req.param('adminId');
    const { page = "1", limit = "20" } = c.req.query();

    // Verify super admin status using the token
    const requestingAdmin = c.get('adminUser');

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ error: 'Only super admins can view admin logs' }, 403);
    }

    // Get admin's logs
    const logs = await SecurityLogService.getSecurityLogs({
      userId: adminId,
      page: parseInt(page),
      limit: parseInt(limit),
      // Add filter for admin-specific log types
      logType: [
        SecurityLogType.ADMIN_LOGIN,
        SecurityLogType.ADMIN_CREATED,
        SecurityLogType.ADMIN_DELETED,
        SecurityLogType.ADMIN_PASSWORD_RESET,
        SecurityLogType.ADMIN_REVOKED,
        SecurityLogType.USER_CREATED,
        SecurityLogType.USER_UPDATED,
        SecurityLogType.USER_DELETED,
        SecurityLogType.ACCOUNT_LOCKED,
        SecurityLogType.ACCOUNT_UNLOCKED
      ]
    });

    return c.json(logs);
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    return c.json({ error: 'Failed to fetch admin logs' }, 500);
  }
});

export { app as logRoutes };