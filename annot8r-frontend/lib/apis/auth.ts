// lib/apis/auth.ts
import { cookies } from "next/headers";
import { AuthResponse, LoginCredentials, UserInfo } from "../types/auth";
import { API_BASE } from "./config";

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    // Add debugging for the URL we're hitting
    const loginUrl = `${API_BASE}/auth/login`;
    console.log("Attempting login at URL:", loginUrl);
    
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    // Log the raw response for debugging
    console.log("Status:", res.status);
    
    // Check if the response is JSON before trying to parse it
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    
    if (!isJson) {
      const rawText = await res.text();
      console.error("Non-JSON response:", rawText);
      throw new Error("Server did not return JSON. Check API endpoint URL.");
    }
    
    const data = await res.json();
    console.log("Response data:", data);

    if (!res.ok) {
      throw new Error(data.error || "Failed to login");
    }

    return data as AuthResponse;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Auth error:", res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceInfo: {
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    return data.valid;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return;

  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Cookie will be removed by the server response
}