// src/routes/user.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WebUsers } from '../config/mongo.js';
import { SecurityLogService } from '../services/log.service.js';
import { SecurityLogType } from '../types/log.types.js';
import { AuthService } from '../services/auth.service.js';
import { adminAuthMiddleware, webAuthMiddleware } from '../middleware/auth.middleware.js';
import type { Admin, WebUser } from '../types/auth.types.js';

// Define context variable types
type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  isOfficeUser: z.boolean().default(false)
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8)
});

const lockUserSchema = z.object({
  reason: z.string().optional()
});

const officeStatusSchema = z.object({
  isOfficeUser: z.boolean()
});

// List all users (admin only)
app.get('/', adminAuthMiddleware, async (c) => {
  try {
    const users = await WebUsers.find({}).toArray();
    
    // Filter sensitive information
    const filteredUsers = users.map(user => ({
      username: user.username,
      isLocked: user.isLocked,
      lockReason: user.lockReason,
      lastLoginAttempt: user.lastLoginAttempt,
      failedLoginAttempts: user.failedLoginAttempts,
      isOfficeUser: user.isOfficeUser,
      activeDevice: user.activeDevice ? {
        lastSeen: user.activeDevice.lastSeen,
        ip: user.activeDevice.ip,
        userAgent: user.activeDevice.userAgent
      } : null,
      activityLog: user.activityLog || []
    }));
    
    return c.json({ users: filteredUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Create user (admin only)
app.post('/', adminAuthMiddleware, zValidator('json', createUserSchema), async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const { username, password, isOfficeUser } = await c.req.json();

    const success = await AuthService.createWebUser(username, password, isOfficeUser);
    if (!success) {
      return c.json({ error: 'Username already exists' }, 409);
    }

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.USER_CREATED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Created user: ${username}`
      }
    );

    return c.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('User creation error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// Get user details
app.get('/:userId', adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('userId');
    const user = await WebUsers.findOne({ username });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Filter sensitive information
    const filteredUser = {
      username: user.username,
      isLocked: user.isLocked,
      lockReason: user.lockReason,
      lastLoginAttempt: user.lastLoginAttempt,
      failedLoginAttempts: user.failedLoginAttempts,
      isOfficeUser: user.isOfficeUser,
      activeDevice: user.activeDevice ? {
        lastSeen: user.activeDevice.lastSeen,
        ip: user.activeDevice.ip,
        userAgent: user.activeDevice.userAgent
      } : null,
      activityLog: user.activityLog || []
    };
    
    return c.json({ user: filteredUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Delete user
app.delete('/:userId', adminAuthMiddleware, async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const username = c.req.param('userId');
    
    const success = await AuthService.deleteUser(username);
    if (!success) {
      return c.json({ error: 'User not found or could not be deleted' }, 404);
    }
    
    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.USER_DELETED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Deleted user: ${username}`
      }
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Reset password (admin only)
app.put('/:userId/password', adminAuthMiddleware, zValidator('json', resetPasswordSchema), async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const username = c.req.param('userId');
    const { newPassword } = await c.req.json();

    const success = await AuthService.resetUserPasswordAdmin(username, newPassword);
    if (!success) {
      return c.json({ error: 'Failed to reset password or user not found' }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.PASSWORD_RESET,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Reset password for user: ${username}`
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// Lock/unlock user
app.put('/:userId/status', adminAuthMiddleware, zValidator('json', lockUserSchema), async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const username = c.req.param('userId');
    const { reason, action } = await c.req.json();
    
    let success: boolean;
    let logType: SecurityLogType;
    
    if (action === 'lock') {
      success = await AuthService.lockUser(username, reason);
      logType = SecurityLogType.ACCOUNT_LOCKED;
    } else if (action === 'unlock') {
      success = await AuthService.unlockUser(username);
      logType = SecurityLogType.ACCOUNT_UNLOCKED;
    } else {
      return c.json({ error: 'Invalid action. Must be "lock" or "unlock"' }, 400);
    }
    
    if (!success) {
      return c.json({ error: 'Failed to update user status or user not found' }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      logType,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `${action === 'lock' ? 'Locked' : 'Unlocked'} user: ${username}${reason ? ` - Reason: ${reason}` : ''}`
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    return c.json({ error: 'Failed to update user status' }, 500);
  }
});

// Force logout (terminate sessions)
app.delete('/:userId/sessions', adminAuthMiddleware, async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const username = c.req.param('userId');
    
    const success = await AuthService.forceLogoutUser(username);
    if (!success) {
      return c.json({ error: 'Failed to logout user or user not found' }, 404);
    }
    
    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.USER_LOGOUT,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Forced logout for user: ${username}`
      }
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error logging out user:', error);
    return c.json({ error: 'Failed to logout user' }, 500);
  }
});

// Get user logs
app.get('/:userId/logs', adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('userId');
    const { page = "1", limit = "50" } = c.req.query();
    
    const logs = await SecurityLogService.getSecurityLogs({
      userId: username,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    return c.json(logs);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    return c.json({ error: 'Failed to fetch user logs' }, 500);
  }
});

// Update office status
app.put('/:userId/office-status', adminAuthMiddleware, zValidator('json', officeStatusSchema), async (c) => {
  try {
    const adminUser = c.get('adminUser');
    const username = c.req.param('userId');
    const { isOfficeUser } = await c.req.json();
    
    // Update user's office status
    const result = await WebUsers.updateOne(
      { username },
      { $set: { isOfficeUser } }
    );
    
    if (result.matchedCount === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.USER_UPDATED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Updated office status for user: ${username} to ${isOfficeUser ? 'office user' : 'regular user'}`
      }
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating office status:', error);
    return c.json({ error: 'Failed to update office status' }, 500);
  }
});

// Get user's assigned projects
app.get('/:userId/projects', webAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('userId');
    
    // If a user is trying to access another user's projects, check admin access
    const requestUser = c.get('user');
    const requestAdmin = c.get('adminUser');
    
    if (requestUser && requestUser.username !== username && !requestAdmin) {
      return c.json({ error: 'Unauthorized access to other user\'s projects' }, 403);
    }
    
    // Fetch user's projects
    const userProjects = await AuthService.getUserProjects(username);
    
    return c.json({ success: true, projects: userProjects });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return c.json({ error: 'Failed to fetch user projects' }, 500);
  }
});

export { app as userRoutes };