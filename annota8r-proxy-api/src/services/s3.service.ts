// src/services/s3.service.ts
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "../config/aws.js";
import { TokenService } from "./token.service.js";
import { AnnotationFormat } from "../types/project.types.js";
import sharp from "sharp";

export interface Annotation {
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageMetadata {
  id: string;
  originalName: string;
  url: string;
  lastModified: Date;
  isAnnotated: boolean;
  annotations: Annotation[];
  dimensions?: {
    width: number;
    height: number;
  };
}

interface ProjectMetadata {
  id: string;
  createdAt: string;
  settings: {
    modelFormat?: AnnotationFormat;
    allowCustomClasses?: boolean;
    requireReview?: boolean;
  };
}

export class S3Service {
  private static readonly DEFAULT_PAGE_SIZE = 30;

  /**
   * Create basic project structure in S3
   */
  static async createProjectStructure(projectId: string): Promise<boolean> {
    try {
      const basePrefix = `projects/${projectId}/`;
      const folders = [
        "metadata/",
        "images/",
        "annotations/",
        "exports/",
        "reviews/",
      ];

      // Create folder structure
      await Promise.all(
        folders.map((folder) =>
          s3Client.send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: basePrefix + folder,
              Body: "",
              ContentType: "application/x-directory",
            })
          )
        )
      );

      // Create initial metadata files
      await Promise.all([
        this.saveProjectMetadata(projectId, {
          id: projectId,
          createdAt: new Date().toISOString(),
          settings: {
            modelFormat: AnnotationFormat.YOLO,
            allowCustomClasses: false,
            requireReview: true,
          },
        }),
        this.saveClasses(projectId, []), // Empty initial classes
      ]);

      return true;
    } catch (error) {
      console.error("Error creating project structure:", error);
      return false;
    }
  }

  /**
   * Save project metadata
   */
  static async saveProjectMetadata(
    projectId: string,
    metadata: ProjectMetadata
  ): Promise<boolean> {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `projects/${projectId}/metadata/project.json`,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: "application/json",
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving project metadata:", error);
      return false;
    }
  }

  /**
   * Get project metadata
   */
  static async getProjectMetadata(
    projectId: string
  ): Promise<ProjectMetadata | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `projects/${projectId}/metadata/project.json`,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      return content ? JSON.parse(content) : null;
    } catch (error) {
      console.error("Error getting project metadata:", error);
      return null;
    }
  }

  /**
   * Upload image to project
   */
  static async uploadProjectImage(
    projectId: string,
    filename: string,
    content: Buffer,
    dimensions?: { width: number; height: number }
  ): Promise<boolean> {
    try {
      // Process image with sharp
      const image = sharp(content);
      const metadata = await image.metadata();
      
      // Extract dimensions if not provided
      const imageDimensions = dimensions || {
        width: metadata.width || 0,
        height: metadata.height || 0
      };

      // Set metadata
      const s3Metadata: Record<string, string> = {
        'Content-Type': metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png',
        'original-name': filename,
        'image-width': imageDimensions.width.toString(),
        'image-height': imageDimensions.height.toString(),
        'image-format': metadata.format || 'unknown',
        'upload-date': new Date().toISOString()
      };

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `projects/${projectId}/images/${filename}`,
          Body: content,
          Metadata: s3Metadata,
          ContentType: s3Metadata['Content-Type']
        })
      );

      return true;
    } catch (error) {
      console.error("Error uploading image:", error);
      return false;
    }
  }

  /**
   * Get image data and generate signed URL
   */
  static async getProjectImage(
    projectId: string,
    imageId: string,
    baseUrl: string
  ): Promise<ImageMetadata | null> {
    try {
      const key = `projects/${projectId}/images/${imageId}`;
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const headResponse = await s3Client.send(headCommand);
      const metadata = headResponse.Metadata || {};

      // Generate token for image access
      const token = TokenService.generateToken(key);
      const url = `${baseUrl}/api/proxy/images/${token}`;

      // Get annotation status
      const annotations = await this.getImageAnnotations(projectId, imageId);

      return {
        id: imageId,
        originalName: metadata["original-name"] || imageId,
        url,
        lastModified: headResponse.LastModified || new Date(),
        isAnnotated: annotations.length > 0,
        annotations,
        dimensions: metadata["image-width"]
          ? {
              width: parseInt(metadata["image-width"]),
              height: parseInt(metadata["image-height"]),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error getting image:", error);
      return null;
    }
  }

  /**
   * Get image annotations
   */
  static async getImageAnnotations(
    projectId: string,
    imageId: string
  ): Promise<Annotation[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `projects/${projectId}/annotations/${imageId}.txt`,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();

      if (!content) return [];

      return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [className, x, y, width, height] = line.split(" ");
          return {
            class: className,
            x: parseFloat(x),
            y: parseFloat(y),
            width: parseFloat(width),
            height: parseFloat(height),
          };
        });
    } catch (error: any) {
      if (error.name === "NoSuchKey") return [];
      console.error("Error getting annotations:", error);
      return [];
    }
  }

  /**
   * Save image annotations
   */
  static async saveImageAnnotations(
    projectId: string,
    imageId: string,
    annotations: Annotation[]
  ): Promise<boolean> {
    try {
      const content = annotations
        .map(
          (ann) => `${ann.class} ${ann.x} ${ann.y} ${ann.width} ${ann.height}`
        )
        .join("\n");

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `projects/${projectId}/annotations/${imageId}.txt`,
          Body: content,
          ContentType: "text/plain",
        })
      );

      return true;
    } catch (error) {
      console.error("Error saving annotations:", error);
      return false;
    }
  }

  /**
   * Save annotation classes
   */
  static async saveClasses(
    projectId: string,
    classes: string[]
  ): Promise<boolean> {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `projects/${projectId}/metadata/classes.txt`,
          Body: classes.join("\n"),
          ContentType: "text/plain",
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving classes:", error);
      return false;
    }
  }

  /**
   * Get project classes
   */
  static async getClasses(projectId: string): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `projects/${projectId}/metadata/classes.txt`,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();

      return content ? content.split("\n").filter(Boolean) : [];
    } catch (error: any) {
      if (error.name === "NoSuchKey") return [];
      console.error("Error getting classes:", error);
      return [];
    }
  }

  /**
   * List project images with pagination
   */
  static async listProjectImages(
    projectId: string,
    baseUrl: string,
    cursor?: string,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): Promise<{
    items: ImageMetadata[];
    nextCursor?: string;
    total: number;
  }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `projects/${projectId}/images/`,
        MaxKeys: limit,
        ContinuationToken: cursor,
      });

      const response = await s3Client.send(command);
      const items = await Promise.all(
        (response.Contents || [])
          .filter((item) => item.Key?.match(/\.(jpg|jpeg|png)$/i))
          .map(async (item) => {
            const imageId = item.Key!.split("/").pop()!;
            const imageData = await this.getProjectImage(
              projectId,
              imageId,
              baseUrl
            );
            return imageData!;
          })
      );

      return {
        items: items.filter((item): item is ImageMetadata => item !== null),
        nextCursor: response.NextContinuationToken,
        total: response.KeyCount || 0,
      };
    } catch (error) {
      console.error("Error listing images:", error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Delete project and all associated data
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `projects/${projectId}/`,
      });

      const response = await s3Client.send(listCommand);
      if (!response.Contents?.length) return true;

      await Promise.all(
        response.Contents.map((item) =>
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: item.Key!,
            })
          )
        )
      );

      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }

  /**
   * Get raw object from S3
   */
  static async getObject(key: string): Promise<ReadableStream | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      return response.Body?.transformToWebStream() || null;
    } catch (error) {
      console.error("Error getting object:", error);
      return null;
    }
  }

  /**
   * Delete project image
   */
  static async deleteProjectImage(
    projectId: string,
    imageId: string
  ): Promise<boolean> {
    try {
      // Delete image and its annotation if exists
      const imageKey = `projects/${projectId}/images/${imageId}`;
      const annotationKey = `projects/${projectId}/annotations/${imageId}.txt`;

      // Delete image
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: imageKey,
        })
      );

      // Try to delete annotation if it exists
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: annotationKey,
          })
        );
      } catch (error) {
        // Ignore errors if annotation doesn't exist
        console.log(`No annotation found for ${imageId}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  }
}
