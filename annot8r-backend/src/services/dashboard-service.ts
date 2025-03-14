// src/services/dashboard-service.ts
import { ObjectId } from "mongodb";
import {
  type UserDashboardStats,
  type ProjectCompletionStatus,
  ReviewStatus,
  AnnotationStatus,
} from "../types/index.js";
import { db } from "../config/index.js";
import { BaseService } from "./base-service.js";

export class DashboardService extends BaseService<Record<string, any>> {
  constructor() {
    super("activity_logs"); // We'll use activity logs as the base collection for tracking
  }

  /**
   * Get dashboard statistics for a user
   */
  async getUserDashboardStats(userId: string): Promise<UserDashboardStats> {
    const database = db.getDb();
    const userObjectId = new ObjectId(userId);

    // Get projects where user is a member
    const memberEntries = await database
      .collection("project_members")
      .find({ userId: userObjectId })
      .toArray();

    const projectIds = memberEntries.map((entry) => entry.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalAssignedImages: 0,
        completedImages: 0,
        pendingReviewImages: 0,
        rejectedImages: 0,
        approvedImages: 0,
        recentActivity: [],
        projectsWithPendingWork: 0,
      };
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
        assignedTo: userObjectId,
      }),
      database.collection("project_images").countDocuments({
        projectId: { $in: projectIds },
        assignedTo: userObjectId,
        annotationStatus: AnnotationStatus.COMPLETED,
        reviewStatus: { $ne: ReviewStatus.APPROVED },
      }),
      database.collection("project_images").countDocuments({
        projectId: { $in: projectIds },
        assignedTo: userObjectId,
        status: "UNDER_REVIEW",
      }),
      database.collection("project_images").countDocuments({
        projectId: { $in: projectIds },
        assignedTo: userObjectId,
        reviewStatus: ReviewStatus.FLAGGED,
      }),
      database.collection("project_images").countDocuments({
        projectId: { $in: projectIds },
        assignedTo: userObjectId,
        reviewStatus: ReviewStatus.APPROVED,
      }),
    ]);

    // Count projects with pending work
    const projectsWithPendingWorkAgg = await database
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
                      { $eq: ["$assignedTo", userObjectId] },
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

    const projectsWithPendingWork = projectsWithPendingWorkAgg[0]?.count || 0;

    // Get recent activities
    const recentActivity = await database
      .collection("activity_logs")
      .find({
        userId: userObjectId,
        projectId: { $in: projectIds },
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

    return {
      totalProjects: projectIds.length,
      totalAssignedImages,
      completedImages,
      pendingReviewImages,
      rejectedImages,
      approvedImages,
      recentActivity: formattedActivity,
      projectsWithPendingWork,
    };
  }

  /**
   * Check project completion status for a user
   */
  async getProjectCompletionStatus(
    projectId: string,
    userId: string
  ): Promise<ProjectCompletionStatus> {
    const database = db.getDb();
    const projectObjectId = new ObjectId(projectId);
    const userObjectId = new ObjectId(userId);

    // Get total assigned images count
    const totalAssigned = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjectId,
        assignedTo: userObjectId,
      });

    // If no images assigned, project is not relevant for this user
    if (totalAssigned === 0) {
      return {
        isCompleted: false,
        hasAssignedImages: false,
        message: "No images assigned in this project",
      };
    }

    // Get non-approved images count
    const pendingImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjectId,
        assignedTo: userObjectId,
        reviewStatus: { $ne: ReviewStatus.APPROVED },
      });

    // Get last submission status
    const lastSubmission = await database
      .collection("submission_reviews")
      .findOne(
        {
          projectId: projectObjectId,
          userId: userObjectId,
        },
        { sort: { submittedAt: -1 } }
      );

    const hasCompletedSubmission =
      lastSubmission && lastSubmission.status === "APPROVED";

    // Project is complete if there are no pending images and there's at least one approved submission
    const isCompleted = pendingImages === 0 && hasCompletedSubmission === true;

    return {
      isCompleted,
      hasAssignedImages: true,
      pendingImages,
      totalAssigned,
      lastSubmissionStatus: lastSubmission?.status,
      message: isCompleted
        ? "All work completed and approved in this project"
        : "This project still has pending work",
    };
  }
}
