// lib/types/admin.ts

// Base Admin type for database
export interface Admin {
    _id?: string;
    username: string;
    passwordHash: string;
    salt: string;
    isSuperAdmin: boolean;
    createdAt: Date;
    lastLogin?: Date;
    isLocked: boolean;
    lockReason?: string;
    accessToken?: string;
    tokenExpiry?: Date;
    failedLoginAttempts: number;
    lastLoginAttempt: Date;
  }
  
  // Admin info returned to frontend
  export interface AdminInfo {
    username: string;
    isSuperAdmin: boolean;
    createdAt: Date;
    lastLogin?: Date;
    isLocked: boolean;
    lockReason?: string;
    status: 'active' | 'locked';
  }
  
  // For creating new admin
  export interface CreateAdminPayload {
    username: string;
    password: string;
    isSuperAdmin?: boolean;
  }
  
  // For resetting admin password
  export interface ResetAdminPasswordPayload {
    username: string;
    newPassword: string;
  }
  
  // Admin action types
  export type AdminActionType = 'delete' | 'reset-password' | 'view-logs' | null;
  
  // Dialog state for admin actions
  export interface AdminDialogState {
    type: AdminActionType;
    admin: AdminInfo | null;
  }
  
  // Response for admin list
  export interface AdminListResponse {
    admins: AdminInfo[];
    total: number;
  }
  
  // Admin log entry
  export interface AdminLogEntry {
    _id?: string;
    adminId: string;
    timestamp: Date;
    action: string;
    ip: string;
    userAgent: string;
    details?: AdminLogDetails;
  }
  
  // Details for admin log entries
  export interface AdminLogDetails {
    targetUser?: string;
    actionType?: string;
    changes?: AdminChangeLog;
    additionalInfo?: string;
  }
  
  // Structure for logging changes
  export interface AdminChangeLog {
    field: string;
    oldValue: string | number | boolean;
    newValue: string | number | boolean;
  }
  
  // Admin logs response
  export interface AdminLogsResponse {
    logs: AdminLogEntry[];
    pagination: {
      total: number;
      page: number;
      totalPages: number;
    };
  }
  
  // Admin statistics
  export interface AdminStats {
    totalActions: number;
    lastActive?: Date;
    managedUsers: number;
    recentActions: AdminRecentAction[];
  }
  
  export interface AdminRecentAction {
    timestamp: Date;
    action: string;
    details?: string;
  }
  
  // Error responses
  export interface AdminError {
    code: AdminErrorCode;
    message: string;
    details?: string;
  }
  
  export type AdminErrorCode = 
    | 'UNAUTHORIZED' 
    | 'NOT_FOUND' 
    | 'FORBIDDEN' 
    | 'VALIDATION_ERROR' 
    | 'INTERNAL_ERROR';
  
  // Sort configuration for admin list
  export interface AdminSortConfig {
    field: AdminSortField;
    order: SortOrder;
  }
  
  export type AdminSortField = 'username' | 'createdAt' | 'lastLogin' | 'status';
  export type SortOrder = 'asc' | 'desc';
  
  // Filter options for admin list
  export interface AdminFilters {
    search?: string;
    status?: AdminStatus;
    role?: AdminRole;
  }
  
  export type AdminStatus = 'all' | 'active' | 'locked';
  export type AdminRole = 'all' | 'admin' | 'superadmin';
  
  // Pagination parameters
  export interface AdminPaginationParams {
    page: number;
    limit: number;
    sort?: AdminSortConfig;
    filters?: AdminFilters;
  }
  
  // Admin activity types
  export enum AdminActivityType {
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_DELETED = 'USER_DELETED',
    USER_LOCKED = 'USER_LOCKED',
    USER_UNLOCKED = 'USER_UNLOCKED',
    PASSWORD_RESET = 'PASSWORD_RESET',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    ADMIN_CREATED = 'ADMIN_CREATED',
    ADMIN_DELETED = 'ADMIN_DELETED',
    ADMIN_PASSWORD_RESET = 'ADMIN_PASSWORD_RESET',
    PROJECT_REVIEWED = 'PROJECT_REVIEWED',
    SETTINGS_UPDATED = 'SETTINGS_UPDATED'
  }
  
  // Admin session info
  export interface AdminSession {
    id: string;
    adminId: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
    lastActive: Date;
    isActive: boolean;
  }
  
  // Response for admin operations
  export interface AdminActionResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: AdminError;
  }