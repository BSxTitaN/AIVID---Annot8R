// src/routes/admins.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  HonoContext,
  CreateAdminRequest,
  UpdateAdminRequest,
  User,
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { UserRole } from "../types/index.js";
import {
  createListRoute,
  createGetByIdRoute,
  createCreateRoute,
} from "./route-factory.js";

const adminRouter = new Hono<HonoContext>();

// Apply authentication and super admin access to all routes
adminRouter.use("*", authenticate);
adminRouter.use("*", requireRoles([UserRole.SUPER_ADMIN]));

/**
 * @route GET /api/v1/admins
 * @desc List admin users
 * @access Super Admin
 */
createListRoute(adminRouter, "/", services.users(), {
  getFilter: () => ({ role: UserRole.ADMIN }),
  formatResponse: (admins) =>
    admins.map((admin) => ({
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
    })),
  itemsKey: "admins",
});

/**
 * @route POST /api/v1/admins
 * @desc Create new admin
 * @access Super Admin
 */
const adminSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

createCreateRoute<User, CreateAdminRequest>(
  adminRouter,
  "/",
  services.users(),
  {
    roles: [UserRole.SUPER_ADMIN],
    schema: adminSchema,
    processData: async (data, c) => {
      const currentUser = c.get("user");
      if (!currentUser) {
        throw new HTTPException(401, { message: "User not authenticated" });
      }
      return services.users().createAdmin(data, currentUser._id);
    },
    formatResponse: (admin) => ({
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
      createdAt: admin.createdAt,
    }),
    successMessage: "Admin created successfully",
  }
);

/**
 * @route GET /api/v1/admins/:adminId
 * @desc Get admin details
 * @access Super Admin
 */
createGetByIdRoute(adminRouter, "/:adminId", services.users(), {
  formatResponse: (admin) => {
    if (admin.role !== UserRole.ADMIN) {
      throw new HTTPException(404, { message: "Admin not found" });
    }

    return {
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastLoginAt: admin.lastLoginAt,
    };
  },
});

/**
 * @route PATCH /api/v1/admins/:adminId
 * @desc Update admin details
 * @access Super Admin
 */
adminRouter.patch("/:adminId", async (c) => {
  const adminId = c.req.param("adminId");
  if (!adminId) {
    throw new HTTPException(400, { message: "Admin ID is required" });
  }

  validation.objectId(adminId);

  const admin = await services.users().findById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  const schema = z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  });

  const body = await c.req.json<UpdateAdminRequest>();
  validation.schema(schema, body);

  const updatedAdmin = await services.users().updateUser(adminId, body);
  if (!updatedAdmin) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  return c.json(
    response.success(
      {
        id: updatedAdmin._id.toString(),
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        isActive: updatedAdmin.isActive,
        updatedAt: updatedAdmin.updatedAt,
      },
      "Admin updated successfully"
    )
  );
});

/**
 * @route DELETE /api/v1/admins/:adminId
 * @desc Delete an admin
 * @access Super Admin
 */
adminRouter.delete("/:adminId", async (c) => {
  const adminId = c.req.param("adminId");
  if (!adminId) {
    throw new HTTPException(400, { message: "Admin ID is required" });
  }

  validation.objectId(adminId);

  const admin = await services.users().findById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  const success = await services.users().deleteUser(adminId);
  if (!success) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  return c.json(response.success(null, "Admin deleted successfully"));
});

/**
 * @route POST /api/v1/admins/:adminId/reset-password
 * @desc Reset admin password
 * @access Super Admin
 */
adminRouter.post("/:adminId/reset-password", async (c) => {
  const adminId = c.req.param("adminId");
  if (!adminId) {
    throw new HTTPException(400, { message: "Admin ID is required" });
  }

  validation.objectId(adminId);

  const schema = z.object({
    newPassword: z.string().min(8),
  });

  const body = await c.req.json<{ newPassword: string }>();
  validation.schema(schema, body);

  const admin = await services.users().findById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  const success = await services.users().resetPassword({
    userId: adminId,
    newPassword: body.newPassword,
  });

  if (!success) {
    throw new HTTPException(404, { message: "Admin not found" });
  }

  // Revoke all existing tokens for the admin
  await services.authTokens().revokeAllUserTokens(adminId);

  return c.json(response.success(null, "Password reset successfully"));
});

export { adminRouter };
