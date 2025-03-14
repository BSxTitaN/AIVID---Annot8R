// src/utils/image-security.ts
import { ObjectId } from "mongodb";
import { generateImageToken } from "./jwt.js";
import type { ProxiedImageResponse } from "../types/index.js";

/**
 * Generate a proxied image URL with security token
 */
export function generateProxiedImageUrl(
  imageId: ObjectId,
  userId: ObjectId,
  baseUrl: string,
  projectId: ObjectId,
  secret: string
): ProxiedImageResponse {
  const token = generateImageToken(imageId, userId, secret);
  const url = `${baseUrl}/projects/${projectId}/images/${imageId}/proxy`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  
  return { url, token, expiresAt };
}