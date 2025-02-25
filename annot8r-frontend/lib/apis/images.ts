// lib/apis/annotations.ts
import { getAuthToken } from "../actions/auth";
import {
  ImageMetadata,
  PaginatedImagesResponse,
} from "../types/project-detail";
import { API_BASE, fetchWithAuth } from "./config";
import type {
  Annotation,
  AnnotationState,
  AnnotationResponse,
  ClassesResponse,
} from "@/lib/types/annotations";

/**
 * Get all annotations for an image
 */
export async function getAnnotations(
  userId: string,
  projectId: string,
  imageId: string
): Promise<AnnotationState> {
  try {
    const response: AnnotationResponse = await fetchWithAuth(
      `/projects/${projectId}/images/${imageId}/annotations`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch annotations");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching annotations:", error);
    // Return empty state if error
    return {
      annotations: [],
      isAnnotated: false,
    };
  }
}

/**
 * Update annotations for an image
 */
export async function updateAnnotations(
  userId: string,
  projectId: string,
  imageId: string,
  annotations: Annotation[],
  customClass?: string
): Promise<boolean> {
  try {
    const response = await fetchWithAuth(
      `/projects/${projectId}/images/${imageId}/annotations`,
      {
        method: "POST",
        body: JSON.stringify({
          annotations,
          ...(customClass && { customClass }),
        }),
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to update annotations");
    }

    return true;
  } catch (error) {
    console.error("Error updating annotations:", error);
    throw error;
  }
}

/**
 * Get all annotation classes for a project
 */
export async function getClasses(
  userId: string,
  projectId: string
): Promise<{ classes: string[]; isOfficeUser: boolean }> {
  try {
    const response: ClassesResponse = await fetchWithAuth(
      `/projects/${projectId}/classes`
    );

    if (!response.success || !response.data) {
      console.error("Failed to fetch classes:", response.error);
      return {
        classes: [],
        isOfficeUser: false,
      };
    }

    // Clean up class names by removing the numbering
    const cleanedClasses = response.data.classes.map((className) => {
      // Remove numbering pattern (e.g., "- 01", "- 1", etc.)
      return className.split("-")[0].trim();
    });

    return {
      classes: cleanedClasses,
      isOfficeUser: response.data.isOfficeUser,
    };
  } catch (error) {
    console.error("Error fetching classes:", error);
    return {
      classes: [],
      isOfficeUser: false,
    };
  }
}

/**
 * Review annotations (admin only)
 */
export async function reviewAnnotations(
  projectId: string,
  imageId: string,
  status: "approved" | "changes_requested",
  feedback?: string
): Promise<boolean> {
  try {
    const response = await fetchWithAuth(
      `/projects/${projectId}/images/${imageId}/review`,
      {
        method: "POST",
        body: JSON.stringify({ status, feedback }),
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to review annotations");
    }

    return true;
  } catch (error) {
    console.error("Error reviewing annotations:", error);
    return false;
  }
}

/**
 * Get project images with pagination
 */
export async function getProjectImages(
  userId: string,
  projectId: string,
  options: {
    cursor?: string;
    limit?: number;
  } = {}
): Promise<PaginatedImagesResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (options.cursor) queryParams.append("cursor", options.cursor);
    if (options.limit) queryParams.append("limit", options.limit.toString());

    const response = await fetchWithAuth(
      `/images/project/${projectId}?${queryParams.toString()}`
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch images");
    }

    return response;
  } catch (error) {
    console.error("Error fetching project images:", error);
    throw error;
  }
}

/**
 * Get single image details
 */
export async function getImage(
  userId: string,
  projectId: string,
  imageId: string
): Promise<ImageMetadata> {
  try {
    const response = await fetchWithAuth(
      `/images/project/${projectId}/${imageId}`
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch image");
    }

    return response.image;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

/**
 * Upload images to project
 */
export async function uploadProjectImages(
  userId: string,
  projectId: string,
  files: File[]
): Promise<boolean> {
  try {
    const formData = new FormData();

    // Ensure we're appending each file individually
    files.forEach((file) => {
      // Use a consistent key name that matches backend
      formData.append(`images`, file);
    });

    const token = await getAuthToken();
    if (!token) {
      throw new Error("No authentication token available");
    }

    // Log FormData contents for debugging
    console.log(
      "Files being uploaded:",
      files.map((f) => f.name)
    );

    const response = await fetch(`${API_BASE}/images/project/${projectId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Let browser set Content-Type with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Upload response:", errorData);
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
}

/**
 * Delete project image
 */
export async function deleteProjectImage(
  projectId: string,
  imageId: string
): Promise<boolean> {
  try {
    const response = await fetchWithAuth(
      `/images/project/${projectId}/${imageId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to delete image");
    }

    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}
