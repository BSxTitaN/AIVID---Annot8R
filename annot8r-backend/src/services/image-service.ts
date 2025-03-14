// src/services/image-service.ts
import { ObjectId, type Filter } from "mongodb";
import {
  AnnotationStatus,
  ImageStatus,
  type ProjectImage,
  ReviewStatus,
  type ProxiedImageResponse,
} from "../types/index.js";
import { db } from "../config/index.js";
import { s3 } from "../config/s3.js";
import { s3Operations } from "../utils/s3-operations.js";
import { BaseService } from "./base-service.js";
import { generateImageToken } from "../utils/jwt.js";

export class ImageService extends BaseService<ProjectImage> {
  constructor() {
    super('project_images');
  }

  /**
   * Upload images to a project
   */
  async uploadImages(
    projectId: string,
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      width: number;
      height: number;
    }>,
    uploadedBy: ObjectId,
    bucket: string
  ): Promise<ProjectImage[]> {
    if (!projectId || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
      throw new Error(`Invalid project ID format: ${projectId}`);
    }
    
    let projectObjId: ObjectId;
    try {
      projectObjId = new ObjectId(projectId);
    } catch (err) {
      throw new Error(`Failed to create ObjectId from projectId: ${projectId}`);
    }
    const uploadedImages: ProjectImage[] = [];
    
    // Ensure project directory exists in S3
    const projectDir = `projects/${projectId}/`;
    const imagesDir = `${projectDir}images/`;
    
    try {
      // Create directory structure if it doesn't exist
      await s3Operations.ensureDirectory(bucket, projectDir);
      await s3Operations.ensureDirectory(bucket, imagesDir);
    } catch (error) {
      console.error(`Error creating S3 directory structure: ${error}`);
    }
    
    // Process each file
    for (const file of files) {
      try {
        // Create image document
        const imageId = new ObjectId();
        const fileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const s3Key = s3.getImagePath(projectId, imageId.toString(), fileName);
        
        const newImage: Omit<ProjectImage, "_id"> = {
          projectId: projectObjId,
          filename: fileName,
          s3Key,
          width: file.width,
          height: file.height,
          uploadedAt: new Date(),
          uploadedBy,
          status: ImageStatus.UPLOADED,
          annotationStatus: AnnotationStatus.UNANNOTATED,
          autoAnnotated: false,
          timeSpent: 0,
          reviewStatus: ReviewStatus.NOT_REVIEWED,
        };
        
        // Upload file to S3
        await s3Operations.upload(bucket, s3Key, file.buffer, file.mimetype);
        
        // Insert image document to database
        const result = await this.create(newImage);
        uploadedImages.push(result);
        
        // Update project statistics
        await this.updateProjectStats(projectId);
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error);
      }
    }
    
    return uploadedImages;
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string, bucket: string): Promise<boolean> {
    // Find image
    const image = await this.findById(imageId);
    if (!image) {
      return false;
    }
    
    // Delete from S3
    try {
      await s3Operations.delete(bucket, image.s3Key);
      
      // Delete annotation if exists
      const annotationKey = s3.getAnnotationPath(
        image.projectId.toString(),
        imageId
      );
      
      if (await s3.objectExists(bucket, annotationKey)) {
        await s3Operations.delete(bucket, annotationKey);
      }
    } catch (error) {
      console.error("Error deleting image from S3:", error);
    }
    
    // Delete from database
    const result = await this.delete(imageId);
    
    // Delete associated annotations
    const database = db.getDb();
    await database.collection("annotations").deleteMany({
      imageId: new ObjectId(imageId)
    });
    
    // Update project statistics
    await this.updateProjectStats(image.projectId.toString());
    
    return result;
  }

  /**
   * Get project images
   */
  async getProjectImages(
    projectId: string,
    page: number = 1,
    limit: number = 20,
    filters: Record<string, any> = {}
  ): Promise<{ images: ProjectImage[]; total: number }> {
    const query = {
      projectId: new ObjectId(projectId),
      ...filters,
    } as Filter<ProjectImage>;
    
    const { items, total } = await this.paginate(
      query,
      page,
      limit,
      { uploadedAt: -1 }
    );
    
    return { images: items, total };
  }

  /**
   * Get images assigned to a user
   */
  async getUserAssignedImages(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ images: ProjectImage[]; total: number }> {
    const query = {
      projectId: new ObjectId(projectId),
      assignedTo: new ObjectId(userId)
    } as Filter<ProjectImage>;
    
    const { items, total } = await this.paginate(
      query,
      page,
      limit,
      { uploadedAt: -1 }
    );
    
    return { images: items, total };
  }

  /**
   * Get unassigned images count
   */
  async getUnassignedImagesCount(projectId: string): Promise<number> {
    return this.count({
      projectId: new ObjectId(projectId),
      assignedTo: { $exists: false }
    } as Filter<ProjectImage>);
  }

  /**
   * Get proxied image URL
   */
  async getProxiedImageUrl(
    imageId: string,
    userId: string,
    baseUrl: string,
    imageTokenSecret: string
  ): Promise<ProxiedImageResponse | null> {
    const image = await this.findById(imageId);
    if (!image) {
      return null;
    }
    
    try {
      // Generate a signed URL directly to the S3 object instead of the proxy endpoint
      const bucket = process.env.S3_BUCKET || "";
      const url = await s3.getSignedUrl(bucket, image.s3Key, 900); // 15 minutes
      
      // Generate a token for backward compatibility
      const token = generateImageToken(image._id, new ObjectId(userId), imageTokenSecret);
      const expiresAt = new Date(Date.now() + 900 * 1000); // 15 minutes
      
      return {
        url,
        token,
        expiresAt
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }

  /**
   * Update image status
   */
  async updateImageStatus(
    imageId: string,
    status: Partial<{
      status: ImageStatus;
      annotationStatus: AnnotationStatus;
      reviewStatus: ReviewStatus;
      assignedTo: string | null;
      annotatedBy: string | null;
      reviewedBy: string | null;
      annotatedAt: Date | null;
      reviewedAt: Date | null;
      reviewFeedback: string | null;
      currentSubmissionId: string | null;
      autoAnnotated: boolean;
      timeSpent: number;
    }>
  ): Promise<ProjectImage | null> {
    const updateData: Record<string, any> = { ...status };
    
    // Convert string IDs to ObjectIds
    if (status.assignedTo) {
      updateData.assignedTo = new ObjectId(status.assignedTo);
    }
    
    if (status.annotatedBy) {
      updateData.annotatedBy = new ObjectId(status.annotatedBy);
    }
    
    if (status.reviewedBy) {
      updateData.reviewedBy = new ObjectId(status.reviewedBy);
    }
    
    if (status.currentSubmissionId) {
      updateData.currentSubmissionId = new ObjectId(status.currentSubmissionId);
    }
    
    const result = await this.collection().findOneAndUpdate(
      { _id: new ObjectId(imageId) } as Filter<ProjectImage>,
      { $set: updateData },
      { returnDocument: "after" }
    ) as ProjectImage | null;
    
    if (result) {
      // Update project statistics
      await this.updateProjectStats(result.projectId.toString());
    }
    
    return result;
  }

  /**
   * Update project statistics
   */
  private async updateProjectStats(projectId: string): Promise<void> {
    const database = db.getDb();
    const projectsCollection = database.collection('projects');
    
    // Get image counts for different statuses
    const totalImages = await this.count({
      projectId: new ObjectId(projectId)
    } as Filter<ProjectImage>);
    
    const annotatedImages = await this.count({
      projectId: new ObjectId(projectId),
      annotationStatus: AnnotationStatus.COMPLETED
    } as Filter<ProjectImage>);
    
    const reviewedImages = await this.count({
      projectId: new ObjectId(projectId),
      reviewStatus: { $in: [ReviewStatus.APPROVED, ReviewStatus.FLAGGED] }
    } as Filter<ProjectImage>);
    
    const approvedImages = await this.count({
      projectId: new ObjectId(projectId),
      reviewStatus: ReviewStatus.APPROVED
    } as Filter<ProjectImage>);
    
    // Calculate completion percentage
    const completionPercentage =
      totalImages > 0 ? Math.round((approvedImages / totalImages) * 100) : 0;
    
    // Update project document
    await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          totalImages,
          annotatedImages,
          reviewedImages,
          approvedImages,
          completionPercentage,
          updatedAt: new Date()
        }
      }
    );
  }
}