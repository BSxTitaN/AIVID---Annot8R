// src/services/project-service.ts
import { ObjectId, type Filter } from "mongodb";
import {
  ProjectStatus,
  type Project,
  type ProjectClass,
  type ProjectMember,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type AddProjectMemberRequest,
  SubmissionStatus,
  ReviewStatus,
} from "../types/index.js";
import { BaseService } from "./base-service.js";
import { s3Operations } from "../utils/s3-operations.js";
import { db } from "../config/index.js";
import { services } from "./service-factory.js";

export class ProjectService extends BaseService<Project> {
  constructor() {
    super("projects");
  }

  /**
   * Find active project by ID
   */
  async findActiveById(projectId: string): Promise<Project | null> {
    return this.findOne({
      _id: new ObjectId(projectId),
      isDeleted: false,
    } as Filter<Project>);
  }

  /**
   * Create a new project
   */
  async createProject(
    projectData: CreateProjectRequest,
    createdBy: ObjectId
  ): Promise<Project> {
    // Generate class IDs
    const classes: ProjectClass[] = projectData.classes.map((cls) => ({
      ...cls,
      id: new ObjectId().toString(),
      isCustom: false,
    }));

    // Create project
    const project = await this.create({
      name: projectData.name,
      description: projectData.description,
      annotationFormat: projectData.annotationFormat,
      classes,
      allowCustomClasses: projectData.allowCustomClasses,
      status: ProjectStatus.CREATED,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalImages: 0,
      annotatedImages: 0,
      reviewedImages: 0,
      approvedImages: 0,
      completionPercentage: 0,
      isDeleted: false,
    });

    // Create S3 directories
    try {
      const bucket = process.env.S3_BUCKET;
      if (bucket) {
        const projectId = project._id.toString();
        await Promise.all([
          s3Operations.ensureDirectory(bucket, `projects/${projectId}/`),
          s3Operations.ensureDirectory(bucket, `projects/${projectId}/images/`),
          s3Operations.ensureDirectory(
            bucket,
            `projects/${projectId}/annotations/`
          ),
          s3Operations.ensureDirectory(
            bucket,
            `projects/${projectId}/exports/`
          ),
        ]);
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to create S3 directories for project ${project._id}:`,
        error
      );
    }

    // Add creator as a project member
    await this.addProjectMember(
      project._id.toString(),
      {
        userId: createdBy.toString(),
        role: "REVIEWER",
      },
      createdBy
    );

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    updates: UpdateProjectRequest
  ): Promise<Project | null> {
    return this.update(projectId, updates);
  }

  /**
   * Delete a project and all associated data
   */
  async deleteProject(
    projectId: string,
    deletedBy: ObjectId
  ): Promise<boolean> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // Get project info before deleting
    const project = await this.findOne({
      _id: projectObjId,
      isDeleted: false,
    } as Filter<Project>);

    if (!project) {
      return false;
    }

    // Get all project images to delete from S3
    const projectImages = await database
      .collection("project_images")
      .find({ projectId: projectObjId })
      .toArray();

    // Delete project data from MongoDB collections
    await Promise.all([
      database
        .collection("project_images")
        .deleteMany({ projectId: projectObjId }),
      database
        .collection("annotations")
        .deleteMany({ projectId: projectObjId }),
      database
        .collection("project_members")
        .deleteMany({ projectId: projectObjId }),
      database
        .collection("image_assignments")
        .deleteMany({ projectId: projectObjId }),
      database
        .collection("submission_reviews")
        .deleteMany({ projectId: projectObjId }),
      database
        .collection("project_exports")
        .deleteMany({ projectId: projectObjId }),
    ]);

    // Soft delete the project
    await this.update(projectId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
      status: ProjectStatus.ARCHIVED,
    });

    // Delete project files from S3
    try {
      const s3Bucket = process.env.S3_BUCKET;
      if (s3Bucket) {
        const { ListObjectsV2Command, DeleteObjectsCommand } = await import(
          "@aws-sdk/client-s3"
        );

        const s3Client = (await import("../config/s3.js")).s3.getClient();

        // Get all objects with this project prefix
        const projectPrefix = `projects/${projectId}/`;
        const listResponse = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: s3Bucket,
            Prefix: projectPrefix,
          })
        );

        // If there are objects to delete
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const objects = listResponse.Contents.map((obj) => ({
            Key: obj.Key as string,
          }));

          // Delete all objects in one operation
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: s3Bucket,
              Delete: { Objects: objects },
            })
          );
        }
      }
    } catch (error) {
      console.error(
        `Error deleting S3 objects for project ${projectId}:`,
        error
      );
      // If S3 deletion fails, we don't roll back the database changes
    }

    return true;
  }

  /**
   * Get all projects (paginated)
   */
  async getAllProjects(
    page: number = 1,
    limit: number = 20
  ): Promise<{ projects: Project[]; total: number }> {
    const { items, total } = await this.paginate(
      { isDeleted: false } as Filter<Project>,
      page,
      limit,
      { createdAt: -1 }
    );

    return { projects: items, total };
  }

  /**
   * Get projects assigned to a user
   */
  async getUserProjects(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ projects: Project[]; total: number }> {
    const database = db.getDb();
    const skip = (page - 1) * limit;

    // Find project IDs where user is a member
    const memberEntries = await database
      .collection<ProjectMember>("project_members")
      .find({ userId: new ObjectId(userId) } as Filter<ProjectMember>)
      .toArray();

    const projectIds = memberEntries.map((entry) => entry.projectId);

    if (projectIds.length === 0) {
      return { projects: [], total: 0 };
    }

    // Find projects by IDs
    const projects = await database
      .collection<Project>("projects")
      .find({
        _id: { $in: projectIds },
        isDeleted: false,
      } as Filter<Project>)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await database
      .collection<Project>("projects")
      .countDocuments({
        _id: { $in: projectIds },
        isDeleted: false,
      } as Filter<Project>);

    return { projects, total };
  }

  /**
   * Add a member to a project
   */
  async addProjectMember(
    projectId: string,
    memberData: AddProjectMemberRequest,
    addedBy: ObjectId
  ): Promise<ProjectMember> {
    const database = db.getDb();
    const membersCollection =
      database.collection<ProjectMember>("project_members");

    // Check if user is already a member
    const existingMember = await membersCollection.findOne({
      projectId: new ObjectId(projectId),
      userId: new ObjectId(memberData.userId),
    } as Filter<ProjectMember>);

    if (existingMember) {
      throw new Error("User is already a member of this project");
    }

    const newMember: Omit<ProjectMember, "_id"> = {
      projectId: new ObjectId(projectId),
      userId: new ObjectId(memberData.userId),
      role: memberData.role,
      addedAt: new Date(),
      addedBy,
    };

    const result = await membersCollection.insertOne(newMember as any);
    return { ...newMember, _id: result.insertedId } as ProjectMember;
  }

  /**
   * Remove a member from a project
   */
  async removeProjectMember(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    // Handle reassignment of the member's images
    await services.assignments().handleMemberRemoval(projectId, userId);

    const database = db.getDb();
    const result = await database
      .collection<ProjectMember>("project_members")
      .deleteOne({
        projectId: new ObjectId(projectId),
        userId: new ObjectId(userId),
      } as Filter<ProjectMember>);

    return result.deletedCount > 0;
  }

  /**
   * Get all members of a project
   */
  async getProjectMembers(
    projectId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ members: ProjectMember[]; total: number }> {
    const database = db.getDb();
    const skip = (page - 1) * limit;

    const members = await database
      .collection<ProjectMember>("project_members")
      .find({ projectId: new ObjectId(projectId) } as Filter<ProjectMember>)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await database
      .collection<ProjectMember>("project_members")
      .countDocuments({
        projectId: new ObjectId(projectId),
      } as Filter<ProjectMember>);

    return { members, total };
  }

  /**
   * Check if a user is a member of a project
   */
  async isProjectMember(
    projectId: string,
    userId: string,
    role?: string
  ): Promise<boolean> {
    const database = db.getDb();
    const query: Record<string, any> = {
      projectId: new ObjectId(projectId),
      userId: new ObjectId(userId),
    };

    if (role) {
      query.role = role;
    }

    const count = await database
      .collection<ProjectMember>("project_members")
      .countDocuments(query as Filter<ProjectMember>);

    return count > 0;
  }

  /**
   * Update project statistics
   */
  async updateProjectStats(projectId: string): Promise<void> {
    const database = db.getDb();
    const projectObjId = new ObjectId(projectId);

    // Get image counts for different statuses
    const totalImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
      });

    const annotatedImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
        annotationStatus: "COMPLETED",
      });

    const reviewedImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
        reviewStatus: { $in: ["APPROVED", "FLAGGED"] },
      });

    const approvedImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
        reviewStatus: "APPROVED",
      });

    // Calculate completion percentage
    const completionPercentage =
      totalImages > 0 ? Math.round((approvedImages / totalImages) * 100) : 0;

    // Determine project status
    let status = ProjectStatus.CREATED;

    if (totalImages > 0 && annotatedImages > 0) {
      status = ProjectStatus.IN_PROGRESS;
    }

    if (
      totalImages > 0 &&
      annotatedImages === totalImages &&
      approvedImages === totalImages
    ) {
      status = ProjectStatus.COMPLETED;
    }

    // Update project document
    await this.update(projectId, {
      totalImages,
      annotatedImages,
      reviewedImages,
      approvedImages,
      completionPercentage,
      status,
    });
  }

  /**
   * Mark project as complete
   * This prevents further submissions and edits
   */
  async markProjectAsComplete(
    projectId: string,
    completedBy: ObjectId
  ): Promise<Project | null> {
    const projectObjId = new ObjectId(projectId);
    const database = db.getDb();

    // Check if all images are approved
    const totalImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
      });

    const approvedImages = await database
      .collection("project_images")
      .countDocuments({
        projectId: projectObjId,
        reviewStatus: ReviewStatus.APPROVED,
      });

    // Only allow completion if all images are approved
    if (totalImages === 0 || approvedImages < totalImages) {
      throw new Error(
        `Cannot mark project as complete. Only ${approvedImages} out of ${totalImages} images are approved.`
      );
    }

    // Cancel any pending submissions
    await database.collection("submission_reviews").updateMany(
      {
        projectId: projectObjId,
        status: {
          $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      },
      {
        $set: {
          status: SubmissionStatus.REJECTED,
          reviewedBy: completedBy,
          reviewedAt: new Date(),
          feedback:
            "This submission was automatically rejected because the project was marked as complete.",
        },
      }
    );

    // Update project status
    return this.update(projectId, {
      status: ProjectStatus.COMPLETED,
      completionPercentage: 100,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if a project is complete
   */
  async isProjectComplete(projectId: string): Promise<boolean> {
    const project = await this.findById(projectId);
    return project?.status === ProjectStatus.COMPLETED;
  }
}
