export enum SecurityLogType {
  // Authentication events
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGIN_ATTEMPT_LOCKED = "LOGIN_ATTEMPT_LOCKED",
  ADMIN_LOGIN = "ADMIN_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",

  // Account events
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
  PASSWORD_RESET = "PASSWORD_RESET",
  ADMIN_PASSWORD_RESET = "ADMIN_PASSWORD_RESET", // Added
  ADMIN_REVOKED = "ADMIN_REVOKED", // Added
  USER_DELETED = 'USER_DELETED',
  ADMIN_DELETED = 'ADMIN_DELETED',
  PROJECT_SUBMITTED = 'PROJECT_SUBMITTED',
  PROJECT_UNMARKED = 'PROJECT_UNMARKED',
  USER_UPDATED = 'USER_UPDATED',  // Add this

  // Security events
  DEVICE_CHANGE = "DEVICE_CHANGE",
  DEVICE_MISMATCH = "DEVICE_MISMATCH",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Client security events
  INSPECT_ELEMENT = "INSPECT_ELEMENT",
  SCREENSHOT_ATTEMPT = "SCREENSHOT_ATTEMPT",
  SCREEN_RECORD_ATTEMPT = "SCREEN_RECORD_ATTEMPT",
  KEYBOARD_SHORTCUT = "KEYBOARD_SHORTCUT",

  // System events
  USER_CREATED = "USER_CREATED",
  ADMIN_CREATED = "ADMIN_CREATED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
}

export interface SecurityLog {
  _id?: string;
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

export interface LogEntry {
  logType: SecurityLogType;
  timestamp: Date;
  details: string;
}

export interface LogFile {
  logs: LogEntry[];
}
