// src/routes/admin.routes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Admins } from "../config/mongo.js";
import { SecurityLogService } from "../services/log.service.js";
import { SecurityLogType } from "../types/log.types.js";
import { AuthService } from "../services/auth.service.js";
import { adminAuthMiddleware } from "../middleware/auth.middleware.js";
import type { Admin, WebUser } from "../types/auth.types.js";

// Define context variable types
type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const createAdminSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

const resetPasswordSchema = z.object({
  username: z.string(),
  newPassword: z.string().min(8),
});

// Protect all routes with admin authentication
app.use("/*", adminAuthMiddleware);

// List all admins
app.get("/", async (c) => {
  try {
    const adminUser = c.get("adminUser");

    // Only super admins can list all admins
    if (!adminUser.isSuperAdmin) {
      return c.json({ error: "Only super admins can access admin list" }, 403);
    }

    const admins = await Admins.find({}).toArray();

    // Filter sensitive information
    const filteredAdmins = admins.map((admin) => ({
      username: admin.username,
      isSuperAdmin: admin.isSuperAdmin,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
      isLocked: admin.isLocked,
      lockReason: admin.lockReason,
    }));

    return c.json({ admins: filteredAdmins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return c.json({ error: "Failed to fetch admins" }, 500);
  }
});

// Create new admin (super admin only)
app.post("/", zValidator("json", createAdminSchema), async (c) => {
  try {
    const adminUser = c.get("adminUser");

    // Only super admins can create new admins
    if (!adminUser.isSuperAdmin) {
      return c.json({ error: "Only super admins can create new admins" }, 403);
    }

    const { username, password } = await c.req.json();
    const success = await AuthService.createAdmin(username, password);

    if (!success) {
      return c.json({ error: "Admin username already exists" }, 409);
    }

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
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

    return c.json({ success: true });
  } catch (error) {
    console.error("Admin creation error:", error);
    return c.json({ error: "Failed to create admin" }, 500);
  }
});

// Delete admin (super admin only)
app.delete("/:adminId", async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const username = c.req.param("adminId");

    // Only super admins can delete admins
    if (!adminUser.isSuperAdmin) {
      return c.json({ error: "Only super admins can delete admins" }, 403);
    }

    // Cannot delete self
    if (adminUser.username === username) {
      return c.json({ error: "Cannot delete your own admin account" }, 400);
    }

    const success = await AuthService.deleteAdmin(username, adminUser.username);
    if (!success) {
      return c.json(
        { error: "Failed to delete admin or admin not found" },
        404
      );
    }

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.ADMIN_DELETED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip:
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown",
        path: c.req.path,
        additionalInfo: `Deleted admin: ${username}`,
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return c.json({ error: "Failed to delete admin" }, 500);
  }
});

// Reset admin password (super admin only)
app.put(
  "/:adminId/password",
  zValidator("json", resetPasswordSchema),
  async (c) => {
    try {
      const adminUser = c.get("adminUser");
      const username = c.req.param("adminId");
      const { newPassword } = await c.req.json();

      // Only super admins can reset admin passwords
      if (!adminUser.isSuperAdmin) {
        return c.json(
          { error: "Only super admins can reset admin passwords" },
          403
        );
      }

      const success = await AuthService.resetAdminPassword(
        username,
        newPassword
      );
      if (!success) {
        return c.json(
          { error: "Failed to reset password or admin not found" },
          404
        );
      }

      await SecurityLogService.logSecurityEvent(
        adminUser.username,
        SecurityLogType.ADMIN_PASSWORD_RESET,
        {
          userAgent: c.req.header("user-agent") || "unknown",
          ip:
            c.req.header("x-forwarded-for") ||
            c.req.header("x-real-ip") ||
            "unknown",
          path: c.req.path,
          additionalInfo: `Reset password for admin: ${username}`,
        }
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("Error resetting admin password:", error);
      return c.json({ error: "Failed to reset admin password" }, 500);
    }
  }
);

// Get admin logs (super admin only)
app.get("/:adminId/logs", async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const username = c.req.param("adminId");

    // Only super admins can view admin logs
    if (!adminUser.isSuperAdmin) {
      return c.json({ error: "Only super admins can view admin logs" }, 403);
    }

    const { page = "1", limit = "20" } = c.req.query();

    const logs = await SecurityLogService.getSecurityLogs({
      userId: username,
      page: parseInt(page),
      limit: parseInt(limit),
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
        SecurityLogType.ACCOUNT_UNLOCKED,
      ],
    });

    return c.json(logs);
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return c.json({ error: "Failed to fetch admin logs" }, 500);
  }
});

export { app as adminRoutes };
