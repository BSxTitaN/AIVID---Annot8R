// lib/apis/logs.ts
import { SecurityLogType } from "../types/logs";
import { fetchWithAuth } from "./config";

export interface SecurityLogFilters {
  userId?: string;
  logType?: SecurityLogType | SecurityLogType[];
  startDate?: Date;
  endDate?: Date;
  ip?: string;
  page?: number;
  limit?: number;
}

export interface SecurityLog {
  _id: string;
  userId: string;
  timestamp: Date;
  logType: SecurityLogType;
  details: {
    userAgent: string;
    ip: string;
    path?: string;
    keyPressed?: string;
    requestCount?: number;
    deviceInfo?: string;
    additionalInfo?: string;
  };
}

export interface LogsResponse {
  logs: SecurityLog[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

// Get security logs (admin only)
export async function getSecurityLogs(filters: SecurityLogFilters = {}): Promise<LogsResponse> {
  const queryParams = new URLSearchParams();
  
  if (filters.userId) queryParams.append('userId', filters.userId);
  if (filters.ip) queryParams.append('ip', filters.ip);
  
  if (filters.logType) {
    if (Array.isArray(filters.logType)) {
      filters.logType.forEach(type => queryParams.append('logType', type));
    } else {
      queryParams.append('logType', filters.logType);
    }
  }
  
  if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
  if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
  
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  
  const queryString = queryParams.toString();
  
  return fetchWithAuth(`/logs?${queryString}`);
}

// Get security stats (admin only)
export async function getSecurityStats(timeframe: number = 24): Promise<{
  timeframe: number;
  totalEvents: number;
  topUsers: Array<{ _id: string; count: number }>;
  eventDistribution: Array<{ _id: SecurityLogType; count: number }>;
  recentEvents: SecurityLog[];
}> {
  return fetchWithAuth(`/logs/stats?timeframe=${timeframe}`);
}

// Get user security summary (admin only)
export async function getUserSecuritySummary(userId: string): Promise<{
  recentLogs: SecurityLog[];
  summary: Array<{ 
    _id: SecurityLogType; 
    count: number; 
    lastOccurrence: Date 
  }>;
  totalEvents: number;
}> {
  return fetchWithAuth(`/logs/users/${userId}`);
}

// Get admin logs (super admin only)
export async function getAdminLogs(
  adminId: string,
  page: number = 1,
  limit: number = 20
): Promise<LogsResponse> {
  return fetchWithAuth(`/logs/admins/${adminId}?page=${page}&limit=${limit}`);
}

// Log security event from client
export async function logSecurityEvent(
  logType: SecurityLogType,
  additionalInfo?: string,
  keyPressed?: string
): Promise<boolean> {
  const response = await fetchWithAuth("/logs/events", {
    method: "POST",
    body: JSON.stringify({
      logType,
      additionalInfo,
      keyPressed,
    }),
  });
  
  return response.success === true;
}