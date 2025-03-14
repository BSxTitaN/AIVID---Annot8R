// src/middleware/core.ts
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoContext } from "../types/index.js";

export function createMiddleware<T>(
  handler: (c: Context<HonoContext>, next: Next) => Promise<T>,
  errorHandler?: (error: unknown) => never
) {
  return async (c: Context<HonoContext>, next: Next): Promise<void> => {
    try {
      await handler(c, next);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else if (error instanceof HTTPException) {
        throw error;
      } else {
        throw new HTTPException(500, {
          message:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
  };
}
