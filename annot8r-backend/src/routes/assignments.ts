// src/routes/assignments.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type { HonoContext, ManualAssignmentRequest } from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { UserRole } from "../types/index.js";
import { db } from "../config/db.js";

const assignmentRouter = new Hono<HonoContext>();

// Apply authentication and admin access to all routes
assignmentRouter.use("*", authenticate);
assignmentRouter.use("*", requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

/**
 * @route POST /api/v1/projects/:projectId/assignments
 * @desc Manual assignment
 * @access Admin, Super Admin
 */
assignmentRouter.post("/", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  const currentUser = c.get("user");
  
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  const schema = z.object({
    userAssignments: z
      .array(
        z.object({
          userId: z.string().refine(
            (val) => validation.isValidObjectId(val),
            {
              message: "Invalid user ID format",
            }
          ),
          count: z.number().int().positive(),
        })
      )
      .min(1),
    resetDistribution: z.boolean().optional().default(false)
  });
  
  const body = await c.req.json<ManualAssignmentRequest & { resetDistribution?: boolean }>();
  const validatedData = validation.schema(schema, body);
  
  try {
    const success = await services.assignments().createManualAssignment(
      projectId,
      {
        userAssignments: validatedData.userAssignments
      },
      currentUser._id,
      validatedData.resetDistribution
    );
    
    if (!success) {
      throw new HTTPException(500, { message: "Failed to create assignments" });
    }
    
    return c.json(response.success(null, "Images assigned successfully"));
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * @route POST /api/v1/projects/:projectId/assignments/smart
 * @desc Smart distribution
 * @access Admin, Super Admin
 */
assignmentRouter.post("/smart", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  const currentUser = c.get("user");
  
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  const schema = z.object({
    resetDistribution: z.boolean().optional().default(false)
  });
  
  const body = await c.req.json<{ resetDistribution?: boolean }>().catch(() => ({}));
  const validatedData = validation.schema(schema, body);
  
  try {
    const success = await services.assignments().createSmartDistribution(
      projectId,
      currentUser._id,
      validatedData.resetDistribution
    );
    
    if (!success) {
      throw new HTTPException(500, {
        message: "Failed to create smart distribution",
      });
    }
    
    return c.json(
      response.success(null, "Images distributed successfully")
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * @route GET /api/v1/projects/:projectId/assignments
 * @desc List all assignments
 * @access Admin, Super Admin
 */
assignmentRouter.get("/", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");
  
  const { assignments, total } = await services.assignments().getProjectAssignments(
    projectId,
    page,
    limit
  );
  
  // Get user information for each assignment
  const database = db.getDb();
  const userIds = assignments.map((assignment) => assignment.userId);
  
  const users = await database
    .collection("users")
    .find({ _id: { $in: userIds } })
    .project({ _id: 1, username: 1, firstName: 1, lastName: 1 })
    .toArray();
  
  // Create user lookup map
  const userMap = new Map();
  users.forEach((user: any) => {
    userMap.set(user._id.toString(), {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });
  
  // Format assignments with user data
  const formattedAssignments = assignments.map((assignment) => {
    const user = userMap.get(assignment.userId.toString()) || {};
    
    return {
      id: assignment._id.toString(),
      userId: assignment.userId.toString(),
      username: user.username,
      userFullName: `${user.firstName} ${user.lastName}`,
      status: assignment.status,
      totalImages: assignment.totalImages,
      completedImages: assignment.completedImages,
      progress:
        assignment.totalImages > 0
          ? Math.round(
              (assignment.completedImages / assignment.totalImages) * 100
            )
          : 0,
      assignedAt: assignment.assignedAt,
      lastActivity: assignment.lastActivity,
    };
  });
  
  return c.json(response.success({
    assignments: formattedAssignments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }));
});

/**
 * @route GET /api/v1/projects/:projectId/assignments/metrics
 * @desc Get project-specific assignment metrics
 * @access Admin, Super Admin
 */
assignmentRouter.get("/metrics", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  
  try {
    const metrics = await services.assignments().getAssignmentMetrics(projectId);
    
    // Get user information for the user progress metrics
    const database = db.getDb();
    const userIds = metrics.userProgress.map(up => new ObjectId(up.userId));
    
    const users = await database
      .collection("users")
      .find({ _id: { $in: userIds } })
      .project({ _id: 1, username: 1, firstName: 1, lastName: 1, isOfficeUser: 1 })
      .toArray();
    
    // Create user lookup map
    const userMap = new Map();
    users.forEach((user: any) => {
      userMap.set(user._id.toString(), {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isOfficeUser: user.isOfficeUser
      });
    });
    
    // Format user progress with user details - enhanced with project-specific data
    const formattedUserProgress = metrics.userProgress.map(up => {
      const user = userMap.get(up.userId) || {};
      
      return {
        ...up,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        isOfficeUser: user.isOfficeUser,
        // These fields are now coming from our enhanced getUserProgressMetrics
        // which tracks project-specific metrics only
      };
    });
    
    const formattedMetrics = {
      ...metrics,
      userProgress: formattedUserProgress
    };
    
    return c.json(response.success(formattedMetrics));
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * @route GET /api/v1/projects/:projectId/assignments/members
 * @desc Get project members eligible for assignment
 * @access Admin, Super Admin
 */
assignmentRouter.get("/members", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  
  try {
    const database = db.getDb();
    
    // Get project members with ANNOTATOR role
    const members = await database.collection('project_members')
      .find({
        projectId: new ObjectId(projectId),
        role: 'ANNOTATOR'
      })
      .toArray();
    
    if (members.length === 0) {
      return c.json(response.success({ members: [] }));
    }
    
    // Get user information
    const userIds = members.map(member => member.userId);
    
    const users = await database
      .collection("users")
      .find({ _id: { $in: userIds } })
      .project({ _id: 1, username: 1, firstName: 1, lastName: 1, isOfficeUser: 1 })
      .toArray();
    
    // Format members
    const formattedMembers = users.map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      isOfficeUser: user.isOfficeUser
    }));
    
    return c.json(response.success({ members: formattedMembers }));
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

export { assignmentRouter };