// lib/actions/auth.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login as loginApi, logout as logoutApi } from "@/lib/apis/auth";
import type { LoginCredentials, DeviceInfo } from "@/lib/types/auth";

export async function login(credentials: LoginCredentials) {
  try {
    console.log("Sending login credentials to API", {
      ...credentials,
      password: "[REDACTED]", // Don't log actual password
    });

    const response = await loginApi(credentials);

    // Log the token for debugging (remove in production)
    if (response && response.token) {
      console.log(
        "Auth token received:",
        response.token.substring(0, 10) + "..."
      );

      const cookieStore = await cookies();

      // Set auth cookie - make sure there are no extra spaces or encoding issues
      cookieStore.set("auth_token", response.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(response.expiry),
        path: "/",
      });

      // Force revalidation
      revalidatePath("/", "layout");

      // Redirect based on role
      redirect(response.redirectTo);
    } else {
      console.error("Invalid response from login API", response);
      throw new Error("Invalid response from login API");
    }
  } catch (error) {
    console.error("Login action error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Login failed. Please try again.");
  }
}

export async function logout() {
  try {
    // Call API to invalidate token
    await logoutApi();
  } finally {
    // Always remove cookie and redirect, even if API call fails
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    redirect("/login");
  }
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value;
}

// Helper to verify client's device info matches stored info
export async function verifyDeviceInfo(
  deviceInfo: DeviceInfo
): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/auth/verify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceInfo }),
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}
