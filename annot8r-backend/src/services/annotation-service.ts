// src/services/annotation-service.ts
import { ObjectId, type Filter } from "mongodb";
import {
  ImageStatus,
  ReviewStatus,
  type Annotation,
  type YoloObject,
  type SaveAnnotationRequest,
  type AutosaveAnnotationRequest,
  AnnotationStatus
} from "../types/index.js";
import { db } from "../config/index.js";
import { s3 } from "../config/s3.js";
import { s3Operations } from "../utils/s3-operations.js";
import { BaseService } from "./base-service.js";

export class AnnotationService extends BaseService<Annotation> {
  constructor() {
    super('annotations');
  }

  /**
   * Save annotation
   */
  async saveAnnotation(
    projectId: string,
    imageId: string,
    userId: string,
    data: SaveAnnotationRequest,
    bucket: string
  ): Promise<Annotation> {
    // Build annotation objects
    const objects: YoloObject[] = data.objects.map((obj, index) => ({
      ...obj,
      classId: data.classIds[index],
      className: data.classNames[index]
    }));

    // Check if the image is currently flagged
    const database = db.getDb();
    const image = await database.collection('project_images').findOne({
      _id: new ObjectId(imageId)
    });
    
    const wasFlagged = image && image.reviewStatus === ReviewStatus.FLAGGED;

    // Check if annotation exists
    const existingAnnotation = await this.findOne({
      projectId: new ObjectId(projectId),
      imageId: new ObjectId(imageId),
      userId: new ObjectId(userId)
    } as Filter<Annotation>);

    let result: Annotation;
    if (existingAnnotation) {
      // Update existing annotation
      const updatedAnnotation = {
        ...existingAnnotation,
        updatedAt: new Date(),
        timeSpent: existingAnnotation.timeSpent + data.timeSpent,
        autoAnnotated: data.autoAnnotated,
        version: existingAnnotation.version + 1,
        objects
      };
      await this.collection().updateOne(
        { _id: existingAnnotation._id } as Filter<Annotation>,
        { $set: updatedAnnotation }
      );
      result = updatedAnnotation;
    } else {
      // Create new annotation
      const newAnnotation: Omit<Annotation, '_id'> = {
        projectId: new ObjectId(projectId),
        imageId: new ObjectId(imageId),
        userId: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSpent: data.timeSpent,
        autoAnnotated: data.autoAnnotated,
        version: 1,
        objects
      };
      result = await this.create(newAnnotation);
    }

    // Update image status
    const statusUpdate: any = {
      status: ImageStatus.ANNOTATED,
      annotationStatus: AnnotationStatus.COMPLETED,
      annotatedBy: userId,
      annotatedAt: new Date(),
      autoAnnotated: data.autoAnnotated,
      timeSpent: data.timeSpent
    };
    
    // If the image was flagged, reset the review status
    if (wasFlagged) {
      statusUpdate.reviewStatus = ReviewStatus.NOT_REVIEWED;
      statusUpdate.reviewFeedback = "";
      
      // If there's a current submission ID, remove it as this image can be part of a new submission
      if (image && image.currentSubmissionId) {
        statusUpdate.currentSubmissionId = null;
      }
    }
    
    await this.updateImageStatus(imageId, statusUpdate);

    // Get project to access class definitions
    const project = await database.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });
    if (!project || !project.classes) {
      throw new Error("Project or classes not found");
    }

    // Create a map of classId to index
    const classIdToIndexMap = new Map();
    project.classes.forEach((cls: any, index: number) => {
      classIdToIndexMap.set(cls.id, index);
    });

    // Save YOLO format annotation to S3 using class indices
    await this.saveYoloAnnotation(projectId, imageId, objects, bucket, classIdToIndexMap);
    return result;
  }

  /**
   * Auto-save annotation (partial save during work)
   */
  async autoSaveAnnotation(
    projectId: string,
    imageId: string,
    userId: string,
    data: AutosaveAnnotationRequest,
    bucket: string
  ): Promise<void> {
    // Build annotation objects
    const objects: YoloObject[] = data.objects.map((obj, index) => ({
      ...obj,
      classId: data.classIds[index],
      className: data.classNames[index]
    }));

    // Check if annotation exists
    const existingAnnotation = await this.findOne({
      projectId: new ObjectId(projectId),
      imageId: new ObjectId(imageId),
      userId: new ObjectId(userId)
    } as Filter<Annotation>);

    if (existingAnnotation) {
      // Update existing annotation
      await this.collection().updateOne(
        { _id: existingAnnotation._id } as Filter<Annotation>,
        {
          $set: {
            updatedAt: new Date(),
            timeSpent: existingAnnotation.timeSpent + data.timeSpent,
            version: existingAnnotation.version + 1,
            objects
          }
        }
      );
    } else {
      // Create new annotation
      await this.create({
        projectId: new ObjectId(projectId),
        imageId: new ObjectId(imageId),
        userId: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSpent: data.timeSpent,
        autoAnnotated: false,
        version: 1,
        objects
      });
    }

    // Update image status to in progress
    await this.updateImageStatus(imageId, {
      annotationStatus: AnnotationStatus.IN_PROGRESS,
      timeSpent: data.timeSpent
    });

    // Get project to access class definitions for YOLO format
    const database = db.getDb();
    const project = await database.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });
    if (!project || !project.classes) {
      throw new Error("Project or classes not found");
    }

    // Create a map of classId to index
    const classIdToIndexMap = new Map();
    project.classes.forEach((cls: any, index: number) => {
      classIdToIndexMap.set(cls.id, index);
    });

    if (bucket) {
      await this.saveYoloAnnotation(projectId, imageId, objects, bucket, classIdToIndexMap);
    }
  }

  /**
   * Get annotation for an image
   */
  async getAnnotation(
    projectId: string,
    imageId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<Annotation | null> {
    // For admin users, get any annotation for this image regardless of who created it
    if (isAdmin) {
      // Get the most recent annotation for this image from any user
      const annotations = await this.collection().find({
        projectId: new ObjectId(projectId),
        imageId: new ObjectId(imageId)
      })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray();
      
      return annotations.length > 0 ? annotations[0] : null;
    }
    
    // For regular users, only get their own annotations
    return this.findOne({
      projectId: new ObjectId(projectId),
      imageId: new ObjectId(imageId),
      userId: new ObjectId(userId)
    } as Filter<Annotation>);
  }

  /**
   * Save YOLO format annotation to S3 using class indices
   */
  private async saveYoloAnnotation(
    projectId: string,
    imageId: string,
    objects: YoloObject[],
    bucket: string,
    classIdToIndexMap: Map<string, number>
  ): Promise<void> {
    // Format annotation in YOLO style (class_index x y width height)
    const yoloLines = objects.map(obj => {
      // Use class index instead of classId
      const classIndex = classIdToIndexMap.get(obj.classId) || 0;
      return `${classIndex} ${obj.x} ${obj.y} ${obj.width} ${obj.height}`;
    });
    const yoloContent = yoloLines.join('\n');
    const s3Key = s3.getAnnotationPath(projectId, imageId);
    await s3Operations.upload(bucket, s3Key, yoloContent, 'text/plain');
  }

  /**
   * Update image status
   */
  private async updateImageStatus(
    imageId: string,
    status: Partial<{
      status: ImageStatus;
      annotationStatus: AnnotationStatus;
      annotatedBy: string | null;
      annotatedAt: Date | null;
      autoAnnotated: boolean;
      timeSpent: number;
      reviewStatus: ReviewStatus;
      reviewFeedback: string | null;
      currentSubmissionId: ObjectId | null;
    }>
  ): Promise<void> {
    const database = db.getDb();
    const updateData: Record<string, any> = { ...status };
    
    // Convert string IDs to ObjectIds
    if (status.annotatedBy) {
      updateData.annotatedBy = new ObjectId(status.annotatedBy);
    }
    
    await database.collection('project_images').updateOne(
      { _id: new ObjectId(imageId) },
      { $set: updateData }
    );
    
    // Update project stats
    const image = await database.collection('project_images').findOne({
      _id: new ObjectId(imageId)
    });
    
    if (image) {
      const projectId = image.projectId.toString();
      await this.updateProjectStats(projectId);
    }
  }

  /**
   * Update project statistics
   */
  private async updateProjectStats(projectId: string): Promise<void> {
    // [This method remains unchanged]
    const database = db.getDb();
    const projectImages = database.collection('project_images');
    
    // Get image counts
    const totalImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId)
    });
    
    const annotatedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      annotationStatus: AnnotationStatus.COMPLETED
    });
    
    const reviewedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      reviewStatus: { $in: [ReviewStatus.APPROVED, ReviewStatus.FLAGGED] }
    });
    
    const approvedImages = await projectImages.countDocuments({
      projectId: new ObjectId(projectId),
      reviewStatus: ReviewStatus.APPROVED
    });
    
    // Calculate completion percentage
    const completionPercentage =
      totalImages > 0 ? Math.round((approvedImages / totalImages) * 100) : 0;
    
    // Update project
    await database.collection('projects').updateOne(
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