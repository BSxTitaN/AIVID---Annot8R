// src/config/s3.ts
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../types/index.js";

// S3 client instance
let s3Client: S3Client | null = null;

// Initialize S3 client with better error handling
export const s3 = {
  /**
   * Initialize S3 client
   */
  initialize: async (env: Env): Promise<S3Client> => {
    if (s3Client) return s3Client;

    console.log("🔄 Initializing S3 client...");
    console.log(`S3 Region: ${env.S3_REGION}, S3 Bucket: ${env.S3_BUCKET}`);

    try {
      s3Client = new S3Client({
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        // Add this for more detailed error handling
        retryMode: "standard",
      });

      console.log("Created S3 client, testing connection...");

      // Test connection by checking if bucket exists
      try {
        const headBucketCommand = new HeadBucketCommand({
          Bucket: env.S3_BUCKET,
        });

        await s3Client.send(headBucketCommand);
        console.log(
          `✅ S3 connection established successfully. Bucket '${env.S3_BUCKET}' is accessible.`
        );
      } catch (bucketError) {
        console.error(
          `❌ S3 bucket check failed for '${env.S3_BUCKET}':`,
          bucketError
        );

        // Try to list buckets to see if credentials are valid
        try {
          const listCommand = new ListBucketsCommand({});
          const response = await s3Client.send(listCommand);

          console.log(
            `Available S3 buckets: ${response.Buckets?.map((b) => b.Name).join(
              ", "
            )}`
          );
          console.warn(
            `⚠️ Connected to S3, but bucket '${env.S3_BUCKET}' was not found. Make sure it exists or create it.`
          );
        } catch (listError) {
          console.error("❌ S3 connection failed completely:", listError);
          throw new Error(
            `Failed to connect to S3: ${
              listError instanceof Error ? listError.message : "Unknown error"
            }`
          );
        }
      }

      return s3Client;
    } catch (error) {
      console.error("❌ S3 client initialization error:", error);
      throw new Error(
        `Failed to initialize S3 client: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  /**
   * Get S3 client instance
   */
  getClient: (): S3Client => {
    if (!s3Client) {
      console.error("S3 client not initialized. Call initialize() first.");
      throw new Error("S3 client not initialized. Call initialize() first.");
    }
    return s3Client;
  },

  /**
   * Generate a presigned URL for object retrieval
   */
  getSignedUrl: async (
    bucket: string,
    key: string,
    expiresIn = 900 // 15 minutes
  ): Promise<string> => {
    const client = s3.getClient();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
  },

  /**
   * Check if an object exists in S3
   */
  objectExists: async (bucket: string, key: string): Promise<boolean> => {
    const client = s3.getClient();
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Generate project image path in S3
   */
  getImagePath: (
    projectId: string,
    imageId: string,
    filename: string
  ): string => {
    return `projects/${projectId}/images/${imageId}_${filename}`;
  },

  /**
   * Generate annotation path in S3
   */
  getAnnotationPath: (projectId: string, imageId: string): string => {
    return `projects/${projectId}/annotations/${imageId}.txt`;
  },

  /**
   * Generate export path in S3
   */
  getExportPath: (
    projectId: string,
    exportId: string,
    timestamp: number
  ): string => {
    return `projects/${projectId}/exports/${exportId}_${timestamp}.zip`;
  },
};
