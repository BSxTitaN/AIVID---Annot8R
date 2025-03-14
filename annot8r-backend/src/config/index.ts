// Import environment type
import type { Env } from "../types/index.js";
import { db } from "./db.js";
import { s3 } from "./s3.js";

// Initialize and export config components
export { db, s3 };

// Constants
export const JWT_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
export const IMAGE_TOKEN_EXPIRY = 30 * 60 * 1000; // 15 minutes in milliseconds

// Helper function to validate environment variables
export function validateEnv(env: Partial<Env>): env is Env {
  const requiredEnvVars: Array<keyof Env> = [
    "MONGODB_URI",
    "JWT_SECRET",
    "S3_BUCKET",
    "S3_REGION",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "IMAGE_TOKEN_SECRET",
  ];

  const missingEnvVars = requiredEnvVars.filter((key) => !env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  return true;
}

// Utility to safely access environment variables
export function getEnv(env: Partial<Env>, key: keyof Env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${String(key)}`);
  }
  return value;
}
