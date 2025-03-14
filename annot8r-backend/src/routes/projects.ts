// src/routes/projects.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type {
  HonoContext,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  Project,
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { ReviewStatus, SubmissionStatus, UserRole } from "../types/index.js";
import { createListRoute } from "./route-factory.js";
import { db } from "../config/db.js";

const projectRouter = new Hono<HonoContext>();

// Apply authentication to all routes
projectRouter.use("*", authenticate);

// Project param middleware
projectRouter.use("/:projectId/*", async (c, next) => {
  try {
    const projectId = c.req.param("projectId");
    console.log(`Middleware received projectId: ${projectId}`);

    // Validate the ID format
    validation.objectId(projectId);

    // Fetch the project
    const project = await services.projects().findActiveById(projectId);
    if (!project) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    // Set it in the context for later middleware/handlers
    c.set("project", project);

    // Continue to the next middleware/handler
    await next();
  } catch (error) {
    console.error("Project middleware error:", error);
    throw error;
  }
});

/**
 * @route GET /api/v1/projects
 * @desc List all projects (admin view)
 * @access Admin, Super Admin
 */
createListRoute(projectRouter, "/", services.projects(), {
  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  getFilter: () => ({ isDeleted: false }),
  formatResponse: (projects) =>
    projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      totalImages: project.totalImages,
      annotatedImages: project.annotatedImages,
      reviewedImages: project.reviewedImages,
      approvedImages: project.approvedImages,
      completionPercentage: project.completionPercentage,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      createdBy: project.createdBy.toString(),
    })),
  itemsKey: "projects",
});

/**
 * @route POST /api/v1/projects
 * @desc Create new project
 * @access Admin, Super Admin
 */
projectRouter.post(
  "/",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1),
      annotationFormat: z.string().refine((val) => val === "YOLO", {
        message: "Only YOLO annotation format is currently supported",
      }),
      classes: z
        .array(
          z.object({
            name: z.string().min(1),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
              message: "Color must be a valid hex code",
            }),
          })
        )
        .min(1),
      allowCustomClasses: z.boolean(),
    });

    const body = await c.req.json<CreateProjectRequest>();
    validation.schema(schema, body);

    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const project = await services
      .projects()
      .createProject(body, currentUser._id);

    return c.json(
      response.success(
        {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
          annotationFormat: project.annotationFormat,
          classes: project.classes,
          allowCustomClasses: project.allowCustomClasses,
          status: project.status,
          createdAt: project.createdAt,
        },
        "Project created successfully"
      ),
      201
    );
  }
);

/**
 * @route GET /api/v1/projects/:projectId
 * @desc Get project details
 * @access Admin, Super Admin
 */
projectRouter.get(
  "/:projectId",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;

    return c.json(
      response.success({
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        annotationFormat: project.annotationFormat,
        classes: project.classes,
        allowCustomClasses: project.allowCustomClasses,
        status: project.status,
        totalImages: project.totalImages,
        annotatedImages: project.annotatedImages,
        reviewedImages: project.reviewedImages,
        approvedImages: project.approvedImages,
        completionPercentage: project.completionPercentage,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy.toString(),
      })
    );
  }
);

/**
 * @route PATCH /api/v1/projects/:projectId
 * @desc Update project
 * @access Admin, Super Admin
 */
projectRouter.patch(
  "/:projectId",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;

    const schema = z.object({
      description: z.string().min(1).optional(),
      classes: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            isCustom: z.boolean(),
          })
        )
        .optional(),
      allowCustomClasses: z.boolean().optional(),
      status: z
        .enum(["CREATED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"])
        .optional(),
    });

    const body = await c.req.json<UpdateProjectRequest>();
    validation.schema(schema, body);

    const updatedProject = await services
      .projects()
      .updateProject(project._id.toString(), body);

    if (!updatedProject) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    return c.json(
      response.success(
        {
          id: updatedProject._id.toString(),
          name: updatedProject.name,
          description: updatedProject.description,
          annotationFormat: updatedProject.annotationFormat,
          classes: updatedProject.classes,
          allowCustomClasses: updatedProject.allowCustomClasses,
          status: updatedProject.status,
          updatedAt: updatedProject.updatedAt,
        },
        "Project updated successfully"
      )
    );
  }
);

/**
 * @route DELETE /api/v1/projects/:projectId
 * @desc Delete project
 * @access Super Admin
 */
