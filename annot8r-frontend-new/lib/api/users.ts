// lib/api/users.ts
import { clientApi } from "@/lib/utils/api-fetcher";
import type {
  ApiResponse,
  PaginatedResponse,
  UserProfile,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
} from "@/lib/types";

export async function getUsers(
  page = 1,
  limit = 10,
  query?: string
): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
  let endpoint = `/users?page=${page}&limit=${limit}`;
  if (query) {
    endpoint += `&query=${encodeURIComponent(query)}`;
  }

  console.log("Fetching users from endpoint:", endpoint);

  try {
    const response = await clientApi.get<PaginatedResponse<UserProfile>>(
      endpoint
    );
    console.log("Raw API response for users:", response);

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
    console.error("Error fetching users:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to users API",
    };
  }
}

export async function getUser(id: string): Promise<ApiResponse<UserProfile>> {
  return clientApi.get<UserProfile>(`/users/${id}`);
}

export async function createUser(
  userData: CreateUserRequest
): Promise<ApiResponse<UserProfile>> {
  return clientApi.post<UserProfile>("/users", userData);
}

export async function updateUser(
  id: string,
  userData: UpdateUserRequest
): Promise<ApiResponse<UserProfile>> {
  return clientApi.patch<UserProfile>(`/users/${id}`, userData);
}

export async function deleteUser(id: string): Promise<ApiResponse<null>> {
  return clientApi.delete<null>(`/users/${id}`);
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  const data: ResetPasswordRequest = { newPassword };
  return clientApi.post<null>(`/users/${id}/reset-password`, data);
}
