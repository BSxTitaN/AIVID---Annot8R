// lib/apis/users.ts
import { SecurityLogType } from "../types/logs";
import { fetchWithAuth } from "./config";

export interface CreateUserPayload {
  username: string;
  password: string;
  isOfficeUser?: boolean;
}

export interface UserResponse {
  username: string;
  isLocked: boolean;
  lockReason?: string;
  lastLoginAttempt: Date;
  failedLoginAttempts: number;
  isOfficeUser: boolean;
  activeDevice?: {
    lastSeen: Date;
    ip: string;
    userAgent: string;
  };
  activityLog: Array<{
    timestamp: Date;
    action: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    responseTime: number;
  }>;
}

// Get all users (admin only)
export async function getAllUsers() {
  return fetchWithAuth("/users");
}

// Get user details
export async function getUserDetails(userId: string): Promise<UserResponse> {
  const response = await fetchWithAuth(`/users/${userId}`);
  return response.user;
}

// Create new user (admin only)
export async function createUser(userData: CreateUserPayload): Promise<boolean> {
  const response = await fetchWithAuth("/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  
  return response.success === true;
}

// Reset password (admin only)
export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
  
  return response.success === true;
}

// Lock user
export async function lockUser(userId: string, reason?: string): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ 
      action: "lock",
      reason 
    }),
  });
  
  return response.success === true;
}

// Unlock user
export async function unlockUser(userId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ action: "unlock" }),
  });
  
  return response.success === true;
}

// Force logout user
export async function forceLogoutUser(userId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}/sessions`, {
    method: "DELETE",
  });
  
  return response.success === true;
}

// Delete user
export async function deleteUser(userId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}`, {
    method: "DELETE",
  });
  
  return response.success === true;
}

// Update office status
export async function updateOfficeStatus(userId: string, isOfficeUser: boolean): Promise<boolean> {
  const response = await fetchWithAuth(`/users/${userId}/office-status`, {
    method: "PUT",
    body: JSON.stringify({ isOfficeUser }),
  });
  
  return response.success === true;
}

// Get user security logs
export async function getUserLogs(
  userId: string, 
  page: number = 1, 
  limit: number = 50,
  logType?: SecurityLogType
): Promise<{
  logs: Array<{
    _id: string;
    userId: string;
    timestamp: Date;
    logType: SecurityLogType;
    details: {
      userAgent: string;
      ip: string;
      path?: string;
      additionalInfo?: string;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}> {
  let query = `/users/${userId}/logs?page=${page}&limit=${limit}`;
  if (logType) {
    query += `&logType=${logType}`;
  }
  
  return fetchWithAuth(query);
}