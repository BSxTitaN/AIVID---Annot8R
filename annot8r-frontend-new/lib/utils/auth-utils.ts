/**
 * Server-side authentication utilities
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthUser, UserRole } from "@/lib/types";

/**
 * Get the current user from cookies (server-side only)
 */
export async function getServerUser(): Promise<AuthUser | null> {
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
 * Get auth token from cookies (server-side only)
 */
export async function getServerToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value;
}

/**
 * Check if the user is authenticated on the server
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get("auth_token")?.value;
}

/**
 * Require authentication for a server component
 * If not authenticated, redirects to login
 */
export async function requireAuthentication(): Promise<{
  user: AuthUser;
  token: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const userInfoCookie = cookieStore.get("user_info")?.value;

  if (!token || !userInfoCookie) {
    redirect("/login");
  }

  try {
    const user = JSON.parse(userInfoCookie) as AuthUser;
    return { user, token };
  } catch (error) {
    console.error("Failed to parse user info from cookie:", error);
    redirect("/login");
  }
}

/**
 * Require admin role for a server component
 * If not authenticated or not an admin, redirects appropriately
 */
export async function requireAdmin(): Promise<{
  user: AuthUser;
  token: string;
}> {
  const { user, token } = await requireAuthentication();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  return { user, token };
}

/**
 * Require super admin role for a server component
 * If not authenticated or not a super admin, redirects appropriately
 */
export async function requireSuperAdmin(): Promise<{
  user: AuthUser;
  token: string;
}> {
  const { user, token } = await requireAuthentication();

  if (user.role !== UserRole.SUPER_ADMIN) {
    if (user.role === UserRole.ADMIN) {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return { user, token };
}
