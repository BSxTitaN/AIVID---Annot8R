import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@/lib/types";

/**
 * Middleware for handling authentication and role-based access
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware running for path:", pathname);

  // Get user token from cookies
  const token = request.cookies.get("auth_token")?.value;
  const userInfo = request.cookies.get("user_info")?.value;

  console.log("Token in middleware:", token ? "exists" : "not found");

  // Public routes (no authentication required)
  const publicRoutes = ["/login", "/api/proxy"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // If already logged in, redirect away from login page
    if (token && pathname === "/login") {
      let redirectPath = "/dashboard"; // Default redirect

      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          if (
            user.role === UserRole.ADMIN ||
            user.role === UserRole.SUPER_ADMIN
          ) {
            redirectPath = "/admin";
          }
        } catch (error) {
          console.error("Failed to parse user info from cookie:", error);
        }
      }

      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    return NextResponse.next();
  }

  // Protected routes (require authentication)
  if (!token) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based route protection
  if (pathname.startsWith("/admin")) {
    // Check if user has admin role
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        if (
          user.role !== UserRole.ADMIN &&
          user.role !== UserRole.SUPER_ADMIN
        ) {
          // Redirect non-admins to user dashboard
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      } catch (error) {
        console.error("Failed to parse user info from cookie:", error);
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } else {
      // No user info available, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Allow access to authenticated routes
  return NextResponse.next();
}

/**
 * Configure which paths should be processed by this middleware
 */
export const config = {
  matcher: [
    // Match all routes except public assets and API routes (except proxy API)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|api/(?!proxy)).*)",
  ],
};
