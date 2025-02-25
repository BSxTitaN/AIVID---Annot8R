// lib/apis/config.ts
import { getAuthToken } from "../actions/auth";

// Define API_BASE for both browser and server environments
export const API_BASE =
  typeof window !== "undefined"
    ? window.location.hostname === "localhost"
      ? "http://localhost:3001/api/v1"
      : `${window.location.origin}/api/v1`
    : process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1";

// Log the API base for debugging
console.log("API_BASE initialized as:", API_BASE);

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await getAuthToken();

  if (!token) {
    throw new ApiError(401, "No authentication token available");
  }

  console.log("Making API request to:", `${API_BASE}${endpoint}`);
  console.log("With headers:", {
    Authorization: "Bearer [redacted]",
    "Content-Type": "application/json",
    ...options.headers,
  });

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    const error = isJson ? await response.json() : await response.text();
    console.error("API Error:", error);
    throw new ApiError(
      response.status,
      error.error || error || `HTTP error! status: ${response.status}`
    );
  }

  const data = isJson ? await response.json() : response;
  console.log("API Response:", data);
  return data;
}
