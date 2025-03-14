// lib/api/admins.ts
import { clientApi } from "@/lib/utils/api-fetcher";
import type {
  ApiResponse,
  PaginatedResponse,
  UserProfile,
  CreateAdminRequest,
  UpdateAdminRequest,
} from "@/lib/types";

export async function getAdmins(
  page = 1,
  limit = 10,
  query?: string
): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
  let endpoint = `/admins?page=${page}&limit=${limit}`;
  if (query) {
    endpoint += `&query=${encodeURIComponent(query)}`;
  }

  console.log("Fetching admins from endpoint:", endpoint);

  try {
    const response = await clientApi.get<PaginatedResponse<UserProfile>>(
      endpoint
    );
    console.log("Raw API response for admins:", response);

    // Handle the case where the response is already an ApiResponse
    if ("success" in response) {
      return response;
    }

    // Handle the case where the response is just the data
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to admins API",
    };
  }
}

export async function getAdmin(id: string): Promise<ApiResponse<UserProfile>> {
  try {
    const response = await clientApi.get<UserProfile>(`/admins/${id}`);

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
          : "Failed to fetch admin details",
    };
  }
}

export async function createAdmin(
  adminData: CreateAdminRequest
): Promise<ApiResponse<UserProfile>> {
  try {
    const response = await clientApi.post<UserProfile>("/admins", adminData);

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
      error: error instanceof Error ? error.message : "Failed to create admin",
    };
  }
}

export async function updateAdmin(
  id: string,
  adminData: UpdateAdminRequest
): Promise<ApiResponse<UserProfile>> {
  try {
    const response = await clientApi.patch<UserProfile>(
      `/admins/${id}`,
      adminData
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
      error: error instanceof Error ? error.message : "Failed to update admin",
    };
  }
}

export async function deleteAdmin(id: string): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.delete<null>(`/admins/${id}`);

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
      error: error instanceof Error ? error.message : "Failed to delete admin",
    };
  }
}

export async function resetAdminPassword(
  id: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  try {
    const response = await clientApi.post<null>(
      `/admins/${id}/reset-password`,
      { newPassword }
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
        error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}
