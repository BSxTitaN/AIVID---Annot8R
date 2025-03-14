// lib/api/activity-logs.ts
import { clientApi } from "@/lib/utils/api-fetcher";
import type { ApiResponse, PaginatedResponse, ActivityLog } from "@/lib/types";

export async function getActivityLogs(
  page = 1,
  limit = 20,
  filters: Record<string, string> = {}
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    // Build query parameters with proper encoding
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    // Add each filter with proper encoding
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    const endpoint = `/admin/dashboard/activity-logs?${queryParams.toString()}`;
    console.log("Fetching activity logs from endpoint:", endpoint);

    const response = await clientApi.get<PaginatedResponse<ActivityLog>>(
      endpoint
    );

    // Format the response consistently
    if ("success" in response) {
      return response;
    }

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to activity logs API",
    };
  }
}

export async function exportActivityLogs(
  filters: Record<string, string> = {}
): Promise<ApiResponse<string>> {
  // Construct query string with filters
  let queryParams = "";

  Object.entries(filters).forEach(([key, value], index) => {
    if (value) {
      queryParams += `${index === 0 ? "?" : "&"}${key}=${encodeURIComponent(
        value
      )}`;
    }
  });

  try {
    const response = await clientApi.get<string>(
      `/admin/dashboard/activity-logs/export${queryParams}`
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
          : "Failed to export activity logs",
    };
  }
}
