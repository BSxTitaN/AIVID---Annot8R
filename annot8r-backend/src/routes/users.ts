// src/routes/users.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  HonoContext,
  CreateUserRequest,
  UpdateUserRequest,
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
  createDeleteRoute,
  createCreateRoute,
} from "./route-factory.js";

const userRouter = new Hono<HonoContext>();

// Apply authentication to all routes
userRouter.use("*", authenticate);

/**
 * @route GET /api/v1/users
 * @desc List regular users (admin access)
 * @access Admin, Super Admin
 */
createListRoute(userRouter, "/", services.users(), {
  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  getFilter: () => ({ role: UserRole.USER }),
  formatResponse: (users) =>
    users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isOfficeUser: user.isOfficeUser,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })),
  itemsKey: "users",
});

/**
 * @route POST /api/v1/users
 * @desc Create new user (admin access)
 * @access Admin, Super Admin
 */
const userSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  isOfficeUser: z.boolean(),
});

createCreateRoute<User, CreateUserRequest>(userRouter, "/", services.users(), {
  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  schema: userSchema,
  processData: async (data, c) => {
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }
    return services.users().createUser(data, currentUser._id);
  },
  formatResponse: (user) => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isOfficeUser: user.isOfficeUser,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
  }),
  successMessage: "User created successfully",
});

/**
 * @route GET /api/v1/users/:userId
 * @desc Get user details
 * @access Admin, Super Admin, Self
 */
userRouter.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  validation.objectId(userId);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Allow users to access their own data
  if (
    currentUser._id.toString() !== userId &&
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.SUPER_ADMIN
  ) {
    throw new HTTPException(403, {
      message: "Forbidden: Insufficient permissions",
    });
  }

  const user = await services.users().findById(userId);
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json(
    response.success({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isOfficeUser: user.isOfficeUser,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    })
  );
});

/**
 * @route PATCH /api/v1/users/:userId
 * @desc Update user details
 * @access Admin, Super Admin, Self
 */
userRouter.patch("/:userId", async (c) => {
  const userId = c.req.param("userId");
  validation.objectId(userId);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check permissions
  const isSelf = currentUser._id.toString() === userId;
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;

  if (!isSelf && !isAdmin) {
    throw new HTTPException(403, {
      message: "Forbidden: Insufficient permissions",
    });
  }

  const schema = z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    isOfficeUser: isAdmin ? z.boolean().optional() : z.undefined(),
    isActive: isAdmin ? z.boolean().optional() : z.undefined(),
  });

  const body = await c.req.json<UpdateUserRequest>();
  validation.schema(schema, body);

  // Prevent non-admins from updating isOfficeUser or isActive
  if (!isAdmin) {
    delete body.isOfficeUser;
    delete body.isActive;
  }

  const updatedUser = await services.users().updateUser(userId, body);
  if (!updatedUser) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json(
    response.success(
      {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isOfficeUser: updatedUser.isOfficeUser,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      },
      "User updated successfully"
    )
  );
});

/**
 * @route DELETE /api/v1/users/:userId
 * @desc Delete a user
 * @access Admin, Super Admin
 */
createDeleteRoute(userRouter, "/:userId", services.users(), {
  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  successMessage: "User deleted successfully",
});

/**
 * @route POST /api/v1/users/:userId/reset-password
 * @desc Reset password
 * @access Admin, Super Admin
 */
userRouter.post(
  "/:userId/reset-password",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const userId = c.req.param("userId");
    validation.objectId(userId);

    const schema = z.object({
      newPassword: z.string().min(8),
    });

    const body = await c.req.json<{ newPassword: string }>();
    validation.schema(schema, body);

    const success = await services.users().resetPassword({
      userId,
      newPassword: body.newPassword,
    });

    if (!success) {
      throw new HTTPException(404, { message: "User not found" });
    }

    // Revoke all existing tokens for the user
    await services.authTokens().revokeAllUserTokens(userId);

    return c.json(response.success(null, "Password reset successfully"));
  }
);

export { userRouter };
