// src/services/submission-service.ts
import { ObjectId } from "mongodb";
import {
  AssignmentStatus,
  type SubmissionReview,
  type ProjectImage,
  ImageStatus,
  ReviewStatus,
  type SubmitForReviewRequest,
  type ReviewSubmissionRequest,
  type FlaggedImage,
  type ReviewHistoryItem,
  SubmissionStatus,
  AnnotationStatus,
  ProjectStatus,
  type ImageFeedback,
} from "../types/index.js";
import { db } from "../config/index.js";
import { BaseService } from "./base-service.js";

export class SubmissionService extends BaseService<SubmissionReview> {
  constructor() {
    super("submission_reviews");
  }

  /**
   * Submit assignment for review
   */
  async submitForReview(
    projectId: string,
    userId: string,
    data: SubmitForReviewRequest
  ): Promise<SubmissionReview> {
    const database = db.getDb();
    // Check if project allows submissions (not completed)
    const project = await database.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });
    if (project && project.status === ProjectStatus.COMPLETED) {
      throw new Error(
        "Project is marked as complete. No new submissions allowed."
      );
    }
    // Get assignment
    const assignment = await database.collection("image_assignments").findOne({
      _id: new ObjectId(data.assignmentId),
    });
    if (!assignment) {
      throw new Error("Assignment not found");
    }
    if (assignment.userId.toString() !== userId) {
      throw new Error("You do not own this assignment");
    }
    if (
      assignment.status === AssignmentStatus.SUBMITTED ||
      assignment.status === AssignmentStatus.UNDER_REVIEW
    ) {
      throw new Error("Assignment is already submitted for review");
    }
    // Check if there's a pending submission for this user in this project
    const pendingSubmission = await this.findOne({
      projectId: new ObjectId(projectId),
      userId: new ObjectId(userId),
      status: {
        $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
      },
    });
    if (pendingSubmission) {
      throw new Error("You already have a pending submission for this project");
    }
    // Get all images that are ready for submission (exclude already approved ones)
    const imageIds = assignment.imageIds.slice();
    const approvedImages = await database
      .collection("project_images")
      .find({
        _id: { $in: assignment.imageIds },
        reviewStatus: ReviewStatus.APPROVED,
      })
      .toArray();
    const approvedImageIds = approvedImages.map((img) => img._id);
    const submittableImageIds = imageIds.filter(
      (id: ObjectId) =>
        !approvedImageIds.some((approvedId) => approvedId.equals(id))
    );
    if (submittableImageIds.length === 0) {
      throw new Error(
        "No images to submit. All assigned images are already approved."
      );
    }
    
    // Initialize empty imageFeedback array for the new submission
    const imageFeedback: ImageFeedback[] = [];
    
    // Create submission
    const newSubmission: Omit<SubmissionReview, "_id"> = {
      projectId: new ObjectId(projectId),
      userId: new ObjectId(userId),
      assignmentId: assignment._id,
      imageIds: submittableImageIds,
      submittedAt: new Date(),
      status: SubmissionStatus.SUBMITTED,
      message: data.message || "",
      feedback: "",
      flaggedImages: [],
      imageFeedback, // Add the empty imageFeedback array
      reviewHistory: [],
    };
    const result = await this.create(newSubmission);
    // Update assignment status
    await database.collection("image_assignments").updateOne(
      { _id: assignment._id },
      {
        $set: {
          status: AssignmentStatus.SUBMITTED,
          lastActivity: new Date(),
        },
      }
    );
    // Update image statuses
    await database.collection<ProjectImage>("project_images").updateMany(
      { _id: { $in: submittableImageIds } },
      {
        $set: {
          status: ImageStatus.UNDER_REVIEW,
          currentSubmissionId: result._id,
        },
      }
    );
    return result;
  }

  /**
   * Review submission
   */
  async reviewSubmission(
    submissionId: string,
    reviewedBy: string,
    data: ReviewSubmissionRequest
  ): Promise<SubmissionReview> {
    const database = db.getDb();
    // Get submission
    const submission = await this.findById(submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }
    if (
      submission.status !== SubmissionStatus.SUBMITTED &&
      submission.status !== SubmissionStatus.UNDER_REVIEW
    ) {
      throw new Error("Submission is not available for review");
    }
    // Convert flagged image IDs to ObjectIds
    const flaggedImages: FlaggedImage[] = (data.flaggedImages || []).map(
      (img) => ({
        imageId: new ObjectId(img.imageId),
        reason: img.reason,
      })
    );
    
    // Initialize array for image-specific feedback
    const imageFeedback: ImageFeedback[] = [];
    
    // Populate imageFeedback array with feedback for specific images
    if (data.imageFeedback && Array.isArray(data.imageFeedback)) {
      for (const feedback of data.imageFeedback) {
        if (feedback.imageId && feedback.feedback) {
          imageFeedback.push({
            imageId: new ObjectId(feedback.imageId),
            feedback: feedback.feedback
          });
        }
      }
    }
    
    // Create review history entry
    const reviewHistoryItem: ReviewHistoryItem = {
      reviewedBy: new ObjectId(reviewedBy),
      reviewedAt: new Date(),
      status: data.status,
      feedback: data.feedback || "",
      flaggedImages,
      imageFeedback, // Add imageFeedback to review history
    };
    
    // Update submission
    const updatedSubmission = await this.update(submissionId, {
      reviewedBy: new ObjectId(reviewedBy),
      reviewedAt: new Date(),
      status: data.status,
      feedback: data.feedback || "",
      flaggedImages,
      imageFeedback, // Update imageFeedback in the submission
    });
    
    if (!updatedSubmission) {
      throw new Error("Failed to update submission");
    }
    
    // Add review history
    await this.collection().updateOne(
      { _id: new ObjectId(submissionId) },
      { $push: { reviewHistory: reviewHistoryItem } }
    );
    
    // Update assignment status
    let assignmentStatus: AssignmentStatus;
    switch (data.status) {
      case SubmissionStatus.APPROVED:
        assignmentStatus = AssignmentStatus.COMPLETED;
        break;
      case SubmissionStatus.REJECTED:
        assignmentStatus = AssignmentStatus.NEEDS_REVISION;
        break;
      default:
        assignmentStatus = AssignmentStatus.UNDER_REVIEW;
    }
    
    await database.collection("image_assignments").updateOne(
      { _id: submission.assignmentId },
      {
        $set: {
          status: assignmentStatus,
          lastActivity: new Date(),
        },
      }
    );
    
    // Update image statuses - but NOT the reviewFeedback field as before
    if (data.status === SubmissionStatus.APPROVED) {
      // Mark all images as approved
      await database.collection<ProjectImage>("project_images").updateMany(
        { _id: { $in: submission.imageIds } },
        {
          $set: {
            status: ImageStatus.APPROVED,
            reviewStatus: ReviewStatus.APPROVED,
            reviewedBy: new ObjectId(reviewedBy),
            reviewedAt: new Date(),
            // We're no longer setting reviewFeedback here
          },
        }
      );
    } else if (data.status === SubmissionStatus.REJECTED) {
      // Process flagged images
      const flaggedImageIds = flaggedImages.map((img) => img.imageId);
      if (flaggedImageIds.length > 0) {
        // Update flagged images status but not feedback
        await database.collection<ProjectImage>("project_images").updateMany(
          { _id: { $in: flaggedImageIds } },
          {
            $set: {
              status: ImageStatus.REVIEWED,
              reviewStatus: ReviewStatus.FLAGGED,
              reviewedBy: new ObjectId(reviewedBy),
              reviewedAt: new Date(),
              // We're no longer setting reviewFeedback here
            },
          }
        );
      }
      
      // Update non-flagged images
      const nonFlaggedImageIds = submission.imageIds.filter(
        (id) =>
          !flaggedImageIds.some((flaggedId) => flaggedId.equals(id))
      );
      
      if (nonFlaggedImageIds.length > 0) {
        await database.collection<ProjectImage>("project_images").updateMany(
          { _id: { $in: nonFlaggedImageIds } },
          {
            $set: {
              status: ImageStatus.ANNOTATED,
              reviewedBy: new ObjectId(reviewedBy),
              reviewedAt: new Date(),
              // We're no longer setting reviewFeedback here
            },
          }
        );
      }
    }
    
    // Check if all user's images are now approved
    const assignment = await database.collection("image_assignments").findOne({
      _id: submission.assignmentId,
    });
    
    if (assignment) {
      const pendingImages = await database
        .collection<ProjectImage>("project_images")
        .countDocuments({
          _id: { $in: assignment.imageIds },
          reviewStatus: { $ne: ReviewStatus.APPROVED },
        });
        
      if (pendingImages === 0) {
        // All images are approved, update assignment to completed
        await database
          .collection("image_assignments")
          .updateOne(
            { _id: assignment._id },
            {
              $set: {
                status: AssignmentStatus.COMPLETED,
                completedImages: assignment.totalImages,
              },
            }
          );
      }
    }
    
    // Update project stats
    await this.updateProjectStats(submission.projectId.toString());
    
    // Check if all project images are now approved, and if so, propose marking the project as completed
    const projectId = submission.projectId;
    const totalImages = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId,
      });
      
    const approvedImages = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId,
        reviewStatus: ReviewStatus.APPROVED,
      });
      
    if (totalImages > 0 && totalImages === approvedImages) {
      // All images are approved, suggest updating project status to completed
      console.log(
        `All images in project ${projectId} are approved. Consider marking the project as completed.`
      );
    }
    
    return updatedSubmission;
  }

  /**
   * Get image feedback for a specific submission
   */
  async getImageFeedback(
    submissionId: string,
    imageId: string
  ): Promise<string | null> {
    const submission = await this.findById(submissionId);
    if (!submission) {
      return null;
    }
    
    // Find feedback for this image in the submission
    const feedbackEntry = submission.imageFeedback?.find(
      (entry) => entry.imageId.toString() === imageId
    );
    
    return feedbackEntry ? feedbackEntry.feedback : null;
  }

  // The rest of the methods remain unchanged...
  
  /**
   * Get project submissions
   */
  async getProjectSubmissions(
    projectId: string,
    page: number = 1,
    limit: number = 20,
    status?: SubmissionStatus,
    userId?: string
  ): Promise<{ submissions: SubmissionReview[]; total: number }> {
    const query: Record<string, any> = {
      projectId: new ObjectId(projectId),
    };
    
    if (status) {
      query.status = status;
    }
    
    if (userId) {
      query.userId = new ObjectId(userId);
    }
    
    const { items, total } = await this.paginate(query, page, limit, {
      submittedAt: -1,
    });
    
    return { submissions: items, total };
  }

  /**
   * Get user submissions
   */
  async getUserSubmissions(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ submissions: SubmissionReview[]; total: number }> {
    const query = {
      projectId: new ObjectId(projectId),
      userId: new ObjectId(userId),
    };
    
    const { items, total } = await this.paginate(query, page, limit, {
      submittedAt: -1,
    });
    
    return { submissions: items, total };
  }

  /**
   * Get submission statistics for a project
   */
  async getSubmissionStats(projectId: string): Promise<{
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
  }> {
    const database = db.getDb();
    const projectObjectId = new ObjectId(projectId);
    
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
    ] = await Promise.all([
      database.collection("submission_reviews").countDocuments({
        projectId: projectObjectId,
      }),
      database.collection("submission_reviews").countDocuments({
        projectId: projectObjectId,
        status: {
          $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      }),
      database.collection("submission_reviews").countDocuments({
        projectId: projectObjectId,
        status: SubmissionStatus.APPROVED,
      }),
      database.collection("submission_reviews").countDocuments({
        projectId: projectObjectId,
        status: SubmissionStatus.REJECTED,
      }),
    ]);
    
    return {
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
    };
  }

  /**
   * Check if a user can submit images for a project
   */
  async canUserSubmit(
    projectId: string,
    userId: string
  ): Promise<{
    canSubmit: boolean;
    reason?: string;
    hasAssignedImages: boolean;
    pendingSubmission?: boolean;
  }> {
    const database = db.getDb();
    const projectObjectId = new ObjectId(projectId);
    const userObjectId = new ObjectId(userId);
    
    // Check if project is completed
    const project = await database.collection("projects").findOne({
      _id: projectObjectId,
    });
    
    if (project?.status === ProjectStatus.COMPLETED) {
      return {
        canSubmit: false,
        reason: "Project is marked as complete",
        hasAssignedImages: false,
      };
    }
    
    // Check for pending submissions
    const pendingSubmission = await database
      .collection("submission_reviews")
      .findOne({
        projectId: projectObjectId,
        userId: userObjectId,
        status: {
          $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      });
      
    if (pendingSubmission) {
      return {
        canSubmit: false,
        reason: "You have a pending submission awaiting review",
        hasAssignedImages: true,
        pendingSubmission: true,
      };
    }
    
    // Get assigned images that are not approved
    const images = await database
      .collection("project_images")
      .find({
        projectId: projectObjectId,
        assignedTo: userObjectId,
        reviewStatus: { $ne: ReviewStatus.APPROVED },
        annotationStatus: AnnotationStatus.COMPLETED,
      })
      .toArray();
      
    if (images.length === 0) {
      // Check if user has any assigned images at all
      const assignedImages = await database
        .collection("project_images")
        .countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
        });
        
      if (assignedImages === 0) {
        return {
          canSubmit: false,
          reason: "No images assigned to you",
          hasAssignedImages: false,
        };
      } else {
        return {
          canSubmit: false,
          reason:
            "All your assigned images are already approved or not fully annotated",
          hasAssignedImages: true,
        };
      }
    }
    
    return {
      canSubmit: true,
      hasAssignedImages: true,
    };
  }

  /**
   * Get a user's submission status for a project
   */
  async getUserProjectSubmissionStatus(
    projectId: string,
    userId: string
  ): Promise<{
    totalAssigned: number;
    completed: number;
    flagged: number;
    approved: number;
    pendingReview: number;
    progress: number;
    canSubmit: boolean;
    pendingSubmission?: SubmissionReview;
  }> {
    const database = db.getDb();
    const projectObjectId = new ObjectId(projectId);
    const userObjectId = new ObjectId(userId);
    
    // Get counts for different image statuses
    const [totalAssigned, completed, flagged, approved, pendingReview] =
      await Promise.all([
        database.collection("project_images").countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
        }),
        database.collection("project_images").countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
          annotationStatus: AnnotationStatus.COMPLETED,
          reviewStatus: ReviewStatus.NOT_REVIEWED,
        }),
        database.collection("project_images").countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
          reviewStatus: ReviewStatus.FLAGGED,
        }),
        database.collection("project_images").countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
          reviewStatus: ReviewStatus.APPROVED,
        }),
        database.collection("project_images").countDocuments({
          projectId: projectObjectId,
          assignedTo: userObjectId,
          status: ImageStatus.UNDER_REVIEW,
        }),
      ]);
      
    // Check if there's a pending submission
    const pendingSubmissionDoc = await database
      .collection("submission_reviews")
      .findOne({
        projectId: projectObjectId,
        userId: userObjectId,
        status: {
          $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      });
      
    // Convert MongoDB document to SubmissionReview type if exists
    const pendingSubmission = pendingSubmissionDoc
      ? ({
          _id: pendingSubmissionDoc._id,
          projectId: pendingSubmissionDoc.projectId,
          userId: pendingSubmissionDoc.userId,
          assignmentId: pendingSubmissionDoc.assignmentId,
          imageIds: pendingSubmissionDoc.imageIds || [],
          submittedAt: pendingSubmissionDoc.submittedAt,
          status: pendingSubmissionDoc.status as SubmissionStatus,
          message: pendingSubmissionDoc.message || "",
          feedback: pendingSubmissionDoc.feedback || "",
          flaggedImages: pendingSubmissionDoc.flaggedImages || [],
          imageFeedback: pendingSubmissionDoc.imageFeedback || [],
          reviewHistory: pendingSubmissionDoc.reviewHistory || [],
          reviewedBy: pendingSubmissionDoc.reviewedBy,
          reviewedAt: pendingSubmissionDoc.reviewedAt,
        } as SubmissionReview)
      : undefined;
      
    // Calculate progress
    const progress =
      totalAssigned > 0 ? Math.round((approved / totalAssigned) * 100) : 0;
      
    // Determine if user can submit
    const canSubmit = !pendingSubmission && completed > 0;
    
    return {
      totalAssigned,
      completed,
      flagged,
      approved,
      pendingReview,
      progress,
      canSubmit,
      pendingSubmission: pendingSubmission || undefined,
    };
  }

  /**
   * Update project statistics
   */
  private async updateProjectStats(projectId: string): Promise<void> {
    const database = db.getDb();
    const projectImages = database.collection("project_images");
    
    // Get image counts
    const totalImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
    });
    
    const annotatedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      annotationStatus: AnnotationStatus.COMPLETED,
    });
    
    const reviewedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      reviewStatus: { $in: [ReviewStatus.APPROVED, ReviewStatus.FLAGGED] },
    });
    
    const approvedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      reviewStatus: ReviewStatus.APPROVED,
    });
    
    // Calculate completion percentage
    const completionPercentage =
      totalImages > 0 ? Math.round((approvedImages / totalImages) * 100) : 0;
      
    // Update project
    await database.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          totalImages,
          annotatedImages,
          reviewedImages,
          approvedImages,
          completionPercentage,
          updatedAt: new Date(),
        },
      }
    );
  }
}