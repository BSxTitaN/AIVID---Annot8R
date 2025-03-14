// src/routes/admin-dashboard.ts
import { Hono } from "hono";
import { ObjectId } from "mongodb";
import type { HonoContext, Project, ActivityLog } from "../types/index.js";
import { db } from "../config/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { UserRole } from "../types/index.js";

const adminDashboardRouter = new Hono<HonoContext>();

// Apply authentication and admin access to all routes
adminDashboardRouter.use("*", authenticate);
adminDashboardRouter.use("*", requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

/**
 * @route GET /api/v1/admin/dashboard/stats
 * @desc Get admin dashboard statistics
 * @access Admin, Super Admin
 */
adminDashboardRouter.get("/stats", async (c) => {
  const database = db.getDb();
  
  // Get counts for various entities
  const [
    totalProjects,
    totalUsers,
    totalImages,
    totalAnnotations,
    completedProjects,
    annotatedImages,
    reviewedImages
  ] = await Promise.all([
    database.collection("projects").countDocuments({ isDeleted: false }),
    database.collection("users").countDocuments({ role: UserRole.USER }),
    database.collection("project_images").countDocuments({}),
    database.collection("annotations").countDocuments({}),
    database.collection("projects").countDocuments({
      status: "COMPLETED",
      isDeleted: false,
    }),
    database.collection("project_images").countDocuments({
      annotationStatus: "COMPLETED",
    }),
    database.collection("project_images").countDocuments({
      reviewStatus: { $in: ["APPROVED", "FLAGGED"] },
    })
  ]);
  
  // Calculate percentages
  const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
  const annotationCompletionRate = totalImages > 0 ? (annotatedImages / totalImages) * 100 : 0;
  const reviewCompletionRate = annotatedImages > 0 ? (reviewedImages / annotatedImages) * 100 : 0;
  
  const stats = {
    projects: {
      total: totalProjects,
      completed: completedProjects,
      completionRate: parseFloat(projectCompletionRate.toFixed(2)),
    },
    users: {
      total: totalUsers,
    },
    images: {
      total: totalImages,
      annotated: annotatedImages,
      reviewed: reviewedImages,
      annotationCompletionRate: parseFloat(annotationCompletionRate.toFixed(2)),
      reviewCompletionRate: parseFloat(reviewCompletionRate.toFixed(2)),
    },
    annotations: {
      total: totalAnnotations,
    },
  };
  
  return c.json(response.success(stats));
});

/**
 * @route GET /api/v1/admin/dashboard/projects/recent
 * @desc Get recent projects
 * @access Admin, Super Admin
 */
adminDashboardRouter.get("/projects/recent", async (c) => {
  const database = db.getDb();
  const limit = Number(c.req.query("limit") || "5");
  
  const projects = await database
    .collection<Project>("projects")
    .find({ isDeleted: false })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  
  const formattedProjects = projects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
    status: project.status,
    totalImages: project.totalImages,
    completionPercentage: project.completionPercentage,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
  
  return c.json(response.success(formattedProjects));
});

/**
 * @route GET /api/v1/admin/dashboard/activity-logs
 * @desc Get recent system activities
 * @access Admin, Super Admin
 */
adminDashboardRouter.get("/activity-logs", async (c) => {
  const database = db.getDb();
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");
  const skip = (page - 1) * limit;
  
  // Get recent activity logs
  const logs = await database
    .collection<ActivityLog>("activity_logs")
    .find({})
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  // Get total count
  const total = await database.collection("activity_logs").countDocuments({});
  
  // Get user information for each log
  const userIds = logs.map((log) => log.userId);
  const users = await database
    .collection("users")
    .find({ _id: { $in: userIds } })
    .project({ _id: 1, username: 1, firstName: 1, lastName: 1 })
    .toArray();
  
  // Create user lookup map
  const userMap = new Map();
  users.forEach((user) => {
    userMap.set(user._id.toString(), {
      username: user.username,
      name: `${user.firstName} ${user.lastName}`,
    });
  });
  
  // Format logs with user information
  const formattedLogs = logs.map((log) => {
    const user = userMap.get(log.userId.toString()) || {
      username: "Unknown",
      name: "Unknown User",
    };
    
    return {
      id: log._id.toString(),
      action: log.action,
      timestamp: log.timestamp,
      user: {
        id: log.userId.toString(),
        username: user.username,
        name: user.name,
      },
      projectId: log.projectId ? log.projectId.toString() : null,
      method: log.method,
      path: log.apiPath,
      ip: log.userIp,
      details: log.details,
    };
  });
  
  return c.json(response.success({
    data: formattedLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }));
});

export { adminDashboardRouter };