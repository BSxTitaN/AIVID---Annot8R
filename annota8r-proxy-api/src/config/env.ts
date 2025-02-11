// src/config/env.ts
import { config } from "dotenv";
import * as path from "path";

// Load .env file
config({ path: path.resolve(process.cwd(), ".env") });

export interface RequiredEnv {
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
  PORT: number;
  MONGODB_URI: string;
}

export function validateEnv(): RequiredEnv {
  const required = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
    "MONGODB_URI",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    AWS_REGION: process.env.AWS_REGION!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
    PORT: parseInt(process.env.PORT || "3001", 10),
    MONGODB_URI: process.env.MONGODB_URI!,
  };
}

export const env = validateEnv();
