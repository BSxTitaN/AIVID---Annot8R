// src/routes/auth.routes.ts

import { Hono } from "hono";
import {
  adminAuthMiddleware,
  webAuthMiddleware,
} from "../middleware/auth.middleware.js";
import { WebUsers, Admins } from "../config/mongo.js";
import { SecurityLogService } from "../services/log.service.js";
import { SecurityLogType } from "../types/log.types.js";
import { AuthService } from "../services/auth.service.js";
import { UserRole } from "../types/auth.types.js";
import { S3Service } from "../services/s3.service.js";

const app = new Hono();

// Get user info for both users and admins
app.get("/auth/me", webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    const userInfo = await AuthService.getUserInfo(token);
    if (!userInfo) {
      return c.json({ error: "User not found" }, 401);
    }

    return c.json(userInfo);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return c.json({ error: "Failed to fetch user info" }, 500);
  }
});

// Unified login endpoint
app.post("/auth/login", async (c) => {
  try {
    const { username, password, deviceInfo } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Missing credentials" }, 400);
    }

    const userAgent = c.req.header("user-agent") || "unknown";
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    // First check if it's a web user
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
        return c.json({ error: "Invalid credentials or account locked" }, 401);
      }

      return c.json(result);
    }

    // If not a web user, try admin login
    const result = await AuthService.loginAdmin(
      username,
      password,
      ip,
      userAgent
    );

    if (!result) {
      return c.json({ error: "Invalid credentials or account locked" }, 401);
    }

    return c.json(result);
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Token verification endpoint
app.post("/auth/verify", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    const userAgent = c.req.header("user-agent") || "unknown";
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const deviceInfo = await c.req.json();

    // First check web users
    const webUser = await WebUsers.findOne({ accessToken: token });
    if (webUser) {
      const isValid = await AuthService.verifyRequest(
        token,
        ip,
        userAgent,
        c.req.path,
        Date.now()
      );

      if (!isValid) {
        return c.json({ error: "Invalid token or device mismatch" }, 401);
      }

      return c.json({ valid: true, role: UserRole.USER });
    }

    // Then check admins
    const admin = await Admins.findOne({ accessToken: token });
    if (admin && admin.tokenExpiry && new Date() < admin.tokenExpiry) {
      return c.json({ valid: true, role: UserRole.ADMIN });
    }

    return c.json({ error: "Invalid token" }, 401);
  } catch (error) {
    console.error("Verification error:", error);
    return c.json({ error: "Failed to verify token" }, 500);
  }
});

// Token refresh endpoint
app.post("/auth/refresh", webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    const newTokenData = await AuthService.refreshToken(token);
    if (!newTokenData) {
      return c.json({ error: "Failed to refresh token" }, 500);
    }

    return c.json(newTokenData);
  } catch (error) {
    console.error("Token refresh error:", error);
    return c.json({ error: "Failed to refresh token" }, 500);
  }
});

// Logout endpoint
app.post("/auth/logout", webAuthMiddleware, async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    const success = await AuthService.logout(token);
    if (!success) {
      return c.json({ error: "Failed to logout" }, 500);
    }

    await SecurityLogService.logSecurityEvent(
      "user", // Generic user ID for logout
      SecurityLogType.USER_LOGOUT,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
      }
    );

    return c.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    return c.json({ error: "Failed to process logout request" }, 500);
  }
});

