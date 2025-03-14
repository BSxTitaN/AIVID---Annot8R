// src/services/assignment-service.ts
import { ObjectId, type Filter } from "mongodb";
import {
  AssignmentStatus,
  type ImageAssignment,
  type ProjectImage,
  ImageStatus,
  AnnotationStatus,
} from "../types/index.js";
import { db } from "../config/index.js";
import { BaseService } from "./base-service.js";

export interface UserProgressMetrics {
  userId: string;
  totalAssigned: number;
  annotated: number;
  unannotated: number;
  progress: number;
  timeSpent: number; // Time spent in seconds
  averageTimePerImage: number; // Average time per image in seconds
  lastActivity: Date | null;
}

export interface AssignmentMetrics {
  totalImages: number;
  unassignedImages: number;
  assignedImages: number;
  annotatedImages: number;
  redistributableImages: number;
  userProgress: UserProgressMetrics[];
}

export class AssignmentService extends BaseService<ImageAssignment> {
  constructor() {
    super("image_assignments");
  }

  /**
   * Get assignment metrics for a project
   */
  async getAssignmentMetrics(projectId: string): Promise<AssignmentMetrics> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // Get project for total images
    const project = await database
      .collection("projects")
      .findOne({ _id: projectObjId });
    if (!project) {
      throw new Error("Project not found");
    }

