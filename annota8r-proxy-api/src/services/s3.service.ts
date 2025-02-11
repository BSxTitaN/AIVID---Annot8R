// src/services/s3.service.ts
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "../config/aws.js";
import { TokenService } from "./token.service.js";
import { SlugService } from "./slug.service.js";
import type { LogEntry, LogFile } from "../types/log.types.js";

export interface Annotation {
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageMetadata {
  id: string; // slug
  originalName: string;
  url: string;
  lastModified: Date;
  isAnnotated: boolean;
  annotations: Annotation[];
}

export interface UpdateAnnotationPayload {
  annotations: Annotation[];
  customClass?: string; // For office users who want to add custom classes
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    nextCursor?: string;
    prevCursor?: string;
    limit: number;
    annotatedTotal: number;
    annotationRemaining: number;
  };
}

interface ProjectMetadata {
  isSubmitted?: boolean;
  submittedAt?: string;
}

export class S3Service {
  private static readonly DEFAULT_PAGE_SIZE = 30;

  static async getObject(key: string): Promise<ReadableStream | null> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response.Body?.transformToWebStream() || null;
  }

  static async listProjects(userId: string) {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `users/${userId}/projects/`,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);
    const projects = await Promise.all(
      (response.CommonPrefixes || []).map(async (prefix) => {
        const projectName = prefix.Prefix?.split("/").filter(Boolean).pop();
        if (!projectName) return null;

        // Explicitly get metadata for each project
        const metadata = await this.getProjectMetadata(userId, projectName);
        console.log(`Project ${projectName} metadata:`, metadata); // Add logging

        return {
          id: projectName,
          name: projectName,
          isSubmitted: metadata.isSubmitted || false,
          submittedAt: metadata.submittedAt,
        };
      })
    );

    return projects.filter(Boolean);
  }

  static async listImages(
    userId: string,
    projectId: string,
    baseUrl: string,
    cursor?: string,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<ImageMetadata>> {
    limit = Math.min(Math.max(limit, 1), 100);

    // First, get total count and annotated count
    const [totalCount, annotatedCount] = await Promise.all([
      this.getTotalImageCount(userId, projectId),
      this.getAnnotatedCount(userId, projectId),
    ]);

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `users/${userId}/projects/${projectId}/images/`,
      MaxKeys: limit,
      ContinuationToken: cursor,
    });

    const response = await s3Client.send(command);

    const images = await Promise.all(
      (response.Contents || [])
        .filter(
          (item) => item.Key?.endsWith(".jpg") || item.Key?.endsWith(".png")
        )
        .map(async (item) => {
          const originalName = item.Key?.split("/").pop() || "";
          const slug = SlugService.generateSlug();
          const token = TokenService.generateToken(item.Key!);

          SlugService.setSlugMapping(slug, item.Key!);

          const annotations = await this.getAllAnnotations(
            userId,
            projectId,
            slug
          );

          return {
            id: slug,
            originalName,
            url: `${baseUrl}/api/proxy/images/${token}`,
            lastModified: item.LastModified!,
            isAnnotated: annotations.isAnnotated,
            annotations: annotations.annotations,
          };
        })
    );

    const totalPages = Math.ceil(totalCount / limit);
    let currentPage = 1;
    if (cursor) {
      currentPage = Math.min(
        Math.ceil((response.KeyCount || 0) / limit),
        totalPages
      );
    }

    return {
      items: images,
      pagination: {
        total: totalCount,
        currentPage,
        totalPages,
        nextCursor: response.NextContinuationToken,
        prevCursor: cursor,
        limit,
        annotatedTotal: annotatedCount,
        annotationRemaining: totalCount - annotatedCount,
      },
    };
  }

  static async getImageBySlug(
    userId: string,
    projectId: string,
    slug: string
  ): Promise<{
    key: string;
    isAnnotated: boolean;
    annotations: Annotation[];
  } | null> {
    const filename = SlugService.getFilenameFromSlug(slug);
    if (!filename) {
      return null;
    }

    const expectedPrefix = `users/${userId}/projects/${projectId}/images/`;
    if (!filename.startsWith(expectedPrefix)) {
      return null;
    }

    const annotations = await this.getAllAnnotations(userId, projectId, slug);

    return {
      key: filename,
      isAnnotated: annotations.isAnnotated,
      annotations: annotations.annotations,
    };
  }

  /**
   * Get all annotations for an image
   */
  static async getAllAnnotations(
    userId: string,
    projectId: string,
    imageId: string
  ): Promise<{
    annotations: Annotation[];
    isAnnotated: boolean;
  }> {
    try {
      let annotationPath: string;

      // Check if this is a slug-based lookup or direct filename
      const imageKey = SlugService.getFilenameFromSlug(imageId);
      if (imageKey) {
        // If it's a slug, use the mapped filename
        annotationPath = imageKey
          .replace("/images/", "/annotations/")
          .replace(/\.(jpg|png)$/, ".txt");
      } else {
        // If it's not a slug, construct the path directly
        annotationPath = `users/${userId}/projects/${projectId}/annotations/${imageId}.txt`;
      }

      try {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: annotationPath,
        });

        const response = await s3Client.send(command);
        const content = (await response.Body?.transformToString()) || "";

        const annotations = content
          .split("\n")
          .map((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;

            const parts = trimmedLine.split(/\s+/);
            if (parts.length !== 5) return null;

            const [className, x, y, width, height] = parts;
            const nums = [x, y, width, height].map(Number);

            if (nums.some(isNaN)) return null;

            return {
              class: className,
              x: nums[0],
              y: nums[1],
              width: nums[2],
              height: nums[3],
            };
          })
          .filter((a): a is Annotation => a !== null);

        return {
          annotations,
          isAnnotated: annotations.length > 0,
        };
      } catch (error: any) {
        if (error?.name === "NoSuchKey") {
          return {
            annotations: [],
            isAnnotated: false,
          };
        }
        throw error;
      }
    } catch (error) {
      console.error("Error getting annotations:", error);
      return {
        annotations: [],
        isAnnotated: false,
      };
    }
  }

  /**
   * Update annotations for an image
   */
  static async updateAnnotations(
    userId: string,
    projectId: string,
    imageId: string,
    payload: UpdateAnnotationPayload
  ): Promise<boolean> {
    try {
      const imageKey = SlugService.getFilenameFromSlug(imageId);
      if (!imageKey) {
        throw new Error("Invalid image ID");
      }

      if (payload.customClass) {
        await this.addCustomClass(userId, projectId, payload.customClass);
      }

      const annotationContent = payload.annotations
        .map(
          ({ class: className, x, y, width, height }) =>
            `${className} ${x} ${y} ${width} ${height}`
        )
        .join("\n");

      const annotationKey = imageKey
        .replace("/images/", "/annotations/")
        .replace(/\.(jpg|png)$/, ".txt");

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: annotationKey,
          Body: annotationContent,
          ContentType: "text/plain",
        })
      );

      await this.updateImageAnnotationStatus(
        imageKey,
        payload.annotations.length > 0
      );

      return true;
    } catch (error) {
      console.error("Error updating annotations:", error);
      throw error;
    }
  }

  /**
   * Get all classes for a project
   */
  static async getAllClasses(
    userId: string,
    projectId: string
  ): Promise<{ classes: string[]; isOfficeUser: boolean }> {
    const key = `users/${userId}/projects/${projectId}/utils/classes.txt`;

    console.log("Fetching classes from:", key);

    try {
      // Get classes
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      console.log("Getting classes from S3...");
      const response = await s3Client.send(command);
      const classesText = (await response.Body?.transformToString()) || "";
      console.log("Raw classes text:", classesText);

      const classes = classesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("-")[0].trim());

      console.log("Processed classes:", classes);

      // Simplified office user check for now
      return {
        classes,
        isOfficeUser: false, // Simplified for debugging
      };
    } catch (error: any) {
      console.log("Error in getAllClasses:", error.name, error.message);
      if (error?.name === "NoSuchKey") {
        const defaultClasses = ["Car", "Truck"];
        console.log("Using default classes:", defaultClasses);
        await this.saveClasses(userId, projectId, defaultClasses);
        return {
          classes: defaultClasses,
          isOfficeUser: false,
        };
      }
      throw error;
    }
  }

  /**
   * Save classes to project
   */
  private static async saveClasses(
    userId: string,
    projectId: string,
    classes: string[]
  ): Promise<boolean> {
    const key = `users/${userId}/projects/${projectId}/utils/classes.txt`;

    try {
      const content = classes
        .map((c, i) => `${c} - ${String(i + 1).padStart(2, "0")}`)
        .join("\n");

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: content,
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
   * Add a custom class to the project
   */
  private static async addCustomClass(
    userId: string,
    projectId: string,
    newClass: string
  ): Promise<boolean> {
    try {
      const { classes } = await this.getAllClasses(userId, projectId);

      if (!classes.includes(newClass)) {
        classes.push(newClass);
        await this.saveClasses(userId, projectId, classes);
      }

      return true;
    } catch (error) {
      console.error("Error adding custom class:", error);
      return false;
    }
  }

  private static async getTotalImageCount(
    userId: string,
    projectId: string
  ): Promise<number> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `users/${userId}/projects/${projectId}/images/`,
    });

    const response = await s3Client.send(command);
    return (response.Contents || []).filter(
      (item) => item.Key?.endsWith(".jpg") || item.Key?.endsWith(".png")
    ).length;
  }

  private static async getAnnotatedCount(
    userId: string,
    projectId: string
  ): Promise<number> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `users/${userId}/projects/${projectId}/annotations/`,
    });

    const response = await s3Client.send(command);
    return (response.Contents || []).filter((item) =>
      item.Key?.endsWith(".txt")
    ).length;
  }

  private static async updateImageAnnotationStatus(
    imageKey: string,
    isAnnotated: boolean
  ): Promise<void> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey,
      });

      const response = await s3Client.send(command);
      const metadata = response.Metadata || {};

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${imageKey}`,
          Key: imageKey,
          MetadataDirective: "REPLACE",
          Metadata: {
            ...metadata,
            isAnnotated: String(isAnnotated),
          },
        })
      );
    } catch (error) {
      console.error("Error updating image metadata:", error);
    }
  }

  // Logging methods
  static async getLogs(userId: string, projectId: string): Promise<LogEntry[]> {
    const logKey = `users/${userId}/projects/${projectId}/log/log.json`;

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: logKey,
      });

      const response = await s3Client.send(command);
      const content =
        (await response.Body?.transformToString()) || '{"logs": []}';
      const logFile: LogFile = JSON.parse(content);

      return logFile.logs;
    } catch (error) {
      console.error("Error fetching logs:", error);
      return [];
    }
  }

  static async writeLog(
    userId: string,
    projectId: string,
    logEntry: Omit<LogEntry, "logDate">
  ): Promise<boolean> {
    const logKey = `users/${userId}/projects/${projectId}/log/log.json`;

    try {
      // First, get existing logs
      let logs: LogEntry[] = await this.getLogs(userId, projectId);

      // Add new log entry with current timestamp
      const newLog: LogEntry = {
        ...logEntry,
        timestamp: new Date(),
      };

      logs = [newLog, ...logs]; // Add new log at beginning

      // Write back to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: logKey,
          Body: JSON.stringify({ logs }, null, 2),
          ContentType: "application/json",
        })
      );

      return true;
    } catch (error) {
      console.error("Error writing log:", error);
      return false;
    }
  }

  static async createProjectStructure(
    userId: string,
    projectName: string
  ): Promise<boolean> {
    try {
      const basePrefix = `users/${userId}/projects/${projectName}/`;
      const folders = ["images/", "annotations/", "utils/"];

      // Create all required folders
      await Promise.all(
        folders.map((folder) =>
          s3Client.send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: basePrefix + folder,
              Body: "", // Empty content for folder creation
            })
          )
        )
      );

      // Create default classes.txt
      await this.saveClasses(userId, projectName, ["Car", "Truck"]);

      return true;
    } catch (error) {
      console.error("Error creating project structure:", error);
      return false;
    }
  }

  static async renameProject(
    userId: string,
    oldName: string,
    newName: string
  ): Promise<boolean> {
    try {
      // First list all objects in the old project
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `users/${userId}/projects/${oldName}/`,
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];

      // Copy each object to new location and delete old one
      await Promise.all(
        objects.map(async (object) => {
          if (!object.Key) return;

          const newKey = object.Key.replace(
            `users/${userId}/projects/${oldName}/`,
            `users/${userId}/projects/${newName}/`
          );

          // Copy object to new location
          await s3Client.send(
            new CopyObjectCommand({
              Bucket: BUCKET_NAME,
              CopySource: `${BUCKET_NAME}/${object.Key}`,
              Key: newKey,
            })
          );

          // Delete old object
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: object.Key,
            })
          );
        })
      );

      return true;
    } catch (error) {
      console.error("Error renaming project:", error);
      return false;
    }
  }

  // Delete User Data
  static async deleteUserData(username: string): Promise<boolean> {
    try {
      const userPrefix = `users/${username}/`;

      // List all objects with user's prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: userPrefix,
      });

      const objects = await s3Client.send(listCommand);

      if (!objects.Contents?.length) {
        return true; // No objects to delete
      }

      // Delete all objects
      const deleteCommands = objects.Contents.map((obj) =>
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: obj.Key,
          })
        )
      );

      await Promise.all(deleteCommands);
      return true;
    } catch (error) {
      console.error("Error deleting user data from S3:", error);
      return false;
    }
  }

  static async submitProject(
    userId: string,
    projectId: string
  ): Promise<boolean> {
    const metadataKey = `users/${userId}/projects/${projectId}/utils/metadata.json`;

    try {
      const metadata: ProjectMetadata = {
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
      };

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadataKey,
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        })
      );

      return true;
    } catch (error) {
      console.error("Error submitting project:", error);
      return false;
    }
  }

  static async unsubmitProject(
    userId: string,
    projectId: string
  ): Promise<boolean> {
    const metadataKey = `users/${userId}/projects/${projectId}/utils/metadata.json`;

    try {
      const metadata: ProjectMetadata = {
        isSubmitted: false,
      };

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadataKey,
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        })
      );

      return true;
    } catch (error) {
      console.error("Error updating project status:", error);
      return false;
    }
  }

  static async getProjectMetadata(
    userId: string,
    projectId: string
  ): Promise<ProjectMetadata> {
    const metadataKey = `users/${userId}/projects/${projectId}/utils/metadata.json`;

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metadataKey,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      return JSON.parse(content || "{}");
    } catch (error: any) {
      if (error?.name === "NoSuchKey") {
        return {};
      }
      throw error;
    }
  }
}
