// lib/apis/annotations.ts
import { fetchWithAuth } from "./config";
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
