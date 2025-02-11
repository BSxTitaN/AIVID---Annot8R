// src/types/auth.types.ts

export interface WebUser {
  _id?: string;
  username: string;
  passwordHash: string;
  salt: string;
  activeDevice?: {
    fingerprint: string;
    userAgent: string;
    lastSeen: Date;
    ip: string;
    deviceInfo?: string;
  };
  accessToken?: string;
  tokenExpiry?: Date;
  isLocked: boolean;
  isOfficeUser: boolean;
  lockReason?: string;
  lastLoginAttempt: Date;
  failedLoginAttempts: number;
  activityLog: {
    timestamp: Date;
    action: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    responseTime: number;
  }[];
  rateLimit: {
    count: number;
    resetAt: Date;
  };
}

export interface Admin {
  _id?: string;
  username: string;
  passwordHash: string;  // Changed from apiKey
  salt: string;         // Added for password hashing
  accessToken?: string;
  tokenExpiry?: Date;
  isSuperAdmin?: boolean;
  createdAt: Date;
  lastLogin?: Date;
  isLocked: boolean;
  lockReason?: string;
  failedLoginAttempts: number;
  lastLoginAttempt: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface AuthResponse {
  token: string;
  expiry: Date;
  role: 'user' | 'admin';
  redirectTo: string;
  deviceChanged?: boolean;
}

export interface UserInfo {
  username: string;
  role: 'user' | 'admin';
  deviceInfo?: {
    fingerprint: string;
    userAgent: string;
    lastSeen: Date;
  };
  isLocked?: boolean;
  lockReason?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  deviceInfo?: {
    platform: string;
    screenResolution: string;
    language: string;
    timezone: string;
  };
}