// src/routes/user-dashboard.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type {
  HonoContext,
  UserDashboardStats,
  ProjectCompletionStatus,
} from "../types/index.js";
import { services } from "../services/index.js";
import { response } from "../utils/response.js";
import { authenticate } from "../middleware/index.js";
import { db } from "../config/index.js";
import {
  SubmissionStatus,
  ImageStatus,
  ReviewStatus,
  AnnotationStatus,
} from "../types/index.js";

const userDashboardRouter = new Hono<HonoContext>();

// Apply authentication to all routes
userDashboardRouter.use("*", authenticate);

/**
 * @route GET /api/v1/user/dashboard/stats
 * @desc Get user dashboard statistics across all projects
 * @access Authenticated User
 */
userDashboardRouter.get("/stats", async (c) => {
  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const database = db.getDb();
  const userId = currentUser._id;

  // Get projects where user is a member
  const memberEntries = await database
    .collection("project_members")
    .find({ userId })
    .toArray();

  const projectIds = memberEntries.map((entry) => entry.projectId);
  if (projectIds.length === 0) {
    return c.json(
      response.success({
        totalProjects: 0,
        totalAssignedImages: 0,
        completedImages: 0,
        pendingReviewImages: 0,
        rejectedImages: 0,
        approvedImages: 0,
        recentActivity: [],
        projectsWithPendingWork: 0,
      })
    );
  }

  // Get statistics across all projects
  const [
    totalAssignedImages,
    completedImages,
    pendingReviewImages,
    rejectedImages,
    approvedImages,
  ] = await Promise.all([
    database.collection("project_images").countDocuments({
      projectId: { $in: projectIds },
      assignedTo: userId,
    }),
    database.collection("project_images").countDocuments({
      projectId: { $in: projectIds },
      assignedTo: userId,
      annotationStatus: AnnotationStatus.COMPLETED,
      reviewStatus: { $ne: ReviewStatus.APPROVED },
    }),
    database.collection("project_images").countDocuments({
      projectId: { $in: projectIds },
      assignedTo: userId,
      status: ImageStatus.UNDER_REVIEW,
    }),
    database.collection("project_images").countDocuments({
      projectId: { $in: projectIds },
      assignedTo: userId,
      reviewStatus: ReviewStatus.FLAGGED,
    }),
    database.collection("project_images").countDocuments({
      projectId: { $in: projectIds },
      assignedTo: userId,
      reviewStatus: ReviewStatus.APPROVED,
    }),
  ]);

  // Get projects with pending work (images assigned but not all completed or approved)
  const projectsWithPendingWork = await database
    .collection("projects")
    .aggregate([
      { $match: { _id: { $in: projectIds } } },
      {
        $lookup: {
          from: "project_images",
          let: { projectId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectId", "$$projectId"] },
                    { $eq: ["$assignedTo", userId] },
                    { $ne: ["$reviewStatus", ReviewStatus.APPROVED] },
                  ],
                },
              },
            },
          ],
          as: "pendingImages",
        },
      },
      { $match: { "pendingImages.0": { $exists: true } } },
      { $count: "count" },
    ])
    .toArray();

  // Get recent activities (submissions, annotations)
  const recentActivity = await database
    .collection("activity_logs")
    .find({
      userId,
      projectId: { $in: projectIds },
      action: {
        $in: [
          "ANNOTATION_CREATED",
          "ANNOTATION_UPDATED",
          "SUBMISSION_CREATED",
          "SUBMISSION_REVIEWED",
        ],
      },
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .toArray();

  // Format recent activity
  const formattedActivity = await Promise.all(
    recentActivity.map(async (activity) => {
      let projectName = "Unknown Project";
      if (activity.projectId) {
        const project = await database
          .collection("projects")
          .findOne({ _id: activity.projectId });
        if (project) {
          projectName = project.name;
        }
      }

      return {
        id: activity._id.toString(),
        action: activity.action,
        projectId: activity.projectId?.toString(),
        projectName,
        timestamp: activity.timestamp,
        details: activity.details,
      };
    })
  );

  const stats: UserDashboardStats = {
    totalProjects: projectIds.length,
    totalAssignedImages,
    completedImages,
    pendingReviewImages,
    rejectedImages,
    approvedImages,
    recentActivity: formattedActivity,
    projectsWithPendingWork: projectsWithPendingWork[0]?.count || 0,
  };

  return c.json(response.success(stats));
});

/**
 * @route GET /api/v1/user/dashboard/projects/:projectId/completion-status
 * @desc Check if a project is completely done for a user (all submissions approved)
 * @access Authenticated User
 */
userDashboardRouter.get("/projects/:projectId/completion-status", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new HTTPException(400, { message: "Project ID is required" });
  }

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }

  const database = db.getDb();
  const userId = currentUser._id;

  // Check if user is a member of the project
  const isMember = await services
    .projects()
    .isProjectMember(projectId, userId.toString());

  if (!isMember) {
    throw new HTTPException(403, {
      message: "Forbidden: Not a member of this project",
    });
  }

  // Get total assigned images count
  const totalAssigned = await database
    .collection("project_images")
    .countDocuments({
      projectId: new ObjectId(projectId),
      assignedTo: userId,
    });

  // If no images assigned, project is not relevant for this user
  if (totalAssigned === 0) {
    return c.json(
      response.success({
        isCompleted: false,
        hasAssignedImages: false,
        message: "No images assigned in this project",
      })
    );
  }

  // Get non-approved images count
  const pendingImages = await database
    .collection("project_images")
    .countDocuments({
      projectId: new ObjectId(projectId),
      assignedTo: userId,
      reviewStatus: { $ne: ReviewStatus.APPROVED },
    });

  // Get last submission status
  const lastSubmission = await database
    .collection("submission_reviews")
    .findOne(
      {
        projectId: new ObjectId(projectId),
        userId: userId,
      },
      { sort: { submittedAt: -1 } }
    );

  const hasCompletedSubmission =
    lastSubmission && lastSubmission.status === SubmissionStatus.APPROVED;

  // Project is complete if there are no pending images and there's at least one approved submission
  const isCompleted = pendingImages === 0 && hasCompletedSubmission === true;

  const result: ProjectCompletionStatus = {
    isCompleted,
    hasAssignedImages: true,
    pendingImages,
    totalAssigned,
    lastSubmissionStatus: lastSubmission?.status,
    message: isCompleted
      ? "All work completed and approved in this project"
      : "This project still has pending work",
  };

  return c.json(response.success(result));
});

export { userDashboardRouter };
