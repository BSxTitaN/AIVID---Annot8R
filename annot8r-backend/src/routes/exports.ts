// src/routes/exports.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  HonoContext,
  CreateExportRequest,
  ProjectExport,
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { UserRole } from "../types/index.js";
import { db } from "../config/db.js";

const exportRouter = new Hono<HonoContext>();

// Apply authentication and admin access to all routes
exportRouter.use("*", authenticate);
exportRouter.use("*", requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

/**
 * @route POST /api/v1/projects/:projectId/exports
 * @desc Create export
 * @access Admin, Super Admin
 */
exportRouter.post("/", async (c) => {
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
    format: z.string().refine((val) => val === "YOLO", {
      message: "Only YOLO format is currently supported",
    }),
    includesImages: z.boolean(),
    onlyReviewedAnnotations: z.boolean(),
  });

  const body = await c.req.json<CreateExportRequest>();
  validation.schema(schema, body);

  try {
    const exportRecord = await services
      .exports()
      .createExport(projectId, body, currentUser._id, c.env.S3_BUCKET);

    return c.json(
      response.success(
        {
          id: exportRecord._id.toString(),
          format: exportRecord.format,
          includesImages: exportRecord.includesImages,
          onlyReviewedAnnotations: exportRecord.onlyReviewedAnnotations,
          status: exportRecord.status,
          exportedAt: exportRecord.exportedAt,
        },
        "Export job created successfully"
      ),
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * @route GET /api/v1/projects/:projectId/exports
 * @desc Get project exports
 * @access Admin, Super Admin
 */
exportRouter.get("/", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const projectId = project._id.toString();
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  const { exports, total } = await services
    .exports()
    .getProjectExports(projectId, page, limit);

  // Get user information for each export
  const database = db.getDb();
  const userIds = exports.map((exp) => exp.exportedBy);

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

  // Format exports with user data - FIXED: added type annotation
  const formattedExports = exports.map((exp: ProjectExport) => {
    const user = userMap.get(exp.exportedBy.toString()) || {};

    return {
      id: exp._id.toString(),
      format: exp.format,
      status: exp.status,
      includesImages: exp.includesImages,
      onlyReviewedAnnotations: exp.onlyReviewedAnnotations,
      totalImages: exp.totalImages,
      totalAnnotations: exp.totalAnnotations,
      exportedAt: exp.exportedAt,
      exportedBy: {
        id: exp.exportedBy.toString(),
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
      },
      url: exp.url,
      expiresAt: exp.expiresAt,
    };
  });

  return c.json(
    response.success({
      exports: formattedExports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

/**
 * @route GET /api/v1/projects/:projectId/exports/:exportId/download
 * @desc Download export
 * @access Admin, Super Admin
 */
exportRouter.get("/:exportId/download", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const exportIdParam = c.req.param("exportId");

  if (!projectIdParam || !exportIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Export ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(exportIdParam);

  const exportId = exportIdParam;
  const exportRecord = await services.exports().findById(exportId);

  if (!exportRecord) {
    throw new HTTPException(404, { message: "Export not found" });
  }

  if (exportRecord.status !== "COMPLETED") {
    throw new HTTPException(400, {
      message: `Export is not ready for download. Current status: ${exportRecord.status}`,
    });
  }

  // Check if URL has expired
  if (
    !exportRecord.url ||
    !exportRecord.expiresAt ||
    new Date() > exportRecord.expiresAt
  ) {
    // Generate a new URL
    const url = await services
      .exports()
      .refreshDownloadUrl(exportId, c.env.S3_BUCKET);

    return c.json(response.success({ url }));
  }

  return c.json(response.success({ url: exportRecord.url }));
});

/**
 * @route GET /api/v1/projects/:projectId/exports/:exportId/status
 * @desc Check export status
 * @access Admin, Super Admin
 */
exportRouter.get("/:exportId/status", async (c) => {
  const exportIdParam = c.req.param("exportId");
  if (!exportIdParam) {
    throw new HTTPException(400, { message: "Export ID is required" });
  }

  validation.objectId(exportIdParam);

  const exportId = exportIdParam;
  const exportRecord = await services.exports().findById(exportId);

  if (!exportRecord) {
    throw new HTTPException(404, { message: "Export not found" });
  }

  return c.json(
    response.success({
      id: exportRecord._id.toString(),
      status: exportRecord.status,
      totalImages: exportRecord.totalImages,
      totalAnnotations: exportRecord.totalAnnotations,
      url: exportRecord.status === "COMPLETED" ? exportRecord.url : null,
      expiresAt:
        exportRecord.status === "COMPLETED" ? exportRecord.expiresAt : null,
    })
  );
});

export { exportRouter };
