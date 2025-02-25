// src/services/project.service.ts
import { ObjectId } from "mongodb";
import { Projects, ImageAssignments } from "../config/mongo.js";
import { S3Service } from "./s3.service.js";
import type {
  Project,
  ProjectMember,
  ProjectStats,
  ProjectStatus,
  ImageAssignment,
} from "../types/project.types.js";

export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(
    adminUsername: string,
    projectData: Omit<Project, "_id" | "createdAt" | "createdBy" | "stats">
  ): Promise<string> {
    // Create project in MongoDB
    const project: Project = {
      ...projectData,
      createdAt: new Date(),
      createdBy: adminUsername,
      stats: {
        assignedImages: 0,
        completedImages: 0,
        approvedImages: 0,
        totalAnnotations: 0,
        lastActivity: new Date(),
      },
    };

    const result = await Projects.insertOne(project);
    const projectId = result.insertedId.toString();

    // Create project structure in S3
    await S3Service.createProjectStructure(projectId);

    // Save initial classes
    if (projectData.classes.length > 0) {
      await S3Service.saveClasses(projectId, projectData.classes);
    }

    return projectId;
  }

  /**
   * Update project details
   */
  static async updateProject(
    projectId: string,
    updates: Partial<Project>
  ): Promise<boolean> {
    const result = await Projects.updateOne(
      { _id: new ObjectId(projectId) as unknown as string },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Add member to project
   */
  static async addProjectMember(
    projectId: string,
    userId: string,
    allocationPercentage: number
  ): Promise<boolean> {
    const member: ProjectMember = {
      userId,
      allocationPercentage,
      assignedImages: [],
      completedImages: [],
      timeSpent: 0,
    };

    const result = await Projects.updateOne(
      { _id: new ObjectId(projectId) as unknown as string },
      { $push: { members: member } }
    );

    if (result.modifiedCount > 0) {
      // Trigger task redistribution
      await this.redistributeTasks(projectId);
      return true;
    }
    return false;
  }

  /**
   * Update member allocation
   */
  static async updateMemberAllocation(
    projectId: string,
    userId: string,
    newPercentage: number
  ): Promise<boolean> {
    const result = await Projects.updateOne(
      {
        _id: new ObjectId(projectId) as unknown as string,
        "members.userId": userId,
      },
      {
        $set: {
          "members.$.allocationPercentage": newPercentage,
        },
      }
    );

    if (result.modifiedCount > 0) {
      // Trigger task redistribution
      await this.redistributeTasks(projectId);
      return true;
    }
    return false;
  }

  /**
   * Remove member from project
   */
  static async removeMember(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const result = await Projects.updateOne(
      { _id: new ObjectId(projectId) as unknown as string },
      {
        $pull: {
          members: { userId },
        },
      }
    );

    if (result.modifiedCount > 0) {
      // Reassign member's tasks
      await this.redistributeTasks(projectId);
      return true;
    }
    return false;
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(projectId: string): Promise<ProjectStats> {
    const project = await Projects.findOne({
      _id: new ObjectId(projectId) as unknown as string,
    });

    if (!project) throw new Error("Project not found");

    const memberStats = project.members.map((member) => ({
      userId: member.userId,
      assigned: member.assignedImages.length,
      completed: member.completedImages.length,
      approved: 0, // Will be calculated from ImageAssignments
      timeSpent: member.timeSpent,
    }));

    // Get approved counts
    for (const stats of memberStats) {
      const approvedCount = await ImageAssignments.countDocuments({
        projectId,
        assignedTo: stats.userId,
        "review.status": "approved",
      });
      stats.approved = approvedCount;
    }

    return {
      totalImages: project.totalImages,
      assignedImages: project.stats.assignedImages,
      completedImages: project.stats.completedImages,
      approvedImages: project.stats.approvedImages,
      memberStats,
    };
  }

  /**
   * Redistribute tasks based on allocation percentages
   */
  private static async redistributeTasks(projectId: string): Promise<void> {
    const project = await Projects.findOne({
      _id: new ObjectId(projectId) as unknown as string,
    });

    if (!project) return;

    // Get all unassigned and incomplete images
    const assignments = await ImageAssignments.find({
      projectId,
      $or: [{ assignedTo: { $exists: false } }, { status: "pending" }],
    }).toArray();

    // Calculate assignments based on percentages
    const totalImages = assignments.length;
    const memberAllocations = new Map<string, number>();

    for (const member of project.members) {
      const allocation = Math.floor(
        totalImages * (member.allocationPercentage / 100)
      );
      memberAllocations.set(member.userId, allocation);
    }

    // Assign images to members
    for (const assignment of assignments) {
      // Find member with lowest current allocation
      let selectedMember = project.members[0]?.userId;
      let minAllocation = Infinity;

      for (const [userId, allocation] of memberAllocations) {
        if (allocation < minAllocation) {
          minAllocation = allocation;
          selectedMember = userId;
        }
      }

      if (selectedMember) {
        await ImageAssignments.updateOne(
          { _id: assignment._id },
          {
            $set: {
              assignedTo: selectedMember,
              assignedAt: new Date(),
              status: "pending",
            },
          }
        );

        // Update allocation count
        const currentAllocation = memberAllocations.get(selectedMember) || 0;
        memberAllocations.set(selectedMember, currentAllocation - 1);
      }
    }

    // Update project stats
    await this.updateProjectStats(projectId);
  }

  /**
   * Update project statistics
   */
  private static async updateProjectStats(projectId: string): Promise<void> {
    const [totalAssigned, totalCompleted, totalApproved, totalAnnotations] =
      await Promise.all([
        ImageAssignments.countDocuments({
          projectId,
          assignedTo: { $exists: true },
        }),
        ImageAssignments.countDocuments({ projectId, status: "completed" }),
        ImageAssignments.countDocuments({
          projectId,
          "review.status": "approved",
        }),
        ImageAssignments.countDocuments({ projectId }), // Total annotations
      ]);

    await Projects.updateOne(
      { _id: new ObjectId(projectId) as unknown as string },
      {
        $set: {
          "stats.assignedImages": totalAssigned,
          "stats.completedImages": totalCompleted,
          "stats.approvedImages": totalApproved,
          "stats.totalAnnotations": totalAnnotations,
          "stats.lastActivity": new Date(),
        },
      }
    );
  }

  /**
   * Mark project status
   */
  static async updateProjectStatus(
    projectId: string,
    status: ProjectStatus
  ): Promise<boolean> {
    const result = await Projects.updateOne(
      { _id: new ObjectId(projectId) as unknown as string },
      { $set: { status } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get member's assigned images
   */
  static async getMemberAssignments(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    assignments: ImageAssignment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      ImageAssignments.find({
        projectId,
        assignedTo: userId,
      })
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      ImageAssignments.countDocuments({
        projectId,
        assignedTo: userId,
      }),
    ]);

    return {
      assignments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update annotation review status
   */
  static async updateAnnotationReview(
    projectId: string,
    imageId: string,
    reviewerUsername: string,
    status: "approved" | "changes_requested",
    feedback?: string
  ): Promise<boolean> {
    try {
      const result = await ImageAssignments.updateOne(
        {
          projectId,
          imageId,
        },
        {
          $set: {
            "review.status": status,
            "review.reviewedBy": reviewerUsername,
            "review.reviewedAt": new Date(),
            "review.feedback": feedback,
          },
          $push: {
            "review.revisionHistory": {
              timestamp: new Date(),
              reviewer: reviewerUsername,
              status,
              feedback,
            },
          },
        }
      );

      if (result.modifiedCount > 0) {
        // Update project stats
        await this.updateProjectStats(projectId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating annotation review:", error);
      return false;
    }
  }

  /**
   * Check if a user has access to a project
   */
  static async userHasAccess(
    username: string,
    projectId: string
  ): Promise<boolean> {
    try {
      const project = await Projects.findOne({
        _id: new ObjectId(projectId) as unknown as string,
        "members.userId": username,
      });

      return !!project;
    } catch (error) {
      console.error("Error checking project access:", error);
      return false;
    }
  }

  /**
   * Submit project for review
   */
  static async submitProject(
    projectId: string,
    username: string
  ): Promise<boolean> {
    try {
      // First verify user has access to the project
      const hasAccess = await this.userHasAccess(username, projectId);
      if (!hasAccess) return false;

      // Update all pending/completed assignments to review_pending status
      const result = await ImageAssignments.updateMany(
        {
          projectId,
          assignedTo: username,
          status: { $in: ["completed", "in_progress"] },
        },
        {
          $set: {
            status: "review_pending",
            "review.reviewedBy": null,
            "review.reviewedAt": null,
            "review.status": "pending",
          },
        }
      );

      // Update project stats
      await this.updateProjectStats(projectId);

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error submitting project:", error);
      return false;
    }
  }

  /**
   * Unmark project submission
   */
  static async unmarkSubmission(projectId: string): Promise<boolean> {
    try {
      // Change status from review_pending back to completed
      const result = await ImageAssignments.updateMany(
        {
          projectId,
          status: "review_pending",
        },
        {
          $set: {
            status: "completed",
            "review.status": "changes_requested",
          },
        }
      );

      // Update project stats
      await this.updateProjectStats(projectId);

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error unmarking project submission:", error);
      return false;
    }
  }
  
  /**
   * Get project classes
   */
  static async getClasses(projectId: string): Promise<string[]> {
    try {
      const project = await Projects.findOne({
        _id: new ObjectId(projectId) as unknown as string,
      });

      if (!project) return [];

      return project.classes || [];
    } catch (error) {
      console.error("Error getting project classes:", error);
      return [];
    }
  }

  /**
   * Update project classes
   */
  static async updateClasses(
    projectId: string,
    classes: string[]
  ): Promise<boolean> {
    try {
      const result = await Projects.updateOne(
        { _id: new ObjectId(projectId) as unknown as string },
        { $set: { classes } }
      );

      if (result.modifiedCount > 0) {
        // Also update the classes in S3 to keep them in sync
        await S3Service.saveClasses(projectId, classes);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating project classes:", error);
      return false;
    }
  }

  /**
   * Get project submission status
   */
  static async getProjectSubmissionStatus(
    projectId: string
  ): Promise<{ isSubmitted: boolean; submittedAt?: Date }> {
    try {
      // We need to implement a way to check project submission status
      // Let's check if any submission record exists in a separate collection or field

      // As a workaround, we can check if all assigned images are marked as completed
      const project = await Projects.findOne({
        _id: new ObjectId(projectId) as unknown as string,
      });

      if (!project) {
        return { isSubmitted: false };
      }

      // Check if we already have a separate field for tracking submission
      // This would be a good time to add this field to our schema
      const submissions = await ImageAssignments.find({
        projectId,
        status: "review_pending",
      }).toArray();

      const isSubmitted = submissions.length > 0;
      const submittedAt = isSubmitted
        ? submissions.reduce((latest, sub) => {
            return sub.assignedAt > latest ? sub.assignedAt : latest;
          }, new Date(0))
        : undefined;

      return {
        isSubmitted,
        submittedAt,
      };
    } catch (error) {
      console.error("Error getting project submission status:", error);
      return { isSubmitted: false };
    }
  }
}
