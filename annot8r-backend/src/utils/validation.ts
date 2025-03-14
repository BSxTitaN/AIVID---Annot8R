// src/utils/validation.ts
import { z } from "zod";
import { HTTPException } from "hono/http-exception";

/**
 * Validation utilities
 */
export const validation = {
  /**
   * Validate data against a Zod schema
   */
  schema<T>(schema: z.ZodType<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join("."),
          message: issue.message
        }));
        throw new HTTPException(400, {
          message: "Validation Error",
          cause: { issues }
        });
      }
      throw new HTTPException(400, { message: "Invalid input data" });
    }
  },

  /**
   * Validate MongoDB ObjectId
   */
  objectId(id: string, paramName = "id"): boolean {
    if (!id) {
      throw new HTTPException(400, {
        message: `Invalid ${paramName}: must not be empty`
      });
    }
    
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      throw new HTTPException(400, {
        message: `Invalid ${paramName}: must be a valid ObjectId`
      });
    }
    
    return true;
  },

  /**
   * Check if a string is a valid ObjectId format without throwing
   */
  isValidObjectId(id: string | null | undefined): boolean {
    return !!id && /^[0-9a-fA-F]{24}$/.test(id);
  }
};