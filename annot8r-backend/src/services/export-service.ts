// src/services/export-service.ts
import { ObjectId } from "mongodb";
import { createWriteStream } from "fs";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  type ProjectExport,
  ExportStatus,
  type Project,
  type ProjectImage,
  type Annotation,
  type CreateExportRequest,
  ReviewStatus,
} from "../types/index.js";
import { db } from "../config/index.js";
import { s3 } from "../config/s3.js";
import { s3Operations } from "../utils/s3-operations.js";
import { BaseService } from "./base-service.js";
import archiver from "archiver";
import path from "path";

export class ExportService extends BaseService<ProjectExport> {
  constructor() {
    super("project_exports");
  }

  /**
   * Create project export
   */
  async createExport(
    projectId: string,
    exportData: CreateExportRequest,
    exportedBy: ObjectId,
    bucket: string
  ): Promise<ProjectExport> {
    // Create export record
    const timestamp = Date.now();
    const s3Key = s3.getExportPath(
      projectId,
      new ObjectId().toString(),
      timestamp
    );

    const exportRecord = await this.create({
      projectId: new ObjectId(projectId),
      exportedAt: new Date(),
      exportedBy,
      s3Key,
      format: exportData.format,
      totalImages: 0,
      totalAnnotations: 0,
      includesImages: exportData.includesImages,
      onlyReviewedAnnotations: exportData.onlyReviewedAnnotations,
      status: ExportStatus.PENDING,
    });

    // Start export process
    this.processExport(exportRecord._id.toString(), bucket).catch((error) => {
      console.error("Export processing error:", error);
      // Update export status to failed
      this.update(exportRecord._id.toString(), {
        status: ExportStatus.FAILED,
      }).catch(console.error);
    });

    return exportRecord;
  }

  /**
   * Process export (create ZIP and upload to S3)
   */
  private async processExport(exportId: string, bucket: string): Promise<void> {
    // Update status to processing
    await this.update(exportId, {
      status: ExportStatus.PROCESSING,
    });

    // Get export configuration
    const exportConfig = await this.findById(exportId);
    if (!exportConfig) {
      throw new Error("Export configuration not found");
    }

    const database = db.getDb();

    // Get project
    const project = await database.collection<Project>("projects").findOne({
      _id: exportConfig.projectId,
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Get images
    const imageQuery: Record<string, any> = {
      projectId: project._id,
    };

    if (exportConfig.onlyReviewedAnnotations) {
      imageQuery.reviewStatus = ReviewStatus.APPROVED;
    }

    const images = await database
      .collection<ProjectImage>("project_images")
      .find(imageQuery)
      .toArray();

    // Get annotations
    const annotations = await database
      .collection<Annotation>("annotations")
      .find({
        projectId: project._id,
        imageId: { $in: images.map((img) => img._id) },
      })
      .toArray();

    // Create temporary directory
    const tmpDir = `temp/exports/${exportId}`;
    await mkdir(tmpDir, { recursive: true });

    try {
      // Create directory structure
      await mkdir(`${tmpDir}/images`, { recursive: true });
      await mkdir(`${tmpDir}/labels`, { recursive: true });

      // Create class names file
      const classesContent = project.classes.map((cls) => cls.name).join("\n");
      await writeFile(`${tmpDir}/classes.txt`, classesContent);

      // Group annotations by image
      const annotationsByImage = annotations.reduce((acc, ann) => {
        const imageId = ann.imageId.toString();
        if (!acc[imageId]) {
          acc[imageId] = [];
        }
        acc[imageId].push(ann);
        return acc;
      }, {} as Record<string, Annotation[]>);

      // Process each image
      let totalImages = 0;
      let totalAnnotations = 0;

      for (const image of images) {
        const imageId = image._id.toString();
        const imageAnnotations = annotationsByImage[imageId] || [];

        if (imageAnnotations.length === 0) {
          continue;
        }

        // Get latest annotation
        const latestAnnotation = imageAnnotations.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];

        // Process annotation
        if (latestAnnotation) {
          // Create YOLO format annotation file
          const yoloLines = latestAnnotation.objects.map((obj) => {
            // Find class index in project classes
            const classIndex = project.classes.findIndex(
              (cls) => cls.id === obj.classId
            );
            return `${classIndex} ${obj.x} ${obj.y} ${obj.width} ${obj.height}`;
          });

          const yoloContent = yoloLines.join("\n");
          await writeFile(`${tmpDir}/labels/${imageId}.txt`, yoloContent);

          totalAnnotations += latestAnnotation.objects.length;
        }

        // Download image if included
        if (exportConfig.includesImages) {
          const s3Client = s3.getClient();
          const imageS3Key = image.s3Key;

          const getObjectCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: imageS3Key,
          });

          const imageResponse = await s3Client.send(getObjectCommand);

          if (imageResponse.Body) {
            const imageStream = imageResponse.Body as Readable;
            const fileStream = createWriteStream(
              `${tmpDir}/images/${imageId}.jpg`
            );
            await pipeline(imageStream, fileStream);
          }
        }

        totalImages++;
      }

      // Create ZIP file using native ZIP command
      const zipFilePath = `${tmpDir}/${project.name}_export.zip`;

      // Use zip command (most Unix systems have this)
      const output = createWriteStream(zipFilePath);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // Handle archive completion
      await new Promise<void>((resolve, reject) => {
        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));

        archive.pipe(output);

        // Add files to the archive
        archive.file(path.join(tmpDir, "classes.txt"), { name: "classes.txt" });
        archive.directory(path.join(tmpDir, "labels"), "labels");

        // Add images if included
        if (exportConfig.includesImages) {
          archive.directory(path.join(tmpDir, "images"), "images");
        }

        archive.finalize();
      });

      // Read the ZIP file
      const zipBuffer = await readFile(zipFilePath);

      // Upload to S3
      await s3Operations.upload(
        bucket,
        exportConfig.s3Key,
        zipBuffer,
        "application/zip"
      );

      // Create download URL
      const downloadUrl = await s3.getSignedUrl(
        bucket,
        exportConfig.s3Key,
        60 * 60 * 24
      ); // 24 hours

      // Update export record
      await this.update(exportId, {
        status: ExportStatus.COMPLETED,
        totalImages,
        totalAnnotations,
        url: downloadUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000), // 24 hours
      });
    } finally {
      // Clean up temporary directory
      try {
        await rm(tmpDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Error cleaning up temporary directory:", error);
      }
    }
  }

  /**
   * Refresh export download URL
   */
  async refreshDownloadUrl(exportId: string, bucket: string): Promise<string> {
    const exportRecord = await this.findById(exportId);

    if (!exportRecord) {
      throw new Error("Export not found");
    }

    // Create new download URL
    const downloadUrl = await s3.getSignedUrl(
      bucket,
      exportRecord.s3Key,
      60 * 60 * 24
    ); // 24 hours

    // Update export record
    await this.update(exportId, {
      url: downloadUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000), // 24 hours
    });

    return downloadUrl;
  }

  /**
   * Get project exports with pagination
   */
  async getProjectExports(
    projectId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ exports: ProjectExport[]; total: number }> {
    const database = db.getDb();
    const skip = (page - 1) * limit;

    const exports = await database
      .collection<ProjectExport>("project_exports")
      .find({ projectId: new ObjectId(projectId) })
      .sort({ exportedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await database
      .collection<ProjectExport>("project_exports")
      .countDocuments({
        projectId: new ObjectId(projectId),
      });

    return { exports, total };
  }
}
