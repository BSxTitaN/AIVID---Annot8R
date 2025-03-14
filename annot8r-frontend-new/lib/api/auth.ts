/**
 * Authentication API Functions - Client Side
 */

import { ApiResponse, AuthUser, LoginRequest } from "@/lib/types";
import { clientApi } from "@/lib/utils/api-fetcher";

/**
 * Client-side login function
 */
export async function clientLogin(
  credentials: LoginRequest
): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
  try {
    console.log("clientLogin: Making API request to login endpoint");
    const response = await clientApi.post<{ user: AuthUser; token: string }>(
      "/auth/login",
      credentials,
      { auth: false }
    );
    console.log("clientLogin: Received response:", response.success);

    if (response.success && response.data) {
      console.log("clientLogin: Storing token and user info");
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user_info", JSON.stringify(response.data.user));
      // Also set in cookies for SSR
      document.cookie = `auth_token=${response.data.token}; path=/; max-age=1800`;
      document.cookie = `user_info=${JSON.stringify(
        response.data.user
      )}; path=/; max-age=1800`;
    }

    return response;
  } catch (error) {
    console.error("clientLogin error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}

/**
 * Client-side logout function
 */
/**
 * Client-side logout function
 */
export async function clientLogout(): Promise<void> {
  try {
    // Call logout API endpoint
    await clientApi.post("/auth/logout", {});
  } catch (error) {
    console.error("Logout API call failed:", error);
  } finally {
    // Clear localStorage regardless of API success
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");

    // Clear cookies
    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Force page reload to trigger middleware redirect
    window.location.href = "/login";
  }
}
