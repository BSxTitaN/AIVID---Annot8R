// src/routes/user-projects.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoContext, SubmitForReviewRequest } from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import {
  AnnotationStatus,
  ImageStatus,
  ProjectStatus,
  ReviewStatus,
  SubmissionStatus,
  UserRole,
} from "../types/index.js";
import { db } from "../config/db.js";
import { ObjectId } from "mongodb";
import { z } from "zod";

const userProjectRouter = new Hono<HonoContext>();

// Apply authentication to all routes
userProjectRouter.use("*", authenticate);

/**
 * @route GET /api/v1/user/projects
 * @desc List assigned projects
 * @access All authenticated users
 */
userProjectRouter.get("/", async (c) => {
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const { projects, total } = await services
    .projects()
    .getUserProjects(currentUser._id.toString(), page, limit);

  const formattedProjects = projects.map((project) => ({
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
  }));

  return c.json(
    response.success({
      projects: formattedProjects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

/**
 * @route GET /api/v1/user/projects/:projectId
 * @desc Get project details
 * @access Project members
 */
userProjectRouter.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }

  validation.objectId(projectId);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if project exists
  const project = await services.projects().findById(projectId);
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Check permissions
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

  return c.json(
    response.success({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      annotationFormat: project.annotationFormat,
      allowCustomClasses: project.allowCustomClasses,
      status: project.status,
      totalImages: project.totalImages,
      annotatedImages: project.annotatedImages,
      reviewedImages: project.reviewedImages,
      approvedImages: project.approvedImages,
      completionPercentage: project.completionPercentage,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  );
});

/**
 * @route GET /api/v1/user/projects/:projectId/images
 * @desc Get assigned images
 * @access Project members
 */
userProjectRouter.get("/:projectId/images", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }

  validation.objectId(projectId);

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if project exists
  const project = await services.projects().findById(projectId);
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Check if user is a member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());

  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  const { images, total } = await services
    .images()
    .getUserAssignedImages(projectId, currentUser._id.toString(), page, limit);

  const formattedImages = images.map((image) => ({
    id: image._id.toString(),
    filename: image.filename,
    width: image.width,
    height: image.height,
    status: image.status,
    annotationStatus: image.annotationStatus,
    reviewStatus: image.reviewStatus,
    uploadedAt: image.uploadedAt,
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

/**
 * @route GET /api/v1/user/projects/:projectId/submissions
 * @desc Get submissions
 * @access Project members
 */
userProjectRouter.get("/:projectId/submissions", async (c) => {
  const projectIdParam = c.req.param("projectId");
  if (!projectIdParam) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }
  validation.objectId(projectIdParam);
  const projectId = new ObjectId(projectIdParam);

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if user is member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectIdParam, currentUser._id.toString());
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Get database reference
  const database = db.getDb();

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get submissions
  const submissions = await database
    .collection("submission_reviews")
    .find({
      projectId: projectId,
      userId: currentUser._id,
    })
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Get total count
  const total = await database.collection("submission_reviews").countDocuments({
    projectId: projectId,
    userId: currentUser._id,
  });

  // Make sure each submission has a valid status
  const formattedSubmissions = submissions.map((submission) => {
    // Ensure status is a valid enum value
    const status =
      submission.status &&
      Object.values(SubmissionStatus).includes(submission.status)
        ? submission.status
        : SubmissionStatus.SUBMITTED;

    return {
      id: submission._id.toString(),
      assignmentId: submission.assignmentId.toString(),
      status: status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      feedback: submission.feedback || "",
      message: submission.message || "",
      imageCount: submission.imageIds?.length || 0,
      flaggedImagesCount: submission.flaggedImages?.length || 0,
    };
  });

  console.log(
    "Returning formatted submissions list:",
    JSON.stringify(formattedSubmissions, null, 2)
  );

  return c.json(
    response.success({
      data: formattedSubmissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});
/**
 * @route GET /api/v1/user/projects/:projectId/classes
 * @desc Get annotation classes
 * @access Project members
 */
userProjectRouter.get("/:projectId/classes", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }

  validation.objectId(projectId);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if project exists
  const project = await services.projects().findById(projectId);
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Check if user is a member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());

  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  return c.json(
    response.success({
      classes: project.classes,
      allowCustomClasses: project.allowCustomClasses,
    })
  );
});

/**
 * @route GET /api/v1/user/projects/:projectId/submissions/:submissionId
 * @desc Get submission details for a user
 * @access Project member
 */
/**
 * @route GET /api/v1/user/projects/:projectId/submissions/:submissionId
 * @desc Get a specific submission with complete image details
 * @access Authenticated users with project access
 */
userProjectRouter.get("/:projectId/submissions/:submissionId", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const submissionIdParam = c.req.param("submissionId");
  if (!projectIdParam || !submissionIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Submission ID are required",
    });
  }

  validation.objectId(projectIdParam);
  validation.objectId(submissionIdParam);
  const projectId = new ObjectId(projectIdParam);
  const submissionId = new ObjectId(submissionIdParam);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if user is member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectIdParam, currentUser._id.toString());
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Get database reference
  const database = db.getDb();

  // Get submission
  const submission = await database.collection("submission_reviews").findOne({
    _id: submissionId,
    projectId: projectId,
  });

  if (!submission) {
    throw new HTTPException(404, { message: "Submission not found" });
  }

  // Check if submission belongs to this user
  if (!submission.userId.equals(currentUser._id)) {
    throw new HTTPException(403, { message: "Forbidden: Not your submission" });
  }

  // Get reviewer information if exists
  let reviewer = null;
  if (submission.reviewedBy) {
    reviewer = await database
      .collection("users")
      .findOne(
        { _id: submission.reviewedBy },
        { projection: { _id: 1, username: 1, firstName: 1, lastName: 1 } }
      );
  }

  // Get all images in the submission
  const imageIds = submission.imageIds || [];
  const images = await database
    .collection("project_images")
    .find({ _id: { $in: imageIds } })
    .project({
      _id: 1,
      filename: 1,
      reviewStatus: 1,
      reviewFeedback: 1,
      s3Key: 1,
      width: 1,
      height: 1,
      annotationStatus: 1,
    })
    .toArray();

  // Get flagged images details
  const flaggedImagesDetails = [];
  if (submission.flaggedImages && submission.flaggedImages.length > 0) {
    // Create a map of image id to full image object
    const imageMap = new Map();
    images.forEach((img) => {
      imageMap.set(img._id.toString(), img);
    });

    // Build flagged images with complete details
    for (const flaggedImage of submission.flaggedImages) {
      const imageId = flaggedImage.imageId.toString();
      const image = imageMap.get(imageId) || {};
      flaggedImagesDetails.push({
        imageId: imageId,
        filename: image.filename || "Unknown Image",
        reason: flaggedImage.reason,
      });
    }
  }

  // Format images for the response
  const formattedImages = images.map((image) => ({
    id: image._id.toString(),
    filename: image.filename,
    reviewStatus: image.reviewStatus || "NOT_REVIEWED",
    reviewFeedback: image.reviewFeedback || "",
    width: image.width,
    height: image.height,
    s3Key: image.s3Key,
    annotationStatus: image.annotationStatus || "UNANNOTATED",
    isFlagged:
      submission.flaggedImages?.some(
        (fi: { imageId: ObjectId }) =>
          fi.imageId.toString() === image._id.toString()
      ) || false,
  }));

  // Ensure status is a valid enum value
  const status =
    submission.status &&
    Object.values(SubmissionStatus).includes(submission.status)
      ? submission.status
      : SubmissionStatus.SUBMITTED;

  // Format submission for response
  const formattedSubmission = {
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    status: status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    message: submission.message || "",
    feedback: submission.feedback || "",
    submittedBy: {
      id: currentUser._id.toString(),
      username: currentUser.username,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
    },
    reviewedBy: reviewer
      ? {
          id: reviewer._id.toString(),
          username: reviewer.username,
          name: `${reviewer.firstName} ${reviewer.lastName}`,
        }
      : null,
    imageCount: images.length,
    flaggedImagesCount: submission.flaggedImages?.length || 0,
    flaggedImages: flaggedImagesDetails,
    images: formattedImages,
    reviewHistory: (submission.reviewHistory || []).map(
      (item: {
        reviewedBy: ObjectId;
        reviewedAt: Date;
        status: string;
        feedback?: string;
        flaggedImages?: Array<{ imageId: ObjectId; reason: string }>;
      }) => ({
        reviewedBy: item.reviewedBy.toString(),
        reviewedAt: item.reviewedAt,
        status: item.status,
        feedback: item.feedback || "",
        flaggedImagesCount: item.flaggedImages?.length || 0,
      })
    ),
  };

  console.log(
    "Returning formatted submission:",
    JSON.stringify(formattedSubmission, null, 2)
  );

  return c.json(response.success(formattedSubmission));
});

/**
 * @route GET /api/v1/user/projects/:projectId/stats
 * @desc Get detailed project statistics for a user
 * @access Project member
 */
userProjectRouter.get("/:projectId/stats", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }

  validation.objectId(projectId);

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if project exists
  const project = await services.projects().findById(projectId);
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Check if user is a member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());

  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  const database = db.getDb();

  // Get user's assignments for this project
  const assignments = await database
    .collection("image_assignments")
    .find({
      projectId: new ObjectId(projectId),
      userId: currentUser._id,
    })
    .sort({ assignedAt: -1 })
    .toArray();

  // Get user's images stats for this project
  const [totalAssigned, inProgress, completed, underReview, flagged, approved] =
    await Promise.all([
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
      }),
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
        annotationStatus: AnnotationStatus.IN_PROGRESS,
      }),
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
        annotationStatus: AnnotationStatus.COMPLETED,
        reviewStatus: ReviewStatus.NOT_REVIEWED,
      }),
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
        status: ImageStatus.UNDER_REVIEW,
      }),
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
        reviewStatus: ReviewStatus.FLAGGED,
      }),
      database.collection("project_images").countDocuments({
        projectId: new ObjectId(projectId),
        assignedTo: currentUser._id,
        reviewStatus: ReviewStatus.APPROVED,
      }),
    ]);

  // Get user's submissions for this project
  const submissions = await database
    .collection("submission_reviews")
    .find({
      projectId: new ObjectId(projectId),
      userId: currentUser._id,
    })
    .sort({ submittedAt: -1 })
    .toArray();

  // Calculate progress
  const progress =
    totalAssigned > 0 ? Math.round((approved / totalAssigned) * 100) : 0;
  const canSubmit = completed > 0 && underReview === 0;

  // Format assignments
  const formattedAssignments = assignments.map((assignment) => ({
    id: assignment._id.toString(),
    assignedAt: assignment.assignedAt,
    totalImages: assignment.totalImages,
    completedImages: assignment.completedImages,
    status: assignment.status,
    progress:
      assignment.totalImages > 0
        ? Math.round(
            (assignment.completedImages / assignment.totalImages) * 100
          )
        : 0,
  }));

  // Format submissions
  const formattedSubmissions = submissions.map((submission) => ({
    id: submission._id.toString(),
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    status: submission.status,
    imageCount: submission.imageIds.length,
    flaggedImagesCount: submission.flaggedImages.length,
  }));

  return c.json(
    response.success({
      projectId,
      projectName: project.name,
      statistics: {
        totalAssigned,
        inProgress,
        completed,
        underReview,
        flagged,
        approved,
        progress,
      },
      assignments: formattedAssignments,
      submissions: formattedSubmissions,
      canSubmit,
    })
  );
});

/**
 * @route GET /api/v1/user/projects/:projectId/submissions/status
 * @desc Get submission status for current user
 * @access Project member
 */
userProjectRouter.get("/:projectId/submissions/status", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }
  validation.objectId(projectId);
  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if project exists
  const project = await services.projects().findById(projectId);
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Check if project is completed (prevents submissions)
  if (project.status === ProjectStatus.COMPLETED) {
    return c.json(
      response.success({
        canSubmit: false,
        reason: "Project is marked as complete. No new submissions allowed.",
        hasAssignedImages: true,
        totalAssigned: 0,
        completed: 0,
        flagged: 0,
        approved: 0,
        pendingReview: 0,
        progress: 0,
      })
    );
  }

  // Check if user is a member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());

  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Get submission status
  const status = await services
    .submissions()
    .getUserProjectSubmissionStatus(projectId, currentUser._id.toString());

  return c.json(response.success(status));
});

/**
 * Implementation of the missing routes for handling the submission flow.
 * These routes should be added to the existing `routes/user-projects.ts` file.
 */

/**
 * @route POST /api/v1/user/projects/:projectId/assignments/:assignmentId/submit
 * @desc Submit assignment for review
 * @access Authenticated users with project access
 */
userProjectRouter.post(
  "/:projectId/assignments/:assignmentId/submit",
  async (c) => {
    const projectIdParam = c.req.param("projectId");
    const assignmentIdParam = c.req.param("assignmentId");
    if (!projectIdParam || !assignmentIdParam) {
      throw new HTTPException(400, {
        message: "Project ID and Assignment ID are required",
      });
    }

    validation.objectId(projectIdParam);
    validation.objectId(assignmentIdParam);
    const projectId = projectIdParam;
    const assignmentId = assignmentIdParam;
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const schema = z.object({
      message: z.string().optional().default(""),
    });
    const body = await c.req
      .json<{ message?: string }>()
      .catch(() => ({ message: "" }));
    validation.schema(schema, body);

    const submitRequest: SubmitForReviewRequest = {
      assignmentId,
      message: body.message || "",
    };

    try {
      const submission = await services
        .submissions()
        .submitForReview(projectId, currentUser._id.toString(), submitRequest);

      return c.json(
        response.success(
          {
            id: submission._id.toString(),
            status: submission.status,
            submittedAt: submission.submittedAt,
            imageCount: submission.imageIds.length,
            message: submission.message,
          },
          "Submission created successfully"
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
 * @route GET /api/v1/user/projects/:projectId/submissions
 * @desc Get user's submissions for a project
 * @access Authenticated users with project access
 */
userProjectRouter.get("/:projectId/submissions", async (c) => {
  const projectIdParam = c.req.param("projectId");
  if (!projectIdParam) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }
  validation.objectId(projectIdParam);
  const projectId = projectIdParam;

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "20");

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if user is member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  const { submissions, total } = await services
    .submissions()
    .getUserSubmissions(projectId, currentUser._id.toString(), page, limit);

  const formattedSubmissions = submissions.map((submission) => ({
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    feedback: submission.feedback || "",
    message: submission.message || "",
    imageCount: submission.imageIds.length,
    flaggedImagesCount: submission.flaggedImages?.length || 0,
  }));

  return c.json(
    response.success({
      data: formattedSubmissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

/**
 * @route GET /api/v1/user/projects/:projectId/submissions/:submissionId
 * @desc Get a specific submission
 * @access Authenticated users with project access
 */
userProjectRouter.get("/:projectId/submissions/:submissionId", async (c) => {
  const projectIdParam = c.req.param("projectId");
  const submissionIdParam = c.req.param("submissionId");
  if (!projectIdParam || !submissionIdParam) {
    throw new HTTPException(400, {
      message: "Project ID and Submission ID are required",
    });
  }
  validation.objectId(projectIdParam);
  validation.objectId(submissionIdParam);
  const projectId = projectIdParam;
  const submissionId = submissionIdParam;

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if user is member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Get submission
  const submission = await services.submissions().findById(submissionId);
  if (!submission) {
    throw new HTTPException(404, { message: "Submission not found" });
  }

  // Check if submission belongs to this user
  if (!submission.userId.equals(currentUser._id)) {
    throw new HTTPException(403, { message: "Forbidden: Not your submission" });
  }

  // Get reviewer information if exists
  const database = db.getDb();
  let reviewer = null;
  if (submission.reviewedBy) {
    reviewer = await database
      .collection("users")
      .findOne(
        { _id: submission.reviewedBy },
        { projection: { _id: 1, username: 1, firstName: 1, lastName: 1 } }
      );
  }

  // Get flagged images details
  const flaggedImagesDetails = [];
  if (submission.flaggedImages && submission.flaggedImages.length > 0) {
    const flaggedImageIds = submission.flaggedImages.map(
      (item) => item.imageId
    );
    const images = await database
      .collection("project_images")
      .find({ _id: { $in: flaggedImageIds } })
      .project({ _id: 1, filename: 1 })
      .toArray();
    const imageMap = new Map();
    images.forEach((img) => {
      imageMap.set(img._id.toString(), img.filename);
    });
    for (const flaggedImage of submission.flaggedImages) {
      flaggedImagesDetails.push({
        imageId: flaggedImage.imageId.toString(),
        filename:
          imageMap.get(flaggedImage.imageId.toString()) || "Unknown Image",
        reason: flaggedImage.reason,
      });
    }
  }

  // Get all images in the submission
  const imageIds = submission.imageIds;
  const images = await database
    .collection("project_images")
    .find({ _id: { $in: imageIds } })
    .project({
      _id: 1,
      filename: 1,
      reviewStatus: 1,
      reviewFeedback: 1,
      s3Key: 1,
      width: 1,
      height: 1,
      annotationStatus: 1,
    })
    .toArray();

  const formattedImages = images.map((image) => ({
    id: image._id.toString(),
    filename: image.filename,
    reviewStatus: image.reviewStatus,
    reviewFeedback: image.reviewFeedback,
    width: image.width,
    height: image.height,
    s3Key: image.s3Key,
    annotationStatus: image.annotationStatus,
  }));

  // Format submission for response
  const formattedSubmission = {
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    message: submission.message || "",
    feedback: submission.feedback || "",
    submittedBy: {
      id: currentUser._id.toString(),
      username: currentUser.username,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
    },
    reviewedBy: reviewer
      ? {
          id: reviewer._id.toString(),
          username: reviewer.username,
          name: `${reviewer.firstName} ${reviewer.lastName}`,
        }
      : null,
    imageCount: submission.imageIds.length,
    flaggedImagesCount: submission.flaggedImages?.length || 0,
    flaggedImages: flaggedImagesDetails,
    images: formattedImages,
    reviewHistory: (submission.reviewHistory || []).map((item) => ({
      reviewedBy: item.reviewedBy.toString(),
      reviewedAt: item.reviewedAt,
      status: item.status,
      feedback: item.feedback || "",
      flaggedImagesCount: item.flaggedImages?.length || 0,
    })),
  };

  return c.json(response.success(formattedSubmission));
});

/**
 * @route GET /api/v1/user/projects/:projectId/submissions/status
 * @desc Get submission status for a project
 * @access Authenticated users with project access
 */
userProjectRouter.get("/:projectId/submissions/status", async (c) => {
  const projectIdParam = c.req.param("projectId");
  if (!projectIdParam) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }
  validation.objectId(projectIdParam);
  const projectId = projectIdParam;

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  // Check if user is member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, currentUser._id.toString());
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Check if project is completed (prevents submissions)
  const project = await services.projects().findById(projectId);
  if (project && project.status === ProjectStatus.COMPLETED) {
    return c.json(
      response.success({
        canSubmit: false,
        reason: "Project is marked as complete. No new submissions allowed.",
        hasAssignedImages: true,
        totalAssigned: 0,
        completed: 0,
        flagged: 0,
        approved: 0,
        pendingReview: 0,
        progress: 0,
      })
    );
  }

  // Get submission status
  const status = await services
    .submissions()
    .getUserProjectSubmissionStatus(projectId, currentUser._id.toString());

  return c.json(response.success(status));
});

export { userProjectRouter };