    // Get counts for different image statuses
    const unassignedImages = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId: projectObjId,
        assignedTo: { $exists: false },
      });

    const assignedImages = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId: projectObjId,
        assignedTo: { $exists: true },
      });

    const annotatedImages = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId: projectObjId,
        annotationStatus: AnnotationStatus.COMPLETED,
      });

    // Calculate assigned but not annotated images
    const assignedButNotAnnotated = await database
      .collection<ProjectImage>("project_images")
      .countDocuments({
        projectId: projectObjId,
        assignedTo: { $exists: true },
        annotationStatus: { $ne: AnnotationStatus.COMPLETED },
      });

    // Total redistributable = unassigned images + assigned but not annotated images
    // This includes images annotated by deleted members (they're unassigned)
    const redistributableImages = unassignedImages + assignedButNotAnnotated;

    // Get user progress metrics
    const userProgress = await this.getUserProgressMetrics(projectId);

    return {
      totalImages: project.totalImages || 0,
      unassignedImages,
      assignedImages,
      annotatedImages,
      redistributableImages,
      userProgress,
    };
  }

  /**
   * Get user progress metrics for a project
   */
  async getUserProgressMetrics(
    projectId: string
  ): Promise<UserProgressMetrics[]> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // First get all project members with ANNOTATOR role
    const members = await database
      .collection("project_members")
      .find({
        projectId: projectObjId,
        role: "ANNOTATOR",
      })
      .toArray();

    const userMetrics: UserProgressMetrics[] = [];

    // For each member, get their progress metrics
    for (const member of members) {
      const userId = member.userId;

      // Total assigned
      const totalAssigned = await database
        .collection<ProjectImage>("project_images")
        .countDocuments({
          projectId: projectObjId,
          assignedTo: userId,
        });

      // Annotated
      const annotated = await database
        .collection<ProjectImage>("project_images")
        .countDocuments({
          projectId: projectObjId,
          assignedTo: userId,
          annotationStatus: AnnotationStatus.COMPLETED,
        });

      // Unannotated (assigned but not annotated)
      const unannotated = totalAssigned - annotated;

      // Progress percentage
      const progress =
        totalAssigned > 0 ? Math.round((annotated / totalAssigned) * 100) : 0;

      // Get time spent by the user on this project
      const annotations = await database
        .collection("annotations")
        .find({
          projectId: projectObjId,
          userId: userId,
        })
        .toArray();

      // Calculate total time spent (in seconds)
      const timeSpent = annotations.reduce(
        (total, annotation) => total + (annotation.timeSpent || 0),
        0
      );

      // Calculate average time per annotated image
      const averageTimePerImage =
        annotated > 0 ? Math.round(timeSpent / annotated) : 0;

      // Get last activity timestamp for this user in this project
      const lastActivity = await this.getUserLastActivity(projectObjId, userId);

      userMetrics.push({
        userId: userId.toString(),
        totalAssigned,
        annotated,
        unannotated,
        progress,
        timeSpent,
        averageTimePerImage,
        lastActivity,
      });
    }

    return userMetrics;
  }

  /**
   * Get user's last activity in a project
   */
  private async getUserLastActivity(
    projectId: ObjectId,
    userId: ObjectId
  ): Promise<Date | null> {
    const database = db.getDb();

    // Check annotations
    const latestAnnotation = await database
      .collection("annotations")
      .find({
        projectId: projectId,
        userId: userId,
      })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray();

    // Check assignments
    const latestAssignment = await database
      .collection("image_assignments")
      .find({
        projectId: projectId,
        userId: userId,
        lastActivity: { $exists: true },
      })
      .sort({ lastActivity: -1 })
      .limit(1)
      .toArray();

    // Check submissions
    const latestSubmission = await database
      .collection("submission_reviews")
      .find({
        projectId: projectId,
        userId: userId,
      })
      .sort({ submittedAt: -1 })
      .limit(1)
      .toArray();

    // Compare timestamps and return the most recent one
    const timestamps = [
      latestAnnotation[0]?.updatedAt,
      latestAssignment[0]?.lastActivity,
      latestSubmission[0]?.submittedAt,
    ].filter(Boolean);

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps.map((date) => date.getTime())));
  }

  /**
   * Create manual assignment with redistribution support
   */
  async createManualAssignment(
    projectId: string,
    assignmentData: {
      userAssignments: {
        userId: string;
        count: number;
      }[];
    },
    assignedBy: ObjectId,
    resetDistribution: boolean = false
  ): Promise<boolean> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // 1. Collect all assignable images
    let assignableImages: ProjectImage[] = [];

    // Get unassigned images
    const unassignedImages = await database
      .collection<ProjectImage>("project_images")
      .find({
        projectId: projectObjId,
        assignedTo: { $exists: false },
      } as Filter<ProjectImage>)
      .toArray();

    assignableImages = [...unassignedImages];

    // If reset distribution is enabled, also include assigned but unannotated images
    if (resetDistribution) {
      const redistributableImages = await database
        .collection<ProjectImage>("project_images")
        .find({
          projectId: projectObjId,
          assignedTo: { $exists: true },
          annotationStatus: { $ne: AnnotationStatus.COMPLETED },
        } as Filter<ProjectImage>)
        .toArray();

      assignableImages = [...assignableImages, ...redistributableImages];
    }

    if (assignableImages.length === 0) {
      throw new Error("No assignable images available");
    }

    // 2. Verify all users are project members
    for (const assignment of assignmentData.userAssignments) {
      const userObjId = new ObjectId(assignment.userId);

      const isMember = await database.collection("project_members").findOne({
        projectId: projectObjId,
        userId: userObjId,
        role: "ANNOTATOR",
      });

      if (!isMember) {
        throw new Error(
          `User ${assignment.userId} is not an annotator for this project`
        );
      }
    }

    // 3. Process each user assignment
    let imagesToAssign = [...assignableImages];

    for (const userAssignment of assignmentData.userAssignments) {
      if (userAssignment.count <= 0) {
        continue;
      }

      const userObjId = new ObjectId(userAssignment.userId);

      // Select images for this user
      const userImages = imagesToAssign.slice(0, userAssignment.count);

      if (userImages.length === 0) {
        continue;
      }

      const userImageIds = userImages.map((img) => img._id);

      // If resetting distribution, revoke previous assignments for these images
      if (resetDistribution) {
        // Find existing assignments for these images
        const existingAssignments = await database
          .collection<ImageAssignment>("image_assignments")
          .find({
            projectId: projectObjId,
            imageIds: { $in: userImageIds },
          } as Filter<ImageAssignment>)
          .toArray();

        // Update existing assignments by removing these images
        for (const assignment of existingAssignments) {
          const remainingImageIds = assignment.imageIds.filter(
            (imgId) => !userImageIds.some((id) => id.equals(imgId))
          );

          if (remainingImageIds.length > 0) {
            // Update assignment with remaining images
            await database.collection("image_assignments").updateOne(
              { _id: assignment._id },
              {
                $set: {
                  imageIds: remainingImageIds,
                  totalImages: remainingImageIds.length,
                },
              }
            );
          } else {
            // Delete assignment if no images remain
            await database
              .collection("image_assignments")
              .deleteOne({ _id: assignment._id });
          }
        }
      }

      // Check if user already has an assignment for this project
      const existingAssignment = await database
        .collection<ImageAssignment>("image_assignments")
        .findOne({
          projectId: projectObjId,
          userId: userObjId,
          status: {
            $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
          },
        } as Filter<ImageAssignment>);

      if (existingAssignment) {
        // Update existing assignment
        const updatedImageIds = [
          ...existingAssignment.imageIds,
          ...userImageIds,
        ];

        await database.collection("image_assignments").updateOne(
          { _id: existingAssignment._id },
          {
            $set: {
              imageIds: updatedImageIds,
              totalImages: updatedImageIds.length,
              lastActivity: new Date(),
            },
          }
        );
      } else {
        // Create new assignment
        const assignment: Omit<ImageAssignment, "_id"> = {
          projectId: projectObjId,
          userId: userObjId,
          imageIds: userImageIds,
          assignedAt: new Date(),
          assignedBy,
          status: AssignmentStatus.ASSIGNED,
          totalImages: userImages.length,
          completedImages: 0,
        };

        await this.create(assignment);
      }

      // Update image records
      await database
        .collection<ProjectImage>("project_images")
        .updateMany({ _id: { $in: userImageIds } } as Filter<ProjectImage>, {
          $set: {
            assignedTo: userObjId,
            status: ImageStatus.ASSIGNED,
          },
        });

      // Remove assigned images from pool
      imagesToAssign = imagesToAssign.filter(
        (img) => !userImageIds.some((id) => id.equals(img._id))
      );
    }

    return true;
  }

  /**
   * Create smart distribution assignment with redistribution support
   */
  async createSmartDistribution(
    projectId: string,
    assignedBy: ObjectId,
    resetDistribution: boolean = false
  ): Promise<boolean> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // 1. Collect all assignable images
    let assignableImages: ProjectImage[] = [];

    // Get unassigned images
    const unassignedImages = await database
      .collection<ProjectImage>("project_images")
      .find({
        projectId: projectObjId,
        assignedTo: { $exists: false },
      } as Filter<ProjectImage>)
      .toArray();

    assignableImages = [...unassignedImages];

    // If reset distribution is enabled, also include assigned but unannotated images
    if (resetDistribution) {
      const redistributableImages = await database
        .collection<ProjectImage>("project_images")
        .find({
          projectId: projectObjId,
          assignedTo: { $exists: true },
          annotationStatus: { $ne: AnnotationStatus.COMPLETED },
        } as Filter<ProjectImage>)
        .toArray();

      assignableImages = [...assignableImages, ...redistributableImages];
    }

    if (assignableImages.length === 0) {
      throw new Error("No assignable images available");
    }

    // Get project members with ANNOTATOR role
    const annotators = await database
      .collection("project_members")
      .find({
        projectId: projectObjId,
        role: "ANNOTATOR",
      })
      .toArray();

    if (annotators.length === 0) {
      throw new Error("No annotators available for this project");
    }

    const userCount = annotators.length;
    const totalAssignable = assignableImages.length;

    // Calculate base distribution
    const baseCount = Math.floor(totalAssignable / userCount);
    const remainder = totalAssignable % userCount;

    let imagesToAssign = [...assignableImages];

    // If resetting distribution, revoke previous assignments for assignable images
    if (resetDistribution) {
      const assignableImageIds = assignableImages.map((img) => img._id);

      // Find existing assignments for these images
      const existingAssignments = await database
        .collection<ImageAssignment>("image_assignments")
        .find({
          projectId: projectObjId,
          imageIds: { $in: assignableImageIds },
        } as Filter<ImageAssignment>)
        .toArray();

      // Update existing assignments by removing these images
      for (const assignment of existingAssignments) {
        const remainingImageIds = assignment.imageIds.filter(
          (imgId) => !assignableImageIds.some((id) => id.equals(imgId))
        );

        if (remainingImageIds.length > 0) {
          // Update assignment with remaining images
          await database.collection("image_assignments").updateOne(
            { _id: assignment._id },
            {
              $set: {
                imageIds: remainingImageIds,
                totalImages: remainingImageIds.length,
              },
            }
          );
        } else {
          // Delete assignment if no images remain
          await database
            .collection("image_assignments")
            .deleteOne({ _id: assignment._id });
        }
      }
    }

    // Distribute images
    for (let i = 0; i < userCount; i++) {
      const userId = annotators[i].userId;

      // Add one extra to early users if there's a remainder
      const extraImage = i < remainder ? 1 : 0;
      const count = baseCount + extraImage;

      if (count <= 0) {
        continue;
      }

      // Select images for this user
      const userImages = imagesToAssign.slice(0, count);

      if (userImages.length === 0) {
        continue;
      }

      const userImageIds = userImages.map((img) => img._id);

      // Check if user already has an assignment for this project
      const existingAssignment = await database
        .collection<ImageAssignment>("image_assignments")
        .findOne({
          projectId: projectObjId,
          userId,
          status: {
            $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
          },
        } as Filter<ImageAssignment>);

      if (existingAssignment) {
        // Update existing assignment
        const updatedImageIds = [
          ...existingAssignment.imageIds,
          ...userImageIds,
        ];

        await database.collection("image_assignments").updateOne(
          { _id: existingAssignment._id },
          {
            $set: {
              imageIds: updatedImageIds,
              totalImages: updatedImageIds.length,
              lastActivity: new Date(),
            },
          }
        );
      } else {
        // Create new assignment
        const assignment: Omit<ImageAssignment, "_id"> = {
          projectId: projectObjId,
          userId,
          imageIds: userImageIds,
          assignedAt: new Date(),
          assignedBy,
          status: AssignmentStatus.ASSIGNED,
          totalImages: userImages.length,
          completedImages: 0,
        };

        await this.create(assignment);
      }

      // Update image records
      await database
        .collection<ProjectImage>("project_images")
        .updateMany({ _id: { $in: userImageIds } } as Filter<ProjectImage>, {
          $set: {
            assignedTo: userId,
            status: ImageStatus.ASSIGNED,
          },
        });

      // Remove assigned images from pool
      imagesToAssign = imagesToAssign.filter(
        (img) => !userImageIds.some((id) => id.equals(img._id))
      );
    }

    return true;
  }

  /**
   * Get assignments for a project
   */
  async getProjectAssignments(
    projectId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ assignments: ImageAssignment[]; total: number }> {
    const { items, total } = await this.paginate(
      { projectId: new ObjectId(projectId) } as Filter<ImageAssignment>,
      page,
      limit,
      { assignedAt: -1 }
    );

    return { assignments: items, total };
  }

  /**
   * Get user assignments for a project
   */
  async getUserAssignments(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ assignments: ImageAssignment[]; total: number }> {
    const { items, total } = await this.paginate(
      {
        projectId: new ObjectId(projectId),
        userId: new ObjectId(userId),
      } as Filter<ImageAssignment>,
      page,
      limit,
      { assignedAt: -1 }
    );

    return { assignments: items, total };
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    completedImages?: number
  ): Promise<ImageAssignment | null> {
    const updateData: Record<string, any> = {
      status,
      lastActivity: new Date(),
    };

    if (completedImages !== undefined) {
      updateData.completedImages = completedImages;
    }

    return this.update(assignmentId, updateData);
  }

  /**
   * Handle image reassignment when a member is removed from a project
   * This ensures that images annotated by removed members can be redistributed
   * while preserving their annotation attribution
   */
  async handleMemberRemoval(projectId: string, userId: string): Promise<void> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);
    const userObjId = new ObjectId(userId);

    // Get all images assigned to this user
    const assignedImages = await database
      .collection<ProjectImage>("project_images")
      .find({
        projectId: projectObjId,
        assignedTo: userObjId,
      } as Filter<ProjectImage>)
      .toArray();

    if (assignedImages.length === 0) {
      return;
    }

    // Update image records to unassign them but keep annotation attribution
    // This is key: we remove assignedTo but preserve annotatedBy
    await database.collection<ProjectImage>("project_images").updateMany(
      {
        projectId: projectObjId,
        assignedTo: userObjId,
      } as Filter<ProjectImage>,
      {
        $unset: { assignedTo: "" },
        $set: {
          status: ImageStatus.UPLOADED,
        },
      }
    );

    // Remove assignments for this user
    await database.collection<ImageAssignment>("image_assignments").deleteMany({
      projectId: projectObjId,
      userId: userObjId,
      status: {
        $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      },
    } as Filter<ImageAssignment>);
  }
}
