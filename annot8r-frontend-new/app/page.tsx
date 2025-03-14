import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole } from "@/lib/types";

/**
 * Home page - redirects based on authentication status
 */
export default async function HomePage() {
  // Properly await the cookies() call
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  // Redirect to appropriate page based on authentication status
  if (!token) {
    redirect("/login");
  }

  // Get user info to determine redirect path
  const userInfoCookie = cookieStore.get("user_info")?.value;
  let redirectPath = "/dashboard"; // Default redirect for authenticated users

  if (userInfoCookie) {
    try {
      const userInfo = JSON.parse(userInfoCookie);

      // Redirect based on role
      if (
        userInfo.role === UserRole.ADMIN ||
        userInfo.role === UserRole.SUPER_ADMIN
      ) {
        redirectPath = "/admin";
      }
    } catch (error) {
      console.error("Failed to parse user info from cookie:", error);
    }
  }

  redirect(redirectPath);

  // This won't be reached due to redirect, but is required for TypeScript
  return null;
}
