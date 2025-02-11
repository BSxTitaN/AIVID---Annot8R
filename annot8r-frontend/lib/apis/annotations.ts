// lib/api/annotations.ts
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
      `/annotations/${userId}/${projectId}/${imageId}`
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
      `/annotations/${userId}/${projectId}/${imageId}`,
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
 * Handles both regular classes and numbered format (e.g., "Car - 01")
 */
export async function getClasses(
  userId: string,
  projectId: string
): Promise<{ classes: string[]; isOfficeUser: boolean }> {
  try {
    const response: ClassesResponse = await fetchWithAuth(
      `/annotations/${userId}/${projectId}/classes`
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