// Create web user (admin only)
app.post("/auth/users", adminAuthMiddleware, async (c) => {
  try {
    const { username, password, isOfficeUser } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Missing user details" }, 400);
    }

    if (password.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    const success = await AuthService.createWebUser(username, password, isOfficeUser);
    if (!success) {
      return c.json({ error: "Username already exists" }, 409);
    }

    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.USER_CREATED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
      }
    );

    return c.json({ message: "User created successfully" });
  } catch (error) {
    console.error("User creation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create admin (super admin only)
// In auth.routes.ts
app.post("/auth/create-admin", adminAuthMiddleware, async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Missing admin details" }, 400);
    }

    // Verify super admin status
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const requestingAdmin = await Admins.findOne({ accessToken: token });

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ error: "Only super admins can create new admins" }, 403);
    }

    if (password.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    // Log the attempt
    console.log('Creating admin:', { username }); // Add this for debugging

    const success = await AuthService.createAdmin(username, password);
    if (!success) {
      return c.json({ error: "Admin username already exists" }, 409);
    }

    // Log successful creation
    await SecurityLogService.logSecurityEvent(
      requestingAdmin.username,
      SecurityLogType.ADMIN_CREATED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
        additionalInfo: `Created admin: ${username}`,
      }
    );

    return c.json({ 
      success: true,
      message: "Admin created successfully" 
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    return c.json({ 
      success: false,
      error: "Internal server error" 
    }, 500);
  }
});

// Reset admin password (super admin only)
app.post("/auth/admin/reset-password", adminAuthMiddleware, async (c) => {
  try {
    const { username, newPassword } = await c.req.json();

    if (!username || !newPassword) {
      return c.json({ 
        success: false,
        error: "Missing required fields" 
      }, 400);
    }

    // Verify super admin status
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const requestingAdmin = await Admins.findOne({ accessToken: token });

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ 
        success: false,
        error: "Only super admins can reset admin passwords" 
      }, 403);
    }

    if (newPassword.length < 8) {
      return c.json({ 
        success: false,
        error: "Password must be at least 8 characters long" 
      }, 400);
    }

    const success = await AuthService.resetAdminPassword(username, newPassword);
    if (!success) {
      return c.json({ 
        success: false,
        error: "Failed to reset password or admin not found" 
      }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      requestingAdmin.username,
      SecurityLogType.ADMIN_PASSWORD_RESET,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        path: c.req.path,
        additionalInfo: `Reset password for admin: ${username}`
      }
    );

    return c.json({ 
      success: true,
      message: "Admin password reset successfully" 
    });
  } catch (error) {
    console.error("Error resetting admin password:", error);
    return c.json({ 
      success: false,
      error: "Internal server error" 
    }, 500);
  }
});

// Delete admin (super-admin only)
app.post('/auth/admins/:username/delete', adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('username');
    
    if (!username) {
      return c.json({ 
        success: false,
        error: 'Username is required' 
      }, 400);
    }

    // Verify super admin status
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const requestingAdmin = await Admins.findOne({ accessToken: token });
    
    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ 
        success: false,
        error: 'Only super admins can delete admins' 
      }, 403);
    }

    const success = await AuthService.deleteAdmin(username, requestingAdmin.username);
    if (!success) {
      return c.json({ 
        success: false,
        error: 'Failed to delete admin, admin not found, or cannot delete super admin' 
      }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      requestingAdmin.username,
      SecurityLogType.ADMIN_DELETED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Deleted admin: ${username}`
      }
    );

    return c.json({ 
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return c.json({ 
      success: false,
      error: 'Failed to delete admin'
    }, 500);
  }
});

// Revoke admin access (super admin only)
app.post("/auth/admin/revoke", adminAuthMiddleware, async (c) => {
  try {
    const { username } = await c.req.json();

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    // Verify super admin status
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const requestingAdmin = await Admins.findOne({ accessToken: token });

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json(
        { error: "Only super admins can revoke admin access" },
        403
      );
    }

    // Prevent self-revocation
    if (username === requestingAdmin.username) {
      return c.json({ error: "Cannot revoke your own admin access" }, 400);
    }

    const success = await AuthService.revokeAdmin(username);
    if (!success) {
      return c.json(
        { error: "Failed to revoke admin or admin not found" },
        404
      );
    }

    await SecurityLogService.logSecurityEvent(
      requestingAdmin.username,
      SecurityLogType.ADMIN_REVOKED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
        additionalInfo: `Revoked admin: ${username}`,
      }
    );

    return c.json({ message: "Admin access revoked successfully" });
  } catch (error) {
    console.error("Error revoking admin access:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// User password reset endpoint
app.post("/auth/reset-password", webAuthMiddleware, async (c) => {
  try {
    const { oldPassword, newPassword } = await c.req.json();
    const token = c.req.header("Authorization")?.replace("Bearer ", "");

    if (!oldPassword || !newPassword || !token) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    if (newPassword.length < 8) {
      return c.json(
        { error: "New password must be at least 8 characters long" },
        400
      );
    }

    const user = await WebUsers.findOne({ accessToken: token });
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const success = await AuthService.resetPassword(
      user.username,
      oldPassword,
      newPassword
    );

    if (!success) {
      return c.json({ error: "Invalid old password" }, 401);
    }

    await SecurityLogService.logSecurityEvent(
      user.username,
      SecurityLogType.PASSWORD_RESET,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
      }
    );

    return c.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Lock user (admin only)
app.post("/auth/lock-user", adminAuthMiddleware, async (c) => {
  try {
    const { username, reason } = await c.req.json();

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const success = await AuthService.lockUser(username, reason);
    if (!success) {
      return c.json({ error: "Failed to lock user or user not found" }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.ACCOUNT_LOCKED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
        additionalInfo: reason,
      }
    );

    return c.json({ message: "User locked successfully" });
  } catch (error) {
    console.error("Error locking user:", error);
    return c.json({ error: "Failed to process lock request" }, 500);
  }
});

// Unlock user (admin only)
app.post("/auth/unlock-user", adminAuthMiddleware, async (c) => {
  try {
    const { username } = await c.req.json();

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const success = await AuthService.unlockUser(username);
    if (!success) {
      return c.json({ error: "Failed to unlock user or user not found" }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.ACCOUNT_UNLOCKED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
      }
    );

    return c.json({ message: "User unlocked successfully" });
  } catch (error) {
    console.error("Error unlocking user:", error);
    return c.json({ error: "Failed to process unlock request" }, 500);
  }
});

// Get logs (admin only)
app.get("/auth/logs", adminAuthMiddleware, async (c) => {
  try {
    const {
      userId,
      logType,
      startDate,
      endDate,
      ip,
      page = "1",
      limit = "50",
    } = c.req.query();

    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    const logs = await SecurityLogService.getSecurityLogs({
      userId,
      logType: logType as SecurityLogType,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      ip,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return c.json(logs);
  } catch (error) {
    console.error("Error fetching security logs:", error);
    return c.json({ error: "Failed to fetch security logs" }, 500);
  }
});

// Get user security summary (admin only)
app.get("/auth/logs/user/:userId", adminAuthMiddleware, async (c) => {
  try {
    const userId = c.req.param("userId");
    const summary = await SecurityLogService.getUserSecuritySummary(userId);
    return c.json(summary);
  } catch (error) {
    console.error("Error fetching user security summary:", error);
    return c.json({ error: "Failed to fetch user security summary" }, 500);
  }
});

// Get security statistics (admin only)
app.get("/auth/logs/stats", adminAuthMiddleware, async (c) => {
  try {
    const timeframe = parseInt(c.req.query("timeframe") || "24");
    const stats = await SecurityLogService.getSecurityStats(timeframe);
    return c.json(stats);
  } catch (error) {
    console.error("Error fetching security stats:", error);
    return c.json({ error: "Failed to fetch security stats" }, 500);
  }
});

// Get all users with pagination and filters
app.get("/auth/users", adminAuthMiddleware, async (c) => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      status,
      sortField = "createdAt",
      sortOrder = "desc",
    } = c.req.query();

    const query: any = {};
    if (search) {
      query.username = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
      query.isLocked = status === "locked";
    }

    const users = await WebUsers.find(query)
      .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray();

    const total = await WebUsers.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    return c.json({
      users: users.map((user) => ({
        _id: user._id,
        username: user.username,
        isLocked: user.isLocked,
        isOfficeUser: user.isOfficeUser || false,  // Add this line
        lockReason: user.lockReason,
        lastLoginAttempt: user.lastLoginAttempt,
        failedLoginAttempts: user.failedLoginAttempts,
        activeDevice: user.activeDevice
          ? {
              lastSeen: user.activeDevice.lastSeen,
              ip: user.activeDevice.ip,
              userAgent: user.activeDevice.userAgent,
              deviceInfo: user.activeDevice.deviceInfo,
            }
          : null,
        sessionStatus: {
          isActive:
            !!user.accessToken &&
            user.tokenExpiry &&
            new Date(user.tokenExpiry) > new Date(),
          expiresAt: user.tokenExpiry,
        },
        activityLog: user.activityLog
          ?.slice(0, 5)
          .map((log) => ({
            timestamp: log.timestamp,
            action: log.action,
            ip: log.ip,
            endpoint: log.endpoint,
          })),
        rateLimit: {
          count: user.rateLimit?.count || 0,
          resetAt: user.rateLimit?.resetAt,
          isRateLimited: user.rateLimit?.count >= 60,
        },
        stats: {
          totalRequests: user.activityLog?.length || 0,
          lastActive: user.activeDevice?.lastSeen || user.lastLoginAttempt,
          failedAttempts: user.failedLoginAttempts,
          isLocked: user.isLocked,
          lockReason: user.lockReason,
        },
      })),
      pagination: {
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get specific user logs
app.get("/auth/users/:username/logs", adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param("username");
    const { page = "1", limit = "20" } = c.req.query();

    const logs = await SecurityLogService.getSecurityLogs({
      userId: username,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return c.json(logs);
  } catch (error) {
    console.error("Error fetching user logs:", error);
    return c.json({ error: "Failed to fetch user logs" }, 500);
  }
});

// Create project for user
app.post("/auth/users/:username/projects", adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param("username");
    const { projectName } = await c.req.json();

    if (!projectName) {
      return c.json({ error: "Project name is required" }, 400);
    }

    // Create project structure
    const success = await S3Service.createProjectStructure(
      username,
      projectName
    );

    if (!success) {
      return c.json({ error: "Failed to create project structure" }, 500);
    }

    return c.json({ message: "Project created successfully" });
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// Rename project
app.put(
  "/auth/users/:username/projects/:projectId",
  adminAuthMiddleware,
  async (c) => {
    try {
      const { username, projectId } = c.req.param();
      const { newName } = await c.req.json();

      if (!newName) {
        return c.json({ error: "New project name is required" }, 400);
      }

      const success = await S3Service.renameProject(
        username,
        projectId,
        newName
      );

      if (!success) {
        return c.json({ error: "Failed to rename project" }, 500);
      }

      return c.json({ message: "Project renamed successfully" });
    } catch (error) {
      console.error("Error renaming project:", error);
      return c.json({ error: "Failed to rename project" }, 500);
    }
  }
);

// Reset user password (admin version)
app.post(
  "/auth/users/:username/reset-password",
  adminAuthMiddleware,
  async (c) => {
    try {
      const username = c.req.param("username");
      const { newPassword } = await c.req.json();

      if (!newPassword || newPassword.length < 8) {
        return c.json(
          { error: "New password must be at least 8 characters long" },
          400
        );
      }

      const success = await AuthService.resetUserPasswordAdmin(
        username,
        newPassword
      );

      if (!success) {
        return c.json(
          { error: "Failed to reset password or user not found" },
          404
        );
      }

      // Log the password reset event
      await SecurityLogService.logSecurityEvent(
        username,
        SecurityLogType.PASSWORD_RESET,
        {
          userAgent: c.req.header("user-agent") || "unknown",
          ip:
            c.req.header("x-forwarded-for") ||
            c.req.header("x-real-ip") ||
            "unknown",
          path: c.req.path,
          additionalInfo: "Password reset by admin",
        }
      );

      return c.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      return c.json({ error: "Failed to reset password" }, 500);
    }
  }
);

// Force logout user
app.post("/auth/users/:username/logout", adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param("username");
    const success = await AuthService.forceLogoutUser(username);

    if (!success) {
      return c.json({ error: "Failed to logout user or user not found" }, 404);
    }

    // Log the forced logout event
    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.USER_LOGOUT,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
        additionalInfo: "Forced logout by admin",
      }
    );

    return c.json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error logging out user:", error);
    return c.json({ error: "Failed to process logout request" }, 500);
  }
});

// Delete User
app.post('/auth/users/:username/delete', adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('username');
    
    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    const success = await AuthService.deleteUser(username);
    if (!success) {
      return c.json({ error: 'Failed to delete user or user not found' }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.USER_DELETED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path
      }
    );

    return c.json({ message: 'User deleted successfully', success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user', success: false }, 500);
  }
});

// Similarly for admin deletion
app.post('/auth/admins/:username/delete', adminAuthMiddleware, async (c) => {
  try {
    const username = c.req.param('username');
    
    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    // Verify super admin status
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const requestingAdmin = await Admins.findOne({ accessToken: token });
    
    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ error: 'Only super admins can delete admins' }, 403);
    }

    const success = await AuthService.deleteAdmin(username, requestingAdmin.username);
    if (!success) {
      return c.json({ error: 'Failed to delete admin, admin not found, or cannot delete super admin' }, 404);
    }

    await SecurityLogService.logSecurityEvent(
      requestingAdmin.username,
      SecurityLogType.ADMIN_DELETED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Deleted admin: ${username}`
      }
    );

    return c.json({ message: 'Admin deleted successfully', success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return c.json({ error: 'Failed to delete admin', success: false }, 500);
  }
});

