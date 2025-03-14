// src/utils/response.ts
import type { ApiResponse, PaginatedResponse } from "../types/index.js";

/**
 * API response formatting utilities
 */
export const response = {
  /**
   * Format a success response
   */
  success<T>(data: T, message?: string): ApiResponse<T> {
    return { success: true, data, ...(message && { message }) };
  },

  /**
   * Format an error response
   */
  error(message: string): ApiResponse<undefined> {
    return { success: false, error: message };
  },

  /**
   * Format a paginated response
   */
  paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
