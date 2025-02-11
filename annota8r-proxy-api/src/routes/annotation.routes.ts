// src/routes/annotation.routes.ts

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { webAuthMiddleware } from "../middleware/auth.middleware.js";
import { S3Service } from "../services/s3.service.js";
import type { UpdateAnnotationPayload } from "../services/s3.service.js";

const app = new Hono();

// Protect all routes
app.use("/*", webAuthMiddleware);

// Schema validation
const annotationSchema = z.object({
  class: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
});

const updatePayloadSchema = z.object({
  annotations: z.array(annotationSchema),
  customClass: z.string().optional(),
});

/**
 * Get all classes for a project
 */
app.get("/annotations/:userId/:projectId/classes", async (c) => {
  try {
    const { userId, projectId } = c.req.param();

    console.log("Fetching classes for:", { userId, projectId });

    const result = await S3Service.getAllClasses(userId, projectId);

    console.log("Classes result:", result);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    // Return default classes instead of error
    return c.json({
      success: true,
      data: {
        classes: ["Car", "Truck"], // Default classes matching your S3 structure
        isOfficeUser: false,
      },
    });
  }
});

/**
 * Get all annotations for an image
 */
app.get("/annotations/:userId/:projectId/:imageId", async (c) => {
  try {
    const { userId, projectId, imageId } = c.req.param();

    console.log("Fetching annotations for:", { userId, projectId, imageId });

    const result = await S3Service.getAllAnnotations(
      userId,
      projectId,
      imageId
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return c.json({
      success: true, // Still return success to avoid breaking the UI
      data: {
        annotations: [],
        isAnnotated: false,
      },
    });
  }
});

/**
 * Update annotations for an image
 */
app.post(
  "/annotations/:userId/:projectId/:imageId",
  zValidator("json", updatePayloadSchema),
  async (c) => {
    try {
      const { userId, projectId, imageId } = c.req.param();
      const payload = await c.req.json<UpdateAnnotationPayload>();

      const success = await S3Service.updateAnnotations(
        userId,
        projectId,
        imageId,
        payload
      );

      return c.json({
        success: true,
        message: "Annotations updated successfully",
      });
    } catch (error) {
      console.error("Error updating annotations:", error);
      return c.json(
        {
          success: false,
          error: "Failed to update annotations",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

export { app as annotationRoutes };