projectRouter.delete(
  "/:projectId",
  requireRoles([UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;

    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const success = await services
      .projects()
      .deleteProject(project._id.toString(), currentUser._id);

    if (!success) {
      throw new HTTPException(500, { message: "Failed to delete project" });
    }

    return c.json(
      response.success(
        null,
        "Project and all associated data deleted successfully"
      )
    );
  }
);

// Project members routes

/**
 * @route GET /api/v1/projects/:projectId/members
 * @desc Get project members
 * @access Project Members
 */
projectRouter.get("/:projectId/members", async (c) => {
  const project = c.get("project") as Project;
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  // Check permissions
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;

  if (!isAdmin) {
    const isMember = await services
      .projects()
      .isProjectMember(project._id.toString(), currentUser._id.toString());

    if (!isMember) {
      throw new HTTPException(403, {
        message: "Forbidden: Not a member of this project",
      });
    }
  }

  const { members, total } = await services
    .projects()
    .getProjectMembers(project._id.toString(), page, limit);

  // Format response
  const database = db.getDb();
  const memberUserIds = members.map((member) => member.userId);

  const users = await database
    .collection("users")
    .find({ _id: { $in: memberUserIds } })
    .project({
      _id: 1,
      username: 1,
      firstName: 1,
      lastName: 1,
      isOfficeUser: 1,
    })
    .toArray();

  // Create user lookup map
  const userMap = new Map();
  users.forEach((user: any) => {
    userMap.set(user._id.toString(), {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isOfficeUser: user.isOfficeUser,
    });
  });

  // Format members with user data
  const formattedMembers = members.map((member) => {
    const user = userMap.get(member.userId.toString()) || {};
    return {
      id: member._id.toString(),
      userId: member.userId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: member.role,
      isOfficeUser: user.isOfficeUser,
      addedAt: member.addedAt,
    };
  });

  return c.json(
    response.success({
      members: formattedMembers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

/**
 * @route POST /api/v1/projects/:projectId/members
 * @desc Add member to project
 * @access Admin, Super Admin
 */
projectRouter.post(
  "/:projectId/members",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;

    const schema = z.object({
      userId: z.string().refine((id) => validation.isValidObjectId(id), {
        message: "Invalid user ID format",
      }),
      role: z.enum(["ANNOTATOR", "REVIEWER"]),
    });

    const body = await c.req.json<AddProjectMemberRequest>();
    validation.schema(schema, body);

    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    try {
      const member = await services
        .projects()
        .addProjectMember(project._id.toString(), body, currentUser._id);

      return c.json(
        response.success(
          {
            id: member._id.toString(),
            projectId: member.projectId.toString(),
            userId: member.userId.toString(),
            role: member.role,
            addedAt: member.addedAt,
          },
          "Member added to project successfully"
        ),
        201
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new HTTPException(400, { message: error.message });
      }
      throw error;
    }
  }
);

/**
 * @route DELETE /api/v1/projects/:projectId/members/:userId
 * @desc Remove member from project
 * @access Admin, Super Admin
 */
projectRouter.delete(
  "/:projectId/members/:userId",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;
    const userId = c.req.param("userId");

    validation.objectId(userId, "userId");

    const success = await services
      .projects()
      .removeProjectMember(project._id.toString(), userId);

    if (!success) {
      throw new HTTPException(404, { message: "Member not found in project" });
    }

    return c.json(
      response.success(null, "Member removed from project successfully")
    );
  }
);

/**
 * @route POST /api/v1/projects/:projectId/complete
 * @desc Mark project as complete
 * @access Admin, Super Admin
 */
projectRouter.post(
  "/:projectId/complete",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project") as Project;
    if (!project) {
      throw new HTTPException(404, { message: "Project not found" });
    }
    
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }
    
    try {
      // Check completion eligibility
      const database = db.getDb();
      const projectId = project._id.toString();
      
      // Get image counts
      const totalImages = await database.collection("project_images").countDocuments({
        projectId: project._id,
      });
      
      if (totalImages === 0) {
        throw new HTTPException(400, { 
          message: "Cannot mark project as complete. No images have been uploaded." 
        });
      }
      
      const approvedImages = await database.collection("project_images").countDocuments({
        projectId: project._id,
        reviewStatus: ReviewStatus.APPROVED,
      });
      
      if (approvedImages < totalImages) {
        throw new HTTPException(400, { 
          message: `Cannot mark project as complete. Only ${approvedImages} out of ${totalImages} images are approved.` 
        });
      }
      
      // Check for pending submissions
      const pendingSubmissions = await database.collection("submission_reviews").countDocuments({
        projectId: project._id,
        status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW] },
      });
      
      if (pendingSubmissions > 0) {
        throw new HTTPException(400, { 
          message: `Cannot mark project as complete. There are ${pendingSubmissions} pending submissions that need to be reviewed first.` 
        });
      }
      
      // Mark as complete
      const updatedProject = await services.projects().markProjectAsComplete(
        projectId,
        currentUser._id
      );
      
      if (!updatedProject) {
        throw new HTTPException(500, { message: "Failed to mark project as complete" });
      }
      
      return c.json(
        response.success(
          {
            id: updatedProject._id.toString(),
            status: updatedProject.status,
            completionPercentage: updatedProject.completionPercentage,
            updatedAt: updatedProject.updatedAt,
          },
          "Project marked as complete successfully"
        )
      );
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new HTTPException(400, { message: error.message });
      }
      
      throw new HTTPException(500, { message: "Failed to mark project as complete" });
    }
  }
);

export { projectRouter };
