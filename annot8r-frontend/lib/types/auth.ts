// lib/types/auth.ts

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface DeviceInfo {
  platform: string;
  screenResolution: string;
  language: string;
  timezone: string;
}

export interface AuthResponse {
  token: string;
  expiry: string;
  role: UserRole;
  redirectTo: string;
  deviceChanged?: boolean;
}

export interface UserInfo {
  username: string;
  role: UserRole;
  deviceInfo?: {
    fingerprint: string;
    userAgent: string;
    lastSeen: string;
  };
  isLocked?: boolean;
  lockReason?: string;
  isSuperAdmin?: boolean;
  isOfficeUser?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  deviceInfo: DeviceInfo;
}

// For server-side auth state
export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
}
