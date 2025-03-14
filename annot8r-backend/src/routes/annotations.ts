// src/routes/annotations.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type {
  HonoContext,
  SaveAnnotationRequest,
  AutosaveAnnotationRequest,
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate, requireOfficeUser } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { UserRole } from "../types/index.js";
import { db } from "../config/db.js";

const annotationRouter = new Hono<HonoContext>();

// Apply authentication to all routes
annotationRouter.use("*", authenticate);

/**
 * @route POST /api/v1/users/user/projects/:projectId/images/:imageId/annotations
 * @desc Create/update annotations
 * @access Authenticated users with project access
 */
annotationRouter.post("/", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const imageIdParam = c.req.param("imageId");

  if (!projectIdParam || !imageIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Image ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(imageIdParam);

  const projectId = projectIdParam;
  const imageId = imageIdParam;
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // First, check if image exists in the project
  const database = db.getDb();
  const image = await database.collection("project_images").findOne({
    _id: new ObjectId(imageId),
    projectId: new ObjectId(projectId),
  });
  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }
  // Only check assignment for regular users, not for admins
  if (
    currentUser.role === UserRole.USER &&
    image.assignedTo &&
    !image.assignedTo.equals(currentUser._id)
  ) {
    throw new HTTPException(403, {
      message: "Forbidden: Image not assigned to you",
    });
  }

  const schema = z.object({
    objects: z.array(
      z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        width: z.number().min(0).max(1),
        height: z.number().min(0).max(1),
      })
    ),
    classIds: z.array(z.string()),
    classNames: z.array(z.string()),
    timeSpent: z.number().int().min(0),
    autoAnnotated: z.boolean(),
  });

  const body = await c.req.json<SaveAnnotationRequest>();
  validation.schema(schema, body);

  // Check that objects, classIds, and classNames have the same length
  if (
    body.objects.length !== body.classIds.length ||
    body.objects.length !== body.classNames.length
  ) {
    throw new HTTPException(400, {
      message: "Objects, classIds, and classNames must have the same length",
    });
  }

  // Save the annotation
  const annotation = await services
    .annotations()
    .saveAnnotation(
      projectId,
      imageId,
      currentUser._id.toString(),
      body,
      c.env.S3_BUCKET
    );

  return c.json(
    response.success(
      {
        id: annotation._id.toString(),
        version: annotation.version,
        objects: annotation.objects,
        timeSpent: annotation.timeSpent,
        autoAnnotated: annotation.autoAnnotated,
        updatedAt: annotation.updatedAt,
      },
      "Annotation saved successfully"
    )
  );
});

/**
 * @route PATCH /api/v1/users/user/projects/:projectId/images/:imageId/annotations/autosave
 * @desc Autosave
 * @access Authenticated users with project access
 */
annotationRouter.patch("/autosave", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const imageIdParam = c.req.param("imageId");

  if (!projectIdParam || !imageIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Image ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(imageIdParam);

  const projectId = projectIdParam;
  const imageId = imageIdParam;
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if image exists in the project
  const database = db.getDb();
  const image = await database.collection("project_images").findOne({
    _id: new ObjectId(imageId),
    projectId: new ObjectId(projectId),
  });
  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }
  // Only check assignment for regular users, not for admins
  if (
    currentUser.role === UserRole.USER &&
    image.assignedTo &&
    !image.assignedTo.equals(currentUser._id)
  ) {
    throw new HTTPException(403, {
      message: "Forbidden: Image not assigned to you",
    });
  }

  const schema = z.object({
    objects: z.array(
      z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        width: z.number().min(0).max(1),
        height: z.number().min(0).max(1),
      })
    ),
    classIds: z.array(z.string()),
    classNames: z.array(z.string()),
    timeSpent: z.number().int().min(0),
  });

  const body = await c.req.json<AutosaveAnnotationRequest>();
  validation.schema(schema, body);

  // Check that objects, classIds, and classNames have the same length
  if (
    body.objects.length !== body.classIds.length ||
    body.objects.length !== body.classNames.length
  ) {
    throw new HTTPException(400, {
      message: "Objects, classIds, and classNames must have the same length",
    });
  }

  // Auto-save the annotation
  await services
    .annotations()
    .autoSaveAnnotation(
      projectId,
      imageId,
      currentUser._id.toString(),
      body,
      c.env.S3_BUCKET
    );

  return c.json(response.success(null, "Annotation auto-saved successfully"));
});

/**
 * @route GET /api/v1/users/user/projects/:projectId/images/:imageId/annotations
 * @desc Get annotations
 * @access Authenticated users with project access
 */
annotationRouter.get("/", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const imageIdParam = c.req.param("imageId");

  if (!projectIdParam || !imageIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Image ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(imageIdParam);

  const projectId = projectIdParam;
  const imageId = imageIdParam;
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;

  // Check if image exists in the project
  const database = db.getDb();
  const image = await database.collection("project_images").findOne({
    _id: new ObjectId(imageId),
    projectId: new ObjectId(projectId),
  });

  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }

  // For annotators, check if image is assigned to them
  if (currentUser.role === UserRole.USER) {
    // Check if user is a project member
    const isMember = await services
      .projects()
      .isProjectMember(projectId, currentUser._id.toString());

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

  // Get the annotation
  const annotation = await services
    .annotations()
    .getAnnotation(projectId, imageId, currentUser._id.toString(), isAdmin);

  if (!annotation) {
    return c.json(
      response.success({
        objects: [],
        timeSpent: 0,
        autoAnnotated: false,
      })
    );
  }

  return c.json(
    response.success({
      id: annotation._id.toString(),
      version: annotation.version,
      objects: annotation.objects,
      timeSpent: annotation.timeSpent,
      autoAnnotated: annotation.autoAnnotated,
      updatedAt: annotation.updatedAt,
    })
  );
});

/**
 * @route POST /api/v1/users/projects/:projectId/images/:imageId/auto-annotate
 * @desc Auto-annotate (office users)
 * @access Office users
 */
annotationRouter.post("/auto-annotate", requireOfficeUser(), async (c) => {
  const projectIdParam = c.req.param("projectId");
  const imageIdParam = c.req.param("imageId");

  if (!projectIdParam || !imageIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Image ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(imageIdParam);

  const projectId = projectIdParam;
  const imageId = imageIdParam;
  const currentUser = c.get("user");

  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Get project to access class definitions
  const database = db.getDb();
  const project = await database.collection('projects').findOne({
    _id: new ObjectId(projectId)
  });
  
  if (!project || !project.classes || project.classes.length === 0) {
    throw new HTTPException(404, { message: "Project or classes not found" });
  }

  // Get image to know its dimensions
  const image = await database.collection('project_images').findOne({
    _id: new ObjectId(imageId),
    projectId: new ObjectId(projectId)
  });

  if (!image) {
    throw new HTTPException(404, { message: "Image not found" });
  }

  // Generate random boxes (between 3-8 boxes)
  const boxCount = Math.floor(Math.random() * 6) + 3;
  const objects = [];
  const classIds = [];
  const classNames = [];

  for (let i = 0; i < boxCount; i++) {
    // Generate random position and size (normalized between 0-1)
    // Ensure the box is not too small or too large
    const width = Math.random() * 0.3 + 0.1; // Between 0.1 and 0.4
    const height = Math.random() * 0.3 + 0.1; // Between 0.1 and 0.4
    
    // Make sure the box is fully visible
    const x = Math.random() * (1 - width);
    const y = Math.random() * (1 - height);
    
    // Convert to center coordinates for YOLO format
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Select a random class from the project
    const randomClassIndex = Math.floor(Math.random() * project.classes.length);
    const randomClass = project.classes[randomClassIndex];
    
    objects.push({
      x: centerX,
      y: centerY,
      width: width,
      height: height
    });
    
    classIds.push(randomClass.id);
    classNames.push(randomClass.name);
  }

  // Create auto-annotation request
  const autoAnnotationRequest: SaveAnnotationRequest = {
    objects: objects,
    classIds: classIds,
    classNames: classNames,
    timeSpent: 0,
    autoAnnotated: true,
  };

  // Save the auto-annotation
  const annotation = await services
    .annotations()
    .saveAnnotation(
      projectId,
      imageId,
      currentUser._id.toString(),
      autoAnnotationRequest,
      c.env.S3_BUCKET
    );

  return c.json(
    response.success(
      {
        id: annotation._id.toString(),
        objects: annotation.objects,
        autoAnnotated: true,
      },
      "Auto-annotation applied successfully"
    )
  );
});

export { annotationRouter };