app.post('/auth/users/:username/office-status', adminAuthMiddleware, async (c) => {
  const username = c.req.param('username');
  const { isOfficeUser } = await c.req.json();
  
  try {
    const result = await WebUsers.updateOne(
      { username },
      { $set: { isOfficeUser } }
    );

    if (result.modifiedCount === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Log the change
    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.USER_UPDATED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Office user status changed to: ${isOfficeUser}`
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating office user status:', error);
    return c.json({ error: 'Failed to update user status' }, 500);
  }
});

// Get all admins (super admin only)
app.get("/auth/admins", adminAuthMiddleware, async (c) => {
  try {
    // Verify super admin status
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const requestingAdmin = await Admins.findOne({ accessToken: token });

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ error: "Only super admins can view admin list" }, 403);
    }

    const admins = await Admins.find({}).toArray();

    return c.json({
      admins: admins.map((admin) => ({
        username: admin.username,
        isSuperAdmin: admin.isSuperAdmin,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
        isLocked: admin.isLocked,
        lockReason: admin.lockReason
      }))
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return c.json({ error: "Failed to fetch admins" }, 500);
  }
});

// Get admin logs
app.get("/auth/logs/admin/:username", adminAuthMiddleware, async (c) => {
  try {
    const targetUsername = c.req.param("username");
    
    // Verify super admin status
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const requestingAdmin = await Admins.findOne({ accessToken: token });

    if (!requestingAdmin?.isSuperAdmin) {
      return c.json({ error: "Only super admins can view admin logs" }, 403);
    }

    const { page = "1", limit = "20" } = c.req.query();

    const logs = await SecurityLogService.getSecurityLogs({
      userId: targetUsername,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return c.json(logs);
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return c.json({ error: "Failed to fetch admin logs" }, 500);
  }
});

export { app as authRoutes };
