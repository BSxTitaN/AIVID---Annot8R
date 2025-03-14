// lib/api/admin-dashboard.ts
import { clientApi } from "@/lib/utils/api-fetcher";
import type { 
  ApiResponse, 
  DashboardStats, 
  PaginatedResponse, 
  ActivityLog,
  Project
} from "@/lib/types";

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  try {
    const response = await clientApi.get<DashboardStats>('/admin/dashboard/stats');
    
    if ("success" in response) {
      return response;
    }
    
    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard statistics"
    };
  }
}

export async function getRecentProjects(limit = 5): Promise<ApiResponse<Project[]>> {
  try {
    const response = await clientApi.get<Project[]>(`/admin/dashboard/projects/recent?limit=${limit}`);
    
    if ("success" in response) {
      return response;
    }
    
    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recent projects"
    };
  }
}

export async function getActivityLogs(
  page = 1,
  limit = 10
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const response = await clientApi.get<PaginatedResponse<ActivityLog>>(
      `/admin/dashboard/activity-logs?page=${page}&limit=${limit}`
    );
    
    if ("success" in response) {
      return response;
    }
    
    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch activity logs"
    };
  }
}