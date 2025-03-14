// src/routes/auth.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoContext, LoginRequest } from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";

const authRouter = new Hono<HonoContext>();

/**
 * @route POST /api/v1/auth/login
 * @desc User login
 * @access Public
 */
authRouter.post("/login", async (c) => {
  const schema = z.object({
    username: z.string(),
    password: z.string()
  });
  
  const body = await c.req.json<LoginRequest>();
  validation.schema(schema, body);
  
  // Authenticate user
  const user = await services.users().authenticate(body.username, body.password);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
  
  // Get client information
  const ipAddress = c.req.header("X-Forwarded-For") || 
                   c.req.header("X-Real-IP") || 
                   c.req.header("CF-Connecting-IP") || 
                   "0.0.0.0";
  const userAgent = c.req.header("User-Agent") || "";
  
  // Update last login
  await services.users().updateLastLogin(user._id, ipAddress, userAgent);
  
  // Generate token
  const token = await services.authTokens().createToken(
    user,
    c.env.JWT_SECRET,
    ipAddress,
    userAgent
  );
  
  return c.json(response.success({
    token,
    user: {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      isOfficeUser: user.isOfficeUser,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  }));
});

/**
 * @route POST /api/v1/auth/logout
 * @desc User logout
 * @access Private
 */
authRouter.post("/logout", authenticate, async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(400, { message: "Invalid token format" });
  }
  
  const token = authHeader.split(" ")[1];
  await services.authTokens().revokeToken(token);
  
  return c.json(response.success(null, "Logged out successfully"));
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
authRouter.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  return c.json(response.success({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isOfficeUser: user.isOfficeUser,
    firstName: user.firstName,
    lastName: user.lastName,
    lastLoginAt: user.lastLoginAt,
  }));
});

export { authRouter };