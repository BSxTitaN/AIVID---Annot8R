// lib/api/projects.ts
import { clientApi } from "@/lib/utils/api-fetcher";
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  ProjectMember,
  ProjectClass,
  ProjectImage,
  ManualAssignmentRequest,
  Assignment,
  Submission,
  SubmissionStatus,
  ProxiedImageUrl,
  Annotation,
  CreateExportRequest,
  ProjectExport,
  ExportStatus,
  ProjectMemberForAssignment,
  AssignmentMetrics,
} from "@/lib/types";

// Project operations
export async function getProjects(
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<Project>>> {
  try {
    console.log(`Fetching projects with page=${page}, limit=${limit}`);

    // Log the API URL being used
    console.log(
      "API URL:",
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
    );

    // Check if auth token exists
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      console.log("Auth token exists:", !!token);
    }

    const response = await clientApi.get<{
      data?: Project[];
      projects?: Project[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(`/projects?page=${page}&limit=${limit}`);

    console.log("Raw projects API response:", response);

    // Handle various response formats
    if (response.success === true && response.data) {
      console.log("Response has success and data properties");

      // Check data structure
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log("Data is in response.data.data");
        return response as ApiResponse<PaginatedResponse<Project>>;
      } else if (
        response.data.projects &&
        Array.isArray(response.data.projects)
      ) {
        console.log("Data is in response.data.projects");
        // Transform response structure to match expected format
        const formatted: ApiResponse<PaginatedResponse<Project>> = {
          ...response,
          data: {
            data: response.data.projects,
            total: response.data.total || response.data.projects.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.projects.length) / limit
              ),
          },
        };
        return formatted;
      } else if (Array.isArray(response.data)) {
        console.log("response.data itself is an array");
        const projectsArray = response.data as unknown as Project[];
        return {
          success: true,
          data: {
            data: projectsArray,
            total: projectsArray.length,
            page,
            limit,
            totalPages: Math.ceil(projectsArray.length / limit),
          },
        };
      }
    }

    // Fallback: Whatever the format, return it wrapped appropriately
    console.log("Using fallback response handling");
    return {
      success: false,
      error: "Invalid response format from projects API",
    };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to projects API",
    };
  }
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  try {
    const response = await clientApi.get<Project>(`/projects/${id}`);
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project details",
    };
  }
}

export async function createProject(
  projectData: CreateProjectRequest
): Promise<ApiResponse<Project>> {
  try {
    const response = await clientApi.post<Project>("/projects", projectData);
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

export async function updateProject(
  id: string,
  projectData: UpdateProjectRequest
): Promise<ApiResponse<Project>> {
  try {
    const response = await clientApi.patch<Project>(
      `/projects/${id}`,
      projectData
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

export async function deleteProject(id: string): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.delete<null>(`/projects/${id}`);
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}

// Project members operations
export async function getProjectMembers(
  projectId: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<ProjectMember>>> {
  try {
    const response = await clientApi.get<
      | PaginatedResponse<ProjectMember>
      | {
          members?: ProjectMember[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(`/projects/${projectId}/members?page=${page}&limit=${limit}`);

    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<ProjectMember>>;
      }

      // If the data is in a different format but contains members
      if ("members" in response.data && Array.isArray(response.data.members)) {
        return {
          success: true,
          data: {
            data: response.data.members,
            total: response.data.total || response.data.members.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.members.length) / limit
              ),
          },
        };
      }
    }

    if ("success" in response) {
      return response as ApiResponse<PaginatedResponse<ProjectMember>>;
    }

    // If response doesn't have success property, assume it's the direct data
    return {
      success: true,
      data: response as PaginatedResponse<ProjectMember>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project members",
    };
  }
}

export async function addProjectMember(
  projectId: string,
  data: AddProjectMemberRequest
): Promise<ApiResponse<ProjectMember>> {
  try {
    const response = await clientApi.post<ProjectMember>(
      `/projects/${projectId}/members`,
      data
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add member to project",
    };
  }
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.delete<null>(
      `/projects/${projectId}/members/${userId}`
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove member from project",
    };
  }
}

export async function getProjectClasses(
  projectId: string
): Promise<
  ApiResponse<{ classes: ProjectClass[]; allowCustomClasses: boolean }>
> {
  try {
    const response = await clientApi.get<{
      classes: ProjectClass[];
      allowCustomClasses: boolean;
    }>(`/user/projects/${projectId}/classes`);
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project classes",
    };
  }
}

// Project image operations
export async function getProjectImages(
  projectId: string,
  page = 1,
  limit = 20,
  filters: Record<string, string> = {}
): Promise<ApiResponse<PaginatedResponse<ProjectImage>>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    // Add filters to query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    const response = await clientApi.get<
      | PaginatedResponse<ProjectImage>
      | {
          images?: ProjectImage[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(`/projects/${projectId}/images?${queryParams.toString()}`);

    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<ProjectImage>>;
      }

      // If the data is in a different format but contains images
      if ("images" in response.data && Array.isArray(response.data.images)) {
        return {
          success: true,
          data: {
            data: response.data.images,
            total: response.data.total || response.data.images.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.images.length) / limit
              ),
          },
        };
      }
    }

    if ("success" in response) {
      return response as ApiResponse<PaginatedResponse<ProjectImage>>;
    }

    // If response doesn't have success property, assume it's the direct data
    return {
      success: true,
      data: response as PaginatedResponse<ProjectImage>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project images",
    };
  }
}

export async function deleteImage(
  projectId: string,
  imageId: string
): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.delete<null>(
      `/projects/${projectId}/images/${imageId}`
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete image",
    };
  }
}

export async function uploadImages(
  projectId: string,
  files: File[]
): Promise<ApiResponse<ProjectImage[]>> {
  try {
    // Validate project ID format
    if (!projectId || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
      console.error(`Invalid project ID format: ${projectId}`);
      return {
        success: false,
        error:
          "Invalid project ID format. Must be a valid MongoDB ObjectId (24 hex characters).",
      };
    }

    console.log(`Uploading to project: ${projectId}`);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });

    const token = localStorage.getItem("auth_token") || "";
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

    const response = await fetch(
      `${apiUrl}/projects/${projectId}/images/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If not JSON
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload images",
    };
  }
}

export async function getAssignments(
  projectId: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<Assignment>>> {
  try {
    const response = await clientApi.get<
      | PaginatedResponse<Assignment>
      | {
          assignments?: Assignment[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(`/projects/${projectId}/assignments?page=${page}&limit=${limit}`);

    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<Assignment>>;
      }

      // If the data is in a different format but contains assignments
      if (
        "assignments" in response.data &&
        Array.isArray(response.data.assignments)
      ) {
        return {
          success: true,
          data: {
            data: response.data.assignments,
            total: response.data.total || response.data.assignments.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.assignments.length) /
                  limit
              ),
          },
        };
      }
    }

    if ("success" in response) {
      return response as ApiResponse<PaginatedResponse<Assignment>>;
    }

    // If response doesn't have success property, assume it's the direct data
    return {
      success: true,
      data: response as PaginatedResponse<Assignment>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch assignments",
    };
  }
}
// Annotations
export async function getAnnotation(
  projectId: string,
  imageId: string
): Promise<ApiResponse<Annotation>> {
  try {
    // The endpoint stays the same, since we're handling the difference on the backend
    const response = await clientApi.get<Annotation>(
      `/user/projects/${projectId}/images/${imageId}/annotations`
    );

    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch annotation",
    };
  }
}

export async function saveAnnotation(
  projectId: string,
  imageId: string,
  annotationData: {
    objects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    classIds: string[];
    classNames: string[];
    timeSpent: number;
    autoAnnotated: boolean;
  }
): Promise<ApiResponse<Annotation>> {
  try {
    console.log(`Saving annotation for project ${projectId}, image ${imageId}`);

    // Ensure we're sending to the correct endpoint
    const endpoint = `/user/projects/${projectId}/images/${imageId}/annotations`;
    console.log(`Sending to endpoint: ${endpoint}`);

    const response = await clientApi.post<Annotation>(endpoint, annotationData);

    console.log("Save annotation response:", response);

    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error saving annotation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save annotation",
    };
  }
}

export async function autoSaveAnnotation(
  projectId: string,
  imageId: string,
  annotationData: {
    objects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    classIds: string[];
    classNames: string[];
    timeSpent: number;
  }
): Promise<ApiResponse<null>> {
  try {
    console.log(
      `Auto-saving annotation for project ${projectId}, image ${imageId}`
    );

    // Ensure we're sending to the correct endpoint
    const endpoint = `/user/projects/${projectId}/images/${imageId}/annotations/autosave`;
    console.log(`Sending to endpoint: ${endpoint}`);

    const response = await clientApi.patch<null>(endpoint, annotationData);

    console.log("Auto-save response:", response);

    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error auto-saving annotation:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to auto-save annotation",
    };
  }
}

export async function autoAnnotate(
  projectId: string,
  imageId: string
): Promise<ApiResponse<Annotation>> {
  try {
    console.log(`Auto-annotating for project ${projectId}, image ${imageId}`);

    // This endpoint is the most likely to have path issues
    // The correct path should match the backend route definition
    const endpoint = `/user/projects/${projectId}/images/${imageId}/annotations/auto-annotate`;
    console.log(`Sending to endpoint: ${endpoint}`);

    const response = await clientApi.post<Annotation>(endpoint, {});

    console.log("Auto-annotate response:", response);

    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error auto-annotating:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to auto-annotate image",
    };
  }
}

export async function getSubmissions(
  projectId: string,
  page = 1,
  limit = 20,
  status?: SubmissionStatus,
  userId?: string
): Promise<ApiResponse<PaginatedResponse<Submission>>> {
  try {
    let url = `/projects/${projectId}/submissions?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    if (userId) {
      url += `&userId=${userId}`;
    }

    const response = await clientApi.get<{
      submissions?: Submission[];
      data?: Submission[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(url);

    if (response.success && response.data) {
      // Transform the response to the expected format
      if (
        "submissions" in response.data &&
        Array.isArray(response.data.submissions)
      ) {
        return {
          success: true,
          data: {
            data: response.data.submissions,
            total: response.data.total || response.data.submissions.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.submissions.length) /
                  limit
              ),
          },
        };
      }
    }

    return response as ApiResponse<PaginatedResponse<Submission>>;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch submissions",
    };
  }
}

/**
 * Get a specific submission by ID
 */
export async function getSubmission(
  projectId: string,
  submissionId: string
): Promise<ApiResponse<Submission>> {
  try {
    const response = await clientApi.get<Submission>(
      `/projects/${projectId}/submissions/${submissionId}`
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch submission details",
    };
  }
}

/**
 * Review a submission (approve or reject)
 */
export async function reviewSubmission(
  projectId: string,
  submissionId: string,
  reviewData: {
    status: SubmissionStatus;
    feedback: string;
    flaggedImages: Array<{
      imageId: string;
      reason: string;
    }>;
    imageFeedback?: Array<{
      imageId: string;
      feedback: string;
    }>;
  }
): Promise<ApiResponse<Submission>> {
  try {
    const response = await clientApi.post<Submission>(
      `/projects/${projectId}/submissions/${submissionId}/review`,
      reviewData
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to review submission",
    };
  }
}

export async function updateImageFeedback(
  projectId: string,
  submissionId: string,
  imageId: string,
  feedback: string
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    // Use the existing review endpoint with a special flag
    const response = await clientApi.patch<{ success: boolean }>(
      `/projects/${projectId}/submissions/${submissionId}/review`,
      {
        partialUpdate: true,
        status: "UNDER_REVIEW", // Don't change status
        feedback: "", // No overall feedback
        imageFeedback: [
          {
            imageId: imageId,
            feedback: feedback,
          },
        ],
      }
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update image feedback",
    };
  }
}

// Export operations
export async function createExport(
  projectId: string,
  exportData: CreateExportRequest
): Promise<ApiResponse<ProjectExport>> {
  try {
    const response = await clientApi.post<ProjectExport>(
      `/projects/${projectId}/exports`,
      exportData
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create export",
    };
  }
}

export async function getExports(
  projectId: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<ProjectExport>>> {
  try {
    const response = await clientApi.get<
      | PaginatedResponse<ProjectExport>
      | {
          exports?: ProjectExport[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(`/projects/${projectId}/exports?page=${page}&limit=${limit}`);

    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<ProjectExport>>;
      }

      // If the data is in a different format but contains exports
      if ("exports" in response.data && Array.isArray(response.data.exports)) {
        return {
          success: true,
          data: {
            data: response.data.exports,
            total: response.data.total || response.data.exports.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages:
              response.data.totalPages ||
              Math.ceil(
                (response.data.total || response.data.exports.length) / limit
              ),
          },
        };
      }
    }

    if ("success" in response) {
      return response as ApiResponse<PaginatedResponse<ProjectExport>>;
    }

    // If response doesn't have success property, assume it's the direct data
    return {
      success: true,
      data: response as PaginatedResponse<ProjectExport>,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch exports",
    };
  }
}

export async function getExportDownload(
  projectId: string,
  exportId: string
): Promise<ApiResponse<{ url: string }>> {
  try {
    const response = await clientApi.get<{ url: string }>(
      `/projects/${projectId}/exports/${exportId}/download`
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get export download URL",
    };
  }
}

export async function getExportStatus(
  projectId: string,
  exportId: string
): Promise<ApiResponse<{ status: ExportStatus }>> {
  try {
    const response = await clientApi.get<{ status: ExportStatus }>(
      `/projects/${projectId}/exports/${exportId}/status`
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get export status",
    };
  }
}

export async function getProxiedImageUrl(
  projectId: string,
  imageId: string
): Promise<ApiResponse<ProxiedImageUrl>> {
  try {
    // Get the auth token from localStorage
    const token = localStorage.getItem("auth_token");
    if (!token) {
      return {
        success: false,
        error: "Authentication token not found",
      };
    }

    // Make the request with authentication
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const response = await fetch(
      `${apiUrl}/projects/${projectId}/images/${imageId}/proxy`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get image URL: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      return {
        success: false,
        error: data.error || "Invalid response from proxy endpoint",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("Error fetching proxied image URL:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch proxied image URL",
    };
  }
}

export async function getImageBlob(
  projectId: string,
  imageId: string
): Promise<ApiResponse<Blob>> {
  try {
    // First, get the proxied URL with proper authentication
    const urlResponse = await getProxiedImageUrl(projectId, imageId);
    if (!urlResponse.success || !urlResponse.data) {
      return {
        success: false,
        error: urlResponse.error || "Failed to get proxied image URL",
      };
    }

    // Then use the proxied URL to fetch the actual image
    // This URL might already include the token as a query parameter
    const imageUrl = urlResponse.data.url;

    // Get the token for the image request if needed separately
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Fetch the image using the provided URL
    const response = await fetch(imageUrl, { headers });
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to load image: ${response.status} ${response.statusText}`,
      };
    }

    const blob = await response.blob();
    return {
      success: true,
      data: blob,
    };
  } catch (error) {
    console.error("Error fetching image blob:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch image blob",
    };
  }
}

// Function to load images for grid view
export async function loadImageForGrid(
  projectId: string,
  imageId: string,
  setImageUrls: React.Dispatch<React.SetStateAction<Map<string, string>>>,
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>
): Promise<void> {
  try {
    const response = await getProxiedImageUrl(projectId, imageId);
    if (response.success && response.data && response.data.url) {
      const imageUrl = response.data.url; // Store URL in a variable
      setImageUrls((prev) => {
        const newMap = new Map(prev);
        newMap.set(imageId, imageUrl);
        return newMap;
      });
    } else {
      console.error(`Failed to load image ${imageId}:`, response.error);
      setFailedImages((prev) => {
        const newSet = new Set(prev);
        newSet.add(imageId);
        return newSet;
      });
    }
  } catch (error) {
    console.error(`Error loading image ${imageId}:`, error);
    setFailedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }
}

/**
 * Get assignment metrics for a project
 */
export async function getAssignmentMetrics(
  projectId: string
): Promise<ApiResponse<AssignmentMetrics>> {
  try {
    const response = await clientApi.get<AssignmentMetrics>(
      `/projects/${projectId}/assignments/metrics`
    );

    if ("success" in response) {
      return response;
    }

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error fetching assignment metrics:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch assignment metrics",
    };
  }
}

/**
 * Get project members eligible for assignment
 */
export async function getProjectAssignmentMembers(
  projectId: string
): Promise<ApiResponse<{ members: ProjectMemberForAssignment[] }>> {
  try {
    const response = await clientApi.get<{
      members: ProjectMemberForAssignment[];
    }>(`/projects/${projectId}/assignments/members`);

    if ("success" in response) {
      return response;
    }

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error fetching project members for assignment:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project members",
    };
  }
}

/**
 * Create manual assignment
 */
export async function createManualAssignment(
  projectId: string,
  data: ManualAssignmentRequest
): Promise<ApiResponse<null>> {
  try {
    // Adding a console log to help with debugging
    console.log("Creating manual assignment:", { projectId, data });

    const response = await clientApi.post<null>(
      `/projects/${projectId}/assignments`,
      data
    );

    if ("success" in response) {
      return response;
    }

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error creating manual assignment:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create manual assignment",
    };
  }
}

/**
 * Create smart distribution
 */
export async function createSmartDistribution(
  projectId: string,
  resetDistribution: boolean = false
): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.post<null>(
      `/projects/${projectId}/assignments/smart`,
      { resetDistribution }
    );

    if ("success" in response) {
      return response;
    }

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error creating smart distribution:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create smart distribution",
    };
  }
}

export async function getUsersByRole(
  projectId: string,
  role: string
): Promise<ApiResponse<ProjectMember[]>> {
  try {
    const response = await clientApi.get<ProjectMember[]>(
      `/projects/${projectId}/members?role=${role}`
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project members",
    };
  }
}

export async function markProjectAsComplete(
  projectId: string
): Promise<ApiResponse<Project>> {
  try {
    const response = await clientApi.post<Project>(
      `/projects/${projectId}/complete`,
      {}
    );
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark project as complete",
    };
  }
}

export async function getSubmissionStats(projectId: string): Promise<
  ApiResponse<{
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
  }>
> {
  try {
    const response = await clientApi.get<{
      totalSubmissions: number;
      pendingSubmissions: number;
      approvedSubmissions: number;
      rejectedSubmissions: number;
    }>(`/projects/${projectId}/submissions/stats`);
    if ("success" in response) {
      return response;
    }
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch submission statistics",
    };
  }
}
