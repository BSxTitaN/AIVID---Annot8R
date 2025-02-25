// src/routes/project.routes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { adminAuthMiddleware, webAuthMiddleware } from "../middleware/auth.middleware.js";
import { ProjectService } from "../services/project.service.js";
import { SecurityLogService } from "../services/log.service.js";
import { SecurityLogType } from "../types/log.types.js";
import { ProjectStatus, AnnotationFormat } from "../types/project.types.js";
import type { Admin, WebUser } from "../types/auth.types.js";
import { Projects } from "../config/mongo.js";
import { ObjectId } from "mongodb";

type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  settings: z.object({
    allowCustomClasses: z.boolean().default(false),
    requireReview: z.boolean().default(true),
    autoDistribute: z.boolean().default(true),
    modelFormat: z.nativeEnum(AnnotationFormat),
  }),
  classes: z.array(z.string()).min(1),
  totalImages: z.number().int().positive(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  settings: z
    .object({
      allowCustomClasses: z.boolean(),
      requireReview: z.boolean(),
      autoDistribute: z.boolean(),
      modelFormat: z.nativeEnum(AnnotationFormat),
    })
    .optional(),
  classes: z.array(z.string()).min(1).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

const memberAssignmentSchema = z.object({
  userId: z.string(),
  allocationPercentage: z.number().min(0).max(100),
});

const classesSchema = z.object({
  classes: z.array(z.string())
});

const submitProjectSchema = z.object({
  projectId: z.string()
});

const unmarkProjectSchema = z.object({
  projectId: z.string()
});

// List all projects (admin only)
app.get('/', adminAuthMiddleware, async (c) => {
  try {
    const projects = await Projects.find({}).toArray();
    
    const formattedProjects = projects.map(project => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      createdBy: project.createdBy,
      settings: project.settings,
      classes: project.classes,
      totalImages: project.totalImages,
      stats: project.stats,
      members: project.members || []
    }));

    return c.json({ 
      success: true, 
      projects: formattedProjects 
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ 
      success: false, 
      error: "Failed to fetch projects" 
    }, 500);
  }
});

// Create new project
app.post('/', adminAuthMiddleware, zValidator("json", createProjectSchema), async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const projectData = await c.req.json();

    const projectId = await ProjectService.createProject(
      adminUser.username,
      projectData
    );

    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.PROJECT_CREATED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        path: c.req.path,
        additionalInfo: `Created project: ${projectData.name}`,
      }
    );

    return c.json({ success: true, projectId });
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ success: false, error: "Failed to create project" }, 500);
  }
});

// Get single project
app.get('/:projectId', adminAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    
    // Use a regular expression to match the project ID - this avoids type issues
    const projects = await Projects.find({}).toArray();
    const project = projects.find(p => p._id.toString() === projectId);
    
    if (!project) {
      return c.json({ 
        success: false, 
        error: "Project not found" 
      }, 404);
    }

    // Format the response
    const formattedProject = {
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      createdBy: project.createdBy,
      settings: project.settings,
      classes: project.classes,
      totalImages: project.totalImages,
      stats: project.stats,
      members: project.members || []
    };

    return c.json({ 
      success: true, 
      project: formattedProject
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ 
      success: false, 
      error: "Failed to fetch project" 
    }, 500);
  }
});

// Update project
app.put('/:projectId', adminAuthMiddleware, zValidator("json", updateProjectSchema), async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const updates = await c.req.json();

    const success = await ProjectService.updateProject(projectId, updates);
    if (!success) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating project:", error);
    return c.json({ success: false, error: "Failed to update project" }, 500);
  }
});

// Get project stats
app.get('/:projectId/stats', adminAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const stats = await ProjectService.getProjectStats(projectId);
    return c.json({ success: true, stats });
  } catch (error) {
    console.error("Error getting project stats:", error);
    return c.json(
      { success: false, error: "Failed to get project stats" },
      500
    );
  }
});

// Submit project for review
app.post('/:projectId/submit', webAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const user = c.get("user");
    
    // Verify user has access to this project
    const hasAccess = await ProjectService.userHasAccess(user.username, projectId);
    if (!hasAccess) {
      return c.json({ success: false, error: "Not authorized to access this project" }, 403);
    }
    
    // Submit project for review
    const success = await ProjectService.submitProject(projectId, user.username);
    if (!success) {
      return c.json({ success: false, error: "Failed to submit project" }, 500);
    }
    
    await SecurityLogService.logSecurityEvent(
      user.username,
      SecurityLogType.PROJECT_SUBMITTED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        path: c.req.path,
        additionalInfo: `Submitted project: ${projectId}`
      }
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting project:", error);
    return c.json({ success: false, error: "Failed to submit project" }, 500);
  }
});

// Unmark project submission (admin only)
app.post('/:projectId/unmark', adminAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const adminUser = c.get("adminUser");
    
    // Unmark project submission
    const success = await ProjectService.unmarkSubmission(projectId);
    if (!success) {
      return c.json({ success: false, error: "Failed to unmark project" }, 500);
    }
    
    await SecurityLogService.logSecurityEvent(
      adminUser.username,
      SecurityLogType.PROJECT_UNMARKED,
      {
        userAgent: c.req.header("user-agent") || "unknown",
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        path: c.req.path,
        additionalInfo: `Unmarked project submission: ${projectId}`
      }
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error unmarking project:", error);
    return c.json({ success: false, error: "Failed to unmark project" }, 500);
  }
});

// Get project classes
app.get('/:projectId/classes', webAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const classes = await ProjectService.getClasses(projectId);
    
    return c.json({ success: true, classes });
  } catch (error) {
    console.error("Error getting classes:", error);
    return c.json({ success: false, error: "Failed to get classes" }, 500);
  }
});

// Update project classes
app.put('/:projectId/classes', adminAuthMiddleware, zValidator("json", classesSchema), async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const { classes } = await c.req.json();

    const success = await ProjectService.updateClasses(projectId, classes);
    if (!success) {
      return c.json({ success: false, error: "Failed to update classes" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating classes:", error);
    return c.json({ success: false, error: "Failed to update classes" }, 500);
  }
});

// List project members
app.get('/:projectId/members', adminAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    
    const project = await Projects.findOne({
      _id: new ObjectId(projectId) as unknown as string,
    });
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    return c.json({ 
      success: true, 
      members: project.members || [] 
    });
  } catch (error) {
    console.error("Error fetching project members:", error);
    return c.json({ success: false, error: "Failed to fetch members" }, 500);
  }
});

// Add project member
app.post('/:projectId/members', adminAuthMiddleware, zValidator("json", memberAssignmentSchema), async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const { userId, allocationPercentage } = await c.req.json();

    const success = await ProjectService.addProjectMember(
      projectId,
      userId,
      allocationPercentage
    );

    if (!success) {
      return c.json({ success: false, error: "Failed to add member" }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error adding project member:", error);
    return c.json({ success: false, error: "Failed to add member" }, 500);
  }
});

// Update member allocation
app.put('/:projectId/members/:userId', adminAuthMiddleware, zValidator("json", memberAssignmentSchema), async (c) => {
  try {
    const { projectId, userId } = c.req.param();
    const { allocationPercentage } = await c.req.json();

    const success = await ProjectService.updateMemberAllocation(
      projectId,
      userId,
      allocationPercentage
    );

    if (!success) {
      return c.json(
        { success: false, error: "Failed to update allocation" },
        400
      );
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating member allocation:", error);
    return c.json(
      { success: false, error: "Failed to update allocation" },
      500
    );
  }
});

// Remove project member
app.delete('/:projectId/members/:userId', adminAuthMiddleware, async (c) => {
  try {
    const { projectId, userId } = c.req.param();

    const success = await ProjectService.removeMember(projectId, userId);
    if (!success) {
      return c.json({ success: false, error: "Failed to remove member" }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error removing project member:", error);
    return c.json({ success: false, error: "Failed to remove member" }, 500);
  }
});

// Get assignments for a project
app.get('/:projectId/assignments', webAuthMiddleware, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const user = c.get("user");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");

    const assignments = await ProjectService.getMemberAssignments(
      projectId,
      user.username,
      page,
      limit
    );

    return c.json({ success: true, ...assignments });
  } catch (error) {
    console.error("Error getting assignments:", error);
    return c.json({ success: false, error: "Failed to get assignments" }, 500);
  }
});

export { app as projectRoutes };