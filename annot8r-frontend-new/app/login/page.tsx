// app/(auth)/login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";
import { UserRole } from "@/lib/types";
import Image from "next/image";

/**
 * Login page
 */
export default async function LoginPage() {
  // Properly await the cookies() call
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  // If already authenticated, redirect to appropriate page
  if (token) {
    // Get user info to determine redirect path
    const userInfoCookie = cookieStore.get("user_info")?.value;
    let redirectPath = "/dashboard"; // Default redirect

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
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Left panel with background image (visible on larger screens) */}
      <div className="hidden lg:block lg:w-1/2 bg-indigo-600 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-indigo-900/90"></div>
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 text-white">
          <h1 className="text-4xl font-bold mb-6">Annotation Platform</h1>
          <p className="text-xl max-w-md text-center text-indigo-100">
            Secure, efficient image annotation for your proprietary datasets
          </p>
        </div>
      </div>
      
      {/* Right panel with login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/image.png"
                alt="Annotation Platform Logo"
                width={80}
                height={80}
                priority
              />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Log in to continue to the annotation platform
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}