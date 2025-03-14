import { clientApi } from "@/lib/utils/api-fetcher";
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  ProjectImage,
  Submission,
  UserDashboardStats,
  ProjectCompletionStatus,
  UserAssignment,
  UserSubmission,
} from "@/lib/types";

export async function getUserProjects(
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<Project>>> {
  try {
    const response = await clientApi.get<
      | PaginatedResponse<Project>
      | {
          projects?: Project[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(`/user/projects?page=${page}&limit=${limit}`);

    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<Project>>;
      }

      // If the data is in a different format but contains projects
      if ("projects" in response.data && Array.isArray(response.data.projects)) {
        return {
          success: true,
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
      }
    }

    if ("success" in response) {
      return response as ApiResponse<PaginatedResponse<Project>>;
    }

    // If response doesn't have success property, assume it's the direct data
    return {
      success: true,
      data: response as PaginatedResponse<Project>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user projects",
    };
  }
}

export async function getUserProject(
  projectId: string
): Promise<ApiResponse<Project>> {
  try {
    const response = await clientApi.get<Project>(
      `/user/projects/${projectId}`
    );
    return response;
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

export async function getUserProjectImages(
  projectId: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<ApiResponse<PaginatedResponse<ProjectImage>>> {
  try {
    let url = `/user/projects/${projectId}/images?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    
    const response = await clientApi.get<
      | PaginatedResponse<ProjectImage>
      | {
          images?: ProjectImage[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
    >(url);

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

export async function getUserDashboardStats(): Promise<
  ApiResponse<UserDashboardStats>
> {
  try {
    const response = await clientApi.get<UserDashboardStats>(
      "/user/dashboard/stats"
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard statistics",
    };
  }
}

export async function checkProjectCompletionStatus(
  projectId: string
): Promise<ApiResponse<ProjectCompletionStatus>> {
  try {
    const response = await clientApi.get<ProjectCompletionStatus>(
      `/user/dashboard/projects/${projectId}/completion-status`
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check project completion status",
    };
  }
}

export async function getUserProjectStats(projectId: string): Promise<
  ApiResponse<{
    totalAssigned: number;
    annotated: number;
    unannotated: number;
    pendingReview: number;
    rejected: number;
    approved: number;
    progress: number;
    assignments: UserAssignment[];
    submissions: UserSubmission[];
  }>
> {
  try {
    interface RawStatsResponse {
      projectId?: string;
      projectName?: string;
      statistics?: {
        totalAssigned?: number;
        inProgress?: number;
        completed?: number;
        underReview?: number;
        flagged?: number;
        approved?: number;
        progress?: number;
      };
      assignments?: UserAssignment[];
      submissions?: UserSubmission[];
      canSubmit?: boolean;
    }

    const response = await clientApi.get<RawStatsResponse>(`/user/projects/${projectId}/stats`);

    if ("success" in response && response.success && response.data) {
      // Check if the data is in the expected format or needs transformation
      if ("statistics" in response.data && response.data.statistics) {
        // Transform the data structure to match what the frontend expects
        const stats = response.data.statistics;
        return {
          success: true,
          data: {
            totalAssigned: stats.totalAssigned || 0,
            annotated: stats.completed || 0,
            unannotated: (stats.totalAssigned || 0) - (stats.completed || 0),
            pendingReview: stats.underReview || 0,
            rejected: stats.flagged || 0,
            approved: stats.approved || 0,
            progress: stats.progress || 0,
            assignments: response.data.assignments || [],
            submissions: response.data.submissions || []
          }
        };
      }
      
      // If data structure is already in the expected format
      if ("totalAssigned" in response.data) {
        return response as ApiResponse<{
          totalAssigned: number;
          annotated: number;
          unannotated: number;
          pendingReview: number;
          rejected: number;
          approved: number;
          progress: number;
          assignments: UserAssignment[];
          submissions: UserSubmission[];
        }>;
      }
    }
    
    // If we get here, transform the response to match the expected format with default values
    console.warn("Unexpected stats format received from API:", response);
    return {
      success: response.success,
      error: response.error,
      data: {
        totalAssigned: 0,
        annotated: 0,
        unannotated: 0,
        pendingReview: 0,
        rejected: 0,
        approved: 0,
        progress: 0,
        assignments: response.data?.assignments || [],
        submissions: response.data?.submissions || []
      }
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch project statistics",
    };
  }
}

/**
 * Submit annotations for review
 * Path: /api/v1/user/projects/:projectId/assignments/:assignmentId/submit
 */
export async function submitForReview(
  projectId: string,
  assignmentId: string,
  message: string
): Promise<ApiResponse<Submission>> {
  try {
    const response = await clientApi.post<Submission>(
      `/user/projects/${projectId}/assignments/${assignmentId}/submit`,
      { message }
    );
    return response;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit for review",
    };
  }
}

/**
 * Get user's submissions for a project
 * Path: /api/v1/user/projects/:projectId/submissions
 */
export async function getUserProjectSubmissions(
  projectId: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<Submission>>> {
  try {
    const response = await clientApi.get<PaginatedResponse<Submission> | {
      submissions?: Submission[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(
      `/user/projects/${projectId}/submissions?page=${page}&limit=${limit}`
    );
    
    // Check if the response has the success property
    if ("success" in response && response.success && response.data) {
      // If the data has the expected PaginatedResponse format with 'data' property
      if ("data" in response.data) {
        return response as ApiResponse<PaginatedResponse<Submission>>;
      }
      
      // If the data has a 'submissions' property instead
      if ("submissions" in response.data && Array.isArray(response.data.submissions)) {
        return {
          success: true,
          data: {
            data: response.data.submissions,
            total: response.data.total || response.data.submissions.length,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages: response.data.totalPages || 
              Math.ceil((response.data.total || response.data.submissions.length) / limit),
          },
        };
      }
      
      // For any other format, return as is
      return response as ApiResponse<PaginatedResponse<Submission>>;
    }
    
    // Default to empty response if format doesn't match
    return {
      success: true,
      data: {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user submissions",
    };
  }
}
/**
 * Get a specific user submission
 * Path: /api/v1/user/projects/:projectId/submissions/:submissionId
 */
export async function getUserSubmission(
  projectId: string,
  submissionId: string
): Promise<ApiResponse<Submission>> {
  try {
    const response = await clientApi.get<Submission>(
      `/user/projects/${projectId}/submissions/${submissionId}`
    );
    
    // Check if the response already has the success property
    if ("success" in response) {
      // If the data already exists and has the right format, return it
      if (response.success && response.data) {
        // Ensure response.data is wrapped in a data property
        return {
          success: true,
          data: response.data
        };
      }
      return response;
    }
    
    // If response doesn't have success property, assume it's the direct data
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
          : "Failed to fetch submission details",
    };
  }
}

/**
 * Get submission status for a project
 * Path: /api/v1/user/projects/:projectId/submissions/status
 */
export async function getSubmissionStatus(
  projectId: string
): Promise<ApiResponse<{
  totalAssigned: number;
  completed: number;
  flagged: number;
  approved: number;
  pendingReview: number;
  progress: number;
  canSubmit: boolean;
  pendingSubmission: Submission | null;
}>> {
  try {
    // Define the expected return type
    type SubmissionStatusResponse = {
      totalAssigned: number;
      completed: number;
      flagged: number;
      approved: number;
      pendingReview: number;
      progress: number;
      canSubmit: boolean;
      pendingSubmission: Submission | null;
    };
    
    const response = await clientApi.get<SubmissionStatusResponse>(
      `/user/projects/${projectId}/submissions/status`
    );
    
    // Check if the response already has the success property
    if ("success" in response) {
      // If the data already exists and has the right format, return it
      if (response.success && response.data) {
        // Ensure response.data is wrapped in a data property
        return {
          success: true,
          data: response.data
        };
      }
      return response;
    }
    
    // If response doesn't have success property, assume it's the direct data
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
          : "Failed to fetch submission status",
    };
  }
}