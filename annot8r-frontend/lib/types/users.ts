export type SortField = "username" | "lastLogin" | "createdAt";
export type SortOrder = "asc" | "desc";
export type UserStatus = "all" | "active" | "locked";

export interface ActivityLogEntry {
  timestamp: Date;
  action: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  responseTime: number;
}

export interface Project {
  id: string;
  name: string;
  totalImages?: number;
  annotatedImages?: number;
  remainingImages?: number;
}

export interface UserInfo {
  _id: string;
  username: string;
  isLocked: boolean;
  lockReason?: string;
  lastLoginAttempt: Date;
  isOfficeUser: boolean;  // Add this field
  failedLoginAttempts: number;
  activeDevice?: {
    lastSeen: Date;
    ip: string;
    userAgent: string;
    deviceInfo?: string;
  };
  rateLimit: {
    count: number;
    resetAt: Date;
  };
  activityLog: ActivityLogEntry[];
}

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface DialogState {
  type:
    | "reset-password"
    | "lock"
    | "unlock"
    | "delete-user"
    | "delete-admin"
    | "create-project"
    | "rename-project"
    | null;
  user: UserInfo | null;
  project?: Project | null;
  reason?: string;
}

export type PanelType = "logs" | "projects" | null;

export interface PanelState {
  type: PanelType;
  user: UserInfo | null;
}

export interface DeviceInfoType {
  lastSeen: Date;
  ip: string;
  userAgent: string;
  deviceInfo?: string;
}

export type DialogType =
  | "reset-password"
  | "lock"
  | "unlock"
  | "delete-user"
  | "delete-admin"
  | "create-project"
  | "rename-project"
  | null;

export interface DialogState {
  type: DialogType;
  user: UserInfo | null;
  project?: Project | null;
}
