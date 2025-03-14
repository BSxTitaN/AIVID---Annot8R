/**
 * API Fetcher
 *
 * Utility for making API requests with consistent error handling and authentication.
 */

import { redirect } from "next/navigation";
import { ApiResponse } from "@/lib/types";

// Base API URL - should be defined in environment variables
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

console.log("API_BASE_URL being used:", API_BASE_URL);

// Define Next.js specific options
interface NextOptions {
  revalidate?: number;
  tags?: string[];
}

export interface FetchOptions extends RequestInit {
  /**
   * Whether to include authentication token in the request
   * @default true
   */
  auth?: boolean;

  /**
   * Authentication token to use (for server components)
   */
  authToken?: string;

  /**
   * Cache and revalidation options for Next.js data fetching
   */
  cache?: "force-cache" | "no-store";
  revalidate?: number;
  tags?: string[];

  /**
   * Whether to throw an error on non-2xx responses
   * @default true
   */
  throwOnError?: boolean;
}

/**
 * Makes an API request with proper error handling and authentication
 * This version is for server components
 */
export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    auth = true,
    authToken,
    cache,
    revalidate,
    tags,
    throwOnError = true,
    ...fetchOptions
  } = options;

  // Prepare headers
  const newHeaders = new Headers(fetchOptions.headers);

  // Set default content type if not provided and method is POST, PUT, or PATCH
  if (
    (fetchOptions.method === "POST" ||
      fetchOptions.method === "PUT" ||
      fetchOptions.method === "PATCH") &&
    !newHeaders.has("Content-Type") &&
    !(fetchOptions.body instanceof FormData) // Don't set content type for FormData
  ) {
    newHeaders.set("Content-Type", "application/json");
  }

  // Add authentication token if required
  if (auth && authToken) {
    newHeaders.set("Authorization", `Bearer ${authToken}`);
  } else if (auth && !authToken) {
    // If auth is required but no token is provided, redirect to login
    redirect("/login");
  }

  // Prepare fetch options
  const requestInit: RequestInit = {
    ...fetchOptions,
    headers: newHeaders,
  };

  // Add Next.js cache options if provided
  const nextConfig: { next?: NextOptions } = {};

  if (revalidate !== undefined || tags) {
    nextConfig.next = {
      ...(revalidate !== undefined ? { revalidate } : {}),
      ...(tags ? { tags } : {}),
    };
  }

  // Set cache option if provided
  if (cache) {
    requestInit.cache = cache;
  }

  // Create final options by combining standard RequestInit with Next.js specific options
  const finalOptions = {
    ...requestInit,
    ...nextConfig,
  };

  // Make the request
  try {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, finalOptions);

    // Parse response based on content type
    let data: ApiResponse<T>;
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      data = (await response.json()) as ApiResponse<T>;
    } else {
      // For non-JSON responses, create a generic successful response with text
      const text = await response.text();
      data = {
        success: response.ok,
        data: text as unknown as T,
      };
    }

    // Check for API error response
    if (!response.ok && throwOnError) {
      const error = new Error(data.error || "API request failed");
      (error as Error & { status?: number; response?: ApiResponse<T> }).status =
        response.status;
      (
        error as Error & { status?: number; response?: ApiResponse<T> }
      ).response = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (throwOnError) {
      throw error;
    }

    // Return error as ApiResponse if not throwing
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    } as ApiResponse<T>;
  }
}

/**
 * Helper function for GET requests
 */
export function get<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { ...options, method: "GET" });
}

/**
 * Helper function for POST requests
 */
export function post<T>(
  endpoint: string,
  data: unknown,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Helper function for PUT requests
 */
export function put<T>(
  endpoint: string,
  data: unknown,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Helper function for PATCH requests
 */
export function patch<T>(
  endpoint: string,
  data: unknown,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Helper function for DELETE requests
 */
export function del<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { ...options, method: "DELETE" });
}

/**
 * Client-side API fetcher
 */
export const clientApi = {
  async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const { auth = true, throwOnError = true, ...fetchOptions } = options;

    // Prepare headers
    const headers = new Headers(fetchOptions.headers);

    if (
      (fetchOptions.method === "POST" ||
        fetchOptions.method === "PUT" ||
        fetchOptions.method === "PATCH") &&
      !headers.has("Content-Type") &&
      !(fetchOptions.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }

    // Add authentication token if required
    if (auth && typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");

      if (!token && throwOnError) {
        window.location.href = "/login";
        throw new Error("Authentication required");
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    // Make the request
    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Parse response
      let data: ApiResponse<T>;
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        data = (await response.json()) as ApiResponse<T>;
      } else {
        const text = await response.text();
        data = {
          success: response.ok,
          data: text as unknown as T,
        };
      }

      // Check for API error response
      if (!response.ok && throwOnError) {
        const error = new Error(data.error || "API request failed");
        (
          error as Error & { status?: number; response?: ApiResponse<T> }
        ).status = response.status;
        (
          error as Error & { status?: number; response?: ApiResponse<T> }
        ).response = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (throwOnError) {
        throw error;
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } as ApiResponse<T>;
    }
  },

  get<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(
    endpoint: string,
    data: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put<T>(
    endpoint: string,
    data: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  patch<T>(
    endpoint: string,
    data: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: "DELETE" });
  },
};
