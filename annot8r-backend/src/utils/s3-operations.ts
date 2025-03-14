// src/utils/s3-operations.ts
import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { s3 } from "../config/s3.js";

/**
 * S3 operation utilities
 */
export const s3Operations = {
  /**
   * Upload a file to S3
   */
  async upload(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | Readable | string,
    contentType?: string
  ): Promise<void> {
    try {
      const client = s3.getClient();

      // Ensure bucket exists
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (error) {
        throw new Error(`Unable to access S3 bucket ${bucket}`);
      }

      // Upload file
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "private, max-age=0, no-cache, no-store",
        })
      );
    } catch (error) {
      throw new Error(
        `S3 upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  /**
   * Delete a file from S3
   */
  async delete(bucket: string, key: string): Promise<void> {
    try {
      const client = s3.getClient();
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    } catch (error) {
      throw new Error(
        `S3 delete failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  /**
   * Ensure a directory exists in S3
   */
  async ensureDirectory(bucket: string, directory: string): Promise<void> {
    if (!directory.endsWith("/")) {
      directory += "/";
    }

    try {
      const client = s3.getClient();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: directory,
          Body: "",
        })
      );
    } catch (error) {
      throw new Error(
        `S3 directory creation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
};
