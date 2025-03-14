// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import type { User } from "../types/index.js";

type TokenPayload = {
  sub: string;
  [key: string]: any;
};

/**
 * Generate a JWT token with configurable payload and expiration
 */
export function generateToken(
  payload: TokenPayload,
  secret: string,
  expiresIn = 1800
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generate a user authentication token
 */
export function generateUserToken(
  user: User,
  secret: string,
  expiresIn = 1800
): string {
  return generateToken(
    {
      sub: user._id.toString(),
      role: user.role,
      isOfficeUser: user.isOfficeUser
    },
    secret, 
    expiresIn
  );
}

/**
 * Generate an image access token
 */
export function generateImageToken(
  imageId: ObjectId,
  userId: ObjectId,
  secret: string,
  expiresIn = 900
): string {
  return generateToken(
    {
      sub: imageId.toString(),
      userId: userId.toString()
    },
    secret, 
    expiresIn
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify an image token against expected image ID
 */
export function verifyImageToken(
  token: string,
  imageId: string,
  secret: string
): boolean {
  const payload = verifyToken(token, secret);
  return payload !== null && payload.sub === imageId;
}