// src/routes/submissions.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import {
  type HonoContext,
  type SubmitForReviewRequest,
  type ReviewSubmissionRequest,
  type SubmissionReview,
  type SubmissionStatus,
  UserRole
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate } from "../middleware/index.js";
import { validation } from "../utils/validation.js";
import { z } from "zod";
import { db } from "../config/index.js";

const submissionRouter = new Hono<HonoContext>();

// Apply authentication to all routes
submissionRouter.use("*", authenticate);

// Submission param middleware
submissionRouter.use("/:submissionId/*", async (c, next) => {
  const submissionId = c.req.param("submissionId");
  if (!submissionId) {
    throw new HTTPException(400, { message: "Submission ID is required" });
  }
  validation.objectId(submissionId);
  const submission = await services.submissions().findById(submissionId);
  if (!submission) {
    throw new HTTPException(404, { message: "Submission not found" });
  }
  c.set("submission", submission);
  await next();
});

/**
 * @route POST /api/v1/user/projects/:projectId/assignments/:assignmentId/submit
 * @desc Submit for review
 * @access Authenticated users with project access
 */
submissionRouter.post("/:assignmentId/submit", async (c) => {
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
  
  // Check if user can submit
  const submitStatus = await services.submissions().canUserSubmit(
    projectId,
    currentUser._id.toString()
  );
  
  if (!submitStatus.canSubmit) {
    throw new HTTPException(400, { message: submitStatus.reason || "Cannot submit" });
  }
  
  const schema = z.object({
    message: z.string().optional().default(""),
  });
  
  const body = await c.req.json<{ message?: string }>().catch(() => ({ message: "" }));
  validation.schema(schema, body);
  
  const request: SubmitForReviewRequest = {
    assignmentId,
    message: body.message || "",
  };
  
  try {
    const submission = await services.submissions().submitForReview(
      projectId,
      currentUser._id.toString(),
      request
    );
    
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
});

/**
 * @route GET /api/v1/projects/:projectId/submissions
 * @desc List all submissions
 * @access Admin, Super Admin, Project Reviewers
 */
submissionRouter.get("/", async (c) => {
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
  const status = c.req.query("status") as SubmissionStatus | undefined;
  const userIdFilter = c.req.query("userId");
  
  // Check if user has permission to view submissions
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;
    
  if (!isAdmin) {
    // Check if user is a reviewer for this project
    const isReviewer = await services.projects().isProjectMember(
      projectId,
      currentUser._id.toString(),
      "REVIEWER"
    );
    
    if (!isReviewer) {
      throw new HTTPException(403, {
        message: "Forbidden: Insufficient permissions",
      });
    }
  }
  
  // Validate user ID if provided
  if (userIdFilter) {
    validation.objectId(userIdFilter, "userId");
  }
  
  const { submissions, total } = await services.submissions().getProjectSubmissions(
    projectId,
    page,
    limit,
    status,
    userIdFilter
  );
  
  // Get user information for each submission
  const database = db.getDb();
  const userIds = submissions.map((submission) => submission.userId);
  
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
  
  // Format submissions with user data
  const formattedSubmissions = submissions.map((submission) => {
    const user = userMap.get(submission.userId.toString()) || {};
    
    return {
      id: submission._id.toString(),
      assignmentId: submission.assignmentId.toString(),
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      message: submission.message || "",
      submittedBy: {
        id: submission.userId.toString(),
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
      },
      imageCount: submission.imageIds.length,
      flaggedImagesCount: submission.flaggedImages?.length || 0,
    };
  });
  
  return c.json(response.success({
    submissions: formattedSubmissions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }));
});

/**
 * @route POST /api/v1/projects/:projectId/submissions/:submissionId/review
 * @desc Review submission
 * @access Admin, Super Admin, Project Reviewers
 */
submissionRouter.post("/:submissionId/review", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const submission = c.get("submission") as SubmissionReview;
  if (!submission) {
    throw new HTTPException(404, { message: "Submission not found" });
  }
  
  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  // Check if user has permission to review submissions
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;
    
  if (!isAdmin) {
    // Check if user is a reviewer for this project
    const isReviewer = await services.projects().isProjectMember(
      project._id.toString(),
      currentUser._id.toString(),
      "REVIEWER"
    );
    
    if (!isReviewer) {
      throw new HTTPException(403, {
        message: "Forbidden: Insufficient permissions",
      });
    }
  }
  
  const schema = z.object({
    status: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
    feedback: z.string().optional().default(""),
    flaggedImages: z
      .array(
        z.object({
          imageId: z.string().refine(id => validation.isValidObjectId(id), {
            message: "Invalid image ID format",
          }),
          reason: z.string(),
        })
      )
      .optional().default([]),
  });
  
  const body = await c.req.json<ReviewSubmissionRequest>();
  validation.schema(schema, body);
  
  try {
    const updatedSubmission = await services.submissions().reviewSubmission(
      submission._id.toString(),
      currentUser._id.toString(),
      body
    );
    
    return c.json(
      response.success(
        {
          id: updatedSubmission._id.toString(),
          status: updatedSubmission.status,
          reviewedAt: updatedSubmission.reviewedAt,
          flaggedImagesCount: updatedSubmission.flaggedImages.length,
        },
        "Submission reviewed successfully"
      )
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * @route GET /api/v1/projects/:projectId/submissions/:submissionId
 * @desc Get submission details
 * @access Admin, Super Admin, Project Reviewers, Submission Owner
 */
submissionRouter.get("/:submissionId", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const submission = c.get("submission") as SubmissionReview;
  if (!submission) {
    throw new HTTPException(404, { message: "Submission not found" });
  }
  
  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  // Check if user has permission to view this submission
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;
    
  const isOwner = submission.userId.equals(currentUser._id);
  
  if (!isAdmin && !isOwner) {
    // Check if user is a reviewer for this project
    const isReviewer = await services.projects().isProjectMember(
      project._id.toString(),
      currentUser._id.toString(),
      "REVIEWER"
    );
    
    if (!isReviewer) {
      throw new HTTPException(403, {
        message: "Forbidden: Insufficient permissions",
      });
    }
  }
  
  // Get user information
  const database = db.getDb();
  const user = await database
    .collection("users")
    .findOne(
      { _id: submission.userId },
      { projection: { username: 1, firstName: 1, lastName: 1 } }
    );
    
  // Get reviewer information if exists
  let reviewer = null;
  if (submission.reviewedBy) {
    reviewer = await database
      .collection("users")
      .findOne(
        { _id: submission.reviewedBy },
        { projection: { username: 1, firstName: 1, lastName: 1 } }
      );
  }
  
  // Get images information
  const images = await database
    .collection("project_images")
    .find({ _id: { $in: submission.imageIds } })
    .project({ 
      _id: 1,
      filename: 1,
      reviewStatus: 1,
      reviewFeedback: 1,
      s3Key: 1,
      width: 1,
      height: 1,
      annotationStatus: 1
    })
    .toArray();
    
  // Sort images with flagged ones first
  const flaggedImageIds = submission.flaggedImages.map(fi => fi.imageId.toString());
  
  const formattedImages = images
    .sort((a, b) => {
      const aIsFlagged = flaggedImageIds.includes(a._id.toString());
      const bIsFlagged = flaggedImageIds.includes(b._id.toString());
      
      if (aIsFlagged && !bIsFlagged) return -1;
      if (!aIsFlagged && bIsFlagged) return 1;
      return 0;
    })
    .map((image: any) => {
      const isFlagged = flaggedImageIds.includes(image._id.toString());
      
      return {
        id: image._id.toString(),
        filename: image.filename,
        reviewStatus: image.reviewStatus,
        reviewFeedback: image.reviewFeedback,
        width: image.width,
        height: image.height,
        s3Key: image.s3Key,
        annotationStatus: image.annotationStatus,
        isFlagged
      };
    });
  
  // Format flagged images with details
  const formattedFlaggedImages = submission.flaggedImages.map((item) => {
    const image = images.find((img: any) => img._id.equals(item.imageId)) || {};
    
    return {
      imageId: item.imageId.toString(),
      filename: image.filename,
      reason: item.reason,
    };
  });
  
  return c.json(response.success({
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    message: submission.message || "",
    feedback: submission.feedback || "",
    submittedBy: user
      ? {
          id: user._id.toString(),
          username: user.username,
          name: `${user.firstName} ${user.lastName}`,
        }
      : null,
    reviewedBy: reviewer
      ? {
          id: reviewer._id.toString(),
          username: reviewer.username,
          name: `${reviewer.firstName} ${reviewer.lastName}`,
        }
      : null,
    images: formattedImages,
    flaggedImages: formattedFlaggedImages,
    reviewHistory: submission.reviewHistory.map((item) => ({
      reviewedBy: item.reviewedBy.toString(),
      reviewedAt: item.reviewedAt,
      status: item.status,
      feedback: item.feedback || "",
      flaggedImagesCount: item.flaggedImages.length,
    })),
  }));
});

/**
 * @route GET /api/v1/projects/:projectId/submissions/stats
 * @desc Get submission statistics for a project
 * @access Admin, Super Admin, Project Reviewers
 */
submissionRouter.get("/stats", async (c) => {
  const project = c.get("project");
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  
  const projectId = project._id.toString();
  const currentUser = c.get("user");
  
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  
  // Check if user has permission to view stats
  const isAdmin =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN;
    
  if (!isAdmin) {
    // Check if user is a reviewer for this project
    const isReviewer = await services.projects().isProjectMember(
      projectId,
      currentUser._id.toString(),
      "REVIEWER"
    );
    
    if (!isReviewer) {
      throw new HTTPException(403, {
        message: "Forbidden: Insufficient permissions",
      });
    }
  }
  
  const stats = await services.submissions().getSubmissionStats(projectId);
  
  return c.json(response.success(stats));
});

/**
 * @route GET /api/v1/user/projects/:projectId/submissions/status
 * @desc Get submission status for the current user
 * @access Any authenticated user
 */
submissionRouter.get("/status", async (c) => {
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
  
  // Check if user is a member of the project
  const isMember = await services.projects().isProjectMember(
    projectId,
    currentUser._id.toString()
  );
  
  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }
  
  const status = await services.submissions().getUserProjectSubmissionStatus(
    projectId,
    currentUser._id.toString()
  );
  
  return c.json(response.success(status));
});

export { submissionRouter };