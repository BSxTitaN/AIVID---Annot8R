// lib/apis/admins.ts
import { fetchWithAuth } from "./config";
import { AdminInfo } from "../types/admins";

export interface CreateAdminPayload {
  username: string;
  password: string;
  isSuperAdmin?: boolean;
}

// Get all admins (super admin only)
export async function getAllAdmins(): Promise<AdminInfo[]> {
  const response = await fetchWithAuth("/admins");
  return response.admins;
}

// Create new admin (super admin only)
export async function createAdmin(
  adminData: CreateAdminPayload
): Promise<boolean> {
  const response = await fetchWithAuth("/admins", {
    method: "POST",
    body: JSON.stringify(adminData),
  });

  return response.success === true;
}

// Delete admin (super admin only)
export async function deleteAdmin(adminId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/admins/${adminId}`, {
    method: "DELETE",
  });

  return response.success === true;
}

// Reset admin password (super admin only)
export async function resetAdminPassword(
  adminId: string,
  newPassword: string
): Promise<boolean> {
  const response = await fetchWithAuth(`/admins/${adminId}/password`, {
    method: "PUT",
    body: JSON.stringify({
      username: adminId,
      newPassword,
    }),
  });

  return response.success === true;
}

// Get admin logs (super admin only)
export async function getAdminLogs(
  adminId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  logs: Array<{
    _id: string;
    timestamp: Date;
    logType: string;
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
  };
}> {
  return fetchWithAuth(`/admins/${adminId}/logs?page=${page}&limit=${limit}`);
}
