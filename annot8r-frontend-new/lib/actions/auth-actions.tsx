"use server";

/**
 * Server-side Authentication Actions
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthUser, LoginRequest, ApiResponse } from "@/lib/types";
import { fetchApi } from "@/lib/utils/api-fetcher";

/**
 * Server action for user login
 */
export async function loginUser(
  credentials: LoginRequest
): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
  try {
    console.log("Server loginUser: Making API request");
    const response = await fetchApi<{ user: AuthUser; token: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(credentials),
        auth: false,
      }
    );
    console.log("Server loginUser: Got response", response.success);

    if (response.success && response.data) {
      // Set auth token in cookies (HttpOnly for security)
      console.log("Server loginUser: Setting cookies");
      const cookieStore = await cookies();
      cookieStore.set("auth_token", response.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 60, // 30 minutes
        path: "/",
      });

      // Store user info in session storage (less sensitive)
      cookieStore.set("user_info", JSON.stringify(response.data.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 60, // 30 minutes
        path: "/",
      });
      
      console.log("Server loginUser: Cookies set successfully");
    }

    return response;
  } catch (error) {
    console.error("Server loginUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}
/**
 * Server-side logout function
 */
export async function logoutUser(authToken: string): Promise<void> {
  try {
    if (authToken) {
      // Call logout API endpoint
      await fetchApi("/auth/logout", {
        method: "POST",
        authToken,
      });
    }
  } catch (error) {
    console.error("Logout API call failed:", error);
  }

  // Clear cookies regardless of API success
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_info");

  // Redirect to login page
  redirect("/login");
}

/**
 * Get the current user from cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const userInfoCookie = cookieStore.get("user_info");

  if (!userInfoCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(userInfoCookie.value) as AuthUser;
  } catch (error) {
    console.error("Failed to parse user info from cookie:", error);
    return null;
  }
}

/**
 * Get auth token from cookies
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value;
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get("auth_token")?.value;
}
