// src/routes/images.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type { HonoContext, ProjectImage } from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { UserRole } from "../types/index.js";

const imageRouter = new Hono<HonoContext>();

// Apply authentication to all routes
imageRouter.use("*", authenticate);

/**
 * @route POST /api/v1/projects/:projectId/images/upload
 * @desc Upload images
 * @access Admin, Super Admin
 */
imageRouter.post(
  "/upload",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const project = c.get("project");
    if (!project) {
      console.error("Project not found in context");
      throw new HTTPException(404, { message: "Project not found" });
    }
    const projectId = project._id.toString();

    const currentUser = c.get("user");

    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    try {
      // Process uploaded files
      const formData = await c.req.formData();
      const files = Array.from(formData.getAll("file")).filter(
        (value): value is File => value instanceof File
      );

      if (files.length === 0) {
        throw new HTTPException(400, { message: "No files were uploaded" });
      }

      // Process each file
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          // Validate file type
          if (!file.type.startsWith("image/")) {
            throw new HTTPException(400, {
              message: `File '${file.name}' is not an image`,
            });
          }

          // Validate file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            throw new HTTPException(400, {
              message: `File '${file.name}' exceeds the 10MB size limit`,
            });
          }

          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Using placeholder dimensions (in a real implementation use image processing)
          return {
            buffer,
            originalname: file.name,
            mimetype: file.type,
            width: 800,
            height: 600,
          };
        })
      );

      // Upload images to S3 and create database records
      const uploadedImages = await services
        .images()
        .uploadImages(
          projectId,
          processedFiles,
          currentUser._id,
          c.env.S3_BUCKET
        );

      // Format response - FIXED: using proper variable name for formatted data
      const formattedImages = uploadedImages.map((image) => ({
        id: image._id.toString(),
        filename: image.filename,
        width: image.width,
        height: image.height,
        uploadedAt: image.uploadedAt,
      }));

      return c.json(
        response.success(formattedImages, "Images uploaded successfully"),
        201
      );
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(500, {
        message:
          error instanceof Error
            ? `Image upload failed: ${error.message}`
            : "Unknown error during image upload",
      });
    }
  }
);

/**
 * @route GET /api/v1/projects/:projectId/images
 * @desc List all project images
 * @access Admin, Super Admin, Project Members
 */
imageRouter.get("/", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const projectId = project._id.toString();
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  // Check if user is admin or project member
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;

  if (!isAdmin) {
    const isMember = await services
      .projects()
      .isProjectMember(projectId, currentUser._id.toString());

    if (!isMember) {
      throw new HTTPException(403, {
        message: "Forbidden: Not a member of this project",
      });
    }
  }

  // Get filters from query params
  const filters: Record<string, any> = {};

  if (c.req.query("status")) {
    filters.status = c.req.query("status");
  }

  if (c.req.query("annotationStatus")) {
    filters.annotationStatus = c.req.query("annotationStatus");
  }

  if (c.req.query("reviewStatus")) {
    filters.reviewStatus = c.req.query("reviewStatus");
  }

  if (c.req.query("assignedTo")) {
    const assignedTo = c.req.query("assignedTo");
    if (assignedTo) {
      filters.assignedTo = new ObjectId(assignedTo);
    }
  }

  const { images, total } = await services
    .images()
    .getProjectImages(projectId, page, limit, filters);

  const formattedImages = images.map((image) => ({
    id: image._id.toString(),
    filename: image.filename,
    width: image.width,
    height: image.height,
    status: image.status,
    annotationStatus: image.annotationStatus,
    reviewStatus: image.reviewStatus,
    uploadedAt: image.uploadedAt,
    assignedTo: image.assignedTo ? image.assignedTo.toString() : null,
    annotatedBy: image.annotatedBy ? image.annotatedBy.toString() : null,
    reviewedBy: image.reviewedBy ? image.reviewedBy.toString() : null,
    annotatedAt: image.annotatedAt,
    reviewedAt: image.reviewedAt,
    autoAnnotated: image.autoAnnotated,
    timeSpent: image.timeSpent,
  }));

  return c.json(
    response.success({
      images: formattedImages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

// Image param middleware
imageRouter.use("/:imageId/*", async (c, next) => {
  const imageId = c.req.param("imageId");
  if (!imageId) {
    throw new HTTPException(400, { message: "Image ID is required" });
  }

  validation.objectId(imageId);

  const image = await services.images().findById(imageId);
  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }

  c.set("image", image);
  await next();
});

/**
 * @route GET /api/v1/projects/:projectId/images/:imageId/proxy
 * @desc Get proxied image URL
 * @access Admin, Super Admin, Project Members
 */
imageRouter.get("/:imageId/proxy", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const image = c.get("image") as ProjectImage;
  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check permissions
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;

  if (!isAdmin) {
    // Check if user is a project member
    const isMember = await services
      .projects()
      .isProjectMember(project._id.toString(), currentUser._id.toString());

    if (!isMember) {
      throw new HTTPException(403, {
        message: "Forbidden: Not a member of this project",
      });
    }

    // Check if image is assigned to the user
    if (image.assignedTo && !image.assignedTo.equals(currentUser._id)) {
      throw new HTTPException(403, {
        message: "Forbidden: Image not assigned to you",
      });
    }
  }

  // Generate proxied URL
  const baseUrl = `${c.req.url.split("/api")[0]}/api/v1`;

  const proxiedUrl = await services
    .images()
    .getProxiedImageUrl(
      image._id.toString(),
      currentUser._id.toString(),
      baseUrl,
      c.env.IMAGE_TOKEN_SECRET
    );

  if (!proxiedUrl) {
    throw new HTTPException(500, { message: "Failed to generate image URL" });
  }

  return c.json(response.success(proxiedUrl));
});

/**
 * @route DELETE /api/v1/projects/:projectId/images/:imageId
 * @desc Remove an image
 * @access Admin, Super Admin
 */
imageRouter.delete(
  "/:imageId",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (c) => {
    const imageId = c.req.param("imageId");
    if (!imageId) {
      throw new HTTPException(400, { message: "Image ID is required" });
    }

    validation.objectId(imageId);

    const image = c.get("image") as ProjectImage;
    if (!image) {
      throw new HTTPException(404, { message: "Image not found" });
    }

    const success = await services
      .images()
      .deleteImage(imageId, c.env.S3_BUCKET);

    if (!success) {
      throw new HTTPException(500, { message: "Failed to delete image" });
    }

    return c.json(response.success(null, "Image deleted successfully"));
  }
);

export { imageRouter };
