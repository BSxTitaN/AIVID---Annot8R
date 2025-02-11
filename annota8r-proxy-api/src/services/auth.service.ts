// src/services/auth.service.ts

import { WebUsers, Admins } from "../config/mongo.js";
import { CryptoService } from "./crypto.service.js";
import { DeviceService } from "./device.service.js";
import { ScrapingDetectionService } from "./scraping-detection.service.js";
import { SecurityLogService } from "./log.service.js";
import { SecurityLogType } from "../types/log.types.js";
import { type AuthResponse, UserRole } from "../types/auth.types.js";
import { S3Service } from "./s3.service.js";

export class AuthService {
  static readonly TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Create a new web user
   */
  static async createWebUser(
    username: string,
    password: string,
    isOfficeUser: boolean
  ): Promise<boolean> {
    const existing = await WebUsers.findOne({ username });
    if (existing) return false;
  
    const { hash: passwordHash, salt } = await CryptoService.hashPassword(
      password
    );
  
    await WebUsers.insertOne({
      username,
      passwordHash,
      salt,
      isOfficeUser,  // Add this field
      isLocked: false,
      lastLoginAttempt: new Date(),
      failedLoginAttempts: 0,
      activityLog: [],
      rateLimit: {
        count: 0,
        resetAt: new Date(),
      },
    });
  
    // Create default classes for office users
    // if (isOfficeUser) {
    //   await S3Service.createDefaultOfficeClasses(username);
    // }
  
    return true;
  }

  /**
   * Create an admin with password
   */
  static async createAdmin(
    username: string,
    password: string,
    isSuperAdmin: boolean = false
  ): Promise<boolean> {
    const existing = await Admins.findOne({ username });
    if (existing) return false;

    const { hash: passwordHash, salt } = await CryptoService.hashPassword(
      password
    );

    await Admins.insertOne({
      username,
      passwordHash,
      salt,
      isSuperAdmin,
      createdAt: new Date(),
      isLocked: false,
      failedLoginAttempts: 0,
      lastLoginAttempt: new Date(),
    });

    return true;
  }

  /**
   * Attempt to log in a web user
   */
  static async loginWebUser(
    username: string,
    password: string,
    ip: string,
    userAgent: string,
    deviceInfo: string = ""
  ): Promise<AuthResponse | null> {
    const user = await WebUsers.findOne({ username });
    if (!user) return null;

    // Check if account is locked
    if (user.isLocked) {
      const lockoutEnd = new Date(
        user.lastLoginAttempt.getTime() + this.LOCKOUT_DURATION
      );
      if (new Date() < lockoutEnd) {
        await this.logSecurityEvent(
          username,
          SecurityLogType.LOGIN_ATTEMPT_LOCKED,
          ip,
          userAgent
        );
        return null;
      }
      // Reset lock if lockout period is over
      await WebUsers.updateOne({ username }, { $set: { isLocked: false } });
    }

    // Verify password
    const isValid = await CryptoService.verifyPassword(
      password,
      user.passwordHash,
      user.salt
    );

    if (!isValid) {
      await this.handleFailedLogin(username, ip, userAgent);
      return null;
    }

    // Generate device fingerprint
    const fingerprint = DeviceService.generateFingerprint(
      userAgent,
      "",
      deviceInfo
    );

    // Check if device changed
    const deviceChanged = !!(
      user.activeDevice && user.activeDevice.fingerprint !== fingerprint
    );

    // Generate token and update device information
    const token = CryptoService.generateToken();
    const expiry = new Date(Date.now() + this.TOKEN_EXPIRY);

    await WebUsers.updateOne(
      { username },
      {
        $set: {
          activeDevice: {
            fingerprint,
            userAgent,
            lastSeen: new Date(),
            ip,
            deviceInfo,
          },
          accessToken: token,
          tokenExpiry: expiry,
          lastLoginAttempt: new Date(),
          failedLoginAttempts: 0,
        },
      }
    );

    await this.logSecurityEvent(
      username,
      SecurityLogType.LOGIN_SUCCESS,
      ip,
      userAgent
    );

    return {
      token,
      expiry,
      role: UserRole.USER,
      redirectTo: "/dashboard",
      deviceChanged,
    };
  }

  /**
   * Attempt to log in an admin
   */
  static async loginAdmin(
    username: string,
    password: string,
    ip: string,
    userAgent: string
  ): Promise<AuthResponse | null> {
    const admin = await Admins.findOne({ username });
    if (!admin) return null;

    // Check if account is locked
    if (admin.isLocked) {
      const lockoutEnd = new Date(
        admin.lastLoginAttempt.getTime() + this.LOCKOUT_DURATION
      );
      if (new Date() < lockoutEnd) {
        await SecurityLogService.logSecurityEvent(
          username,
          SecurityLogType.LOGIN_ATTEMPT_LOCKED,
          { userAgent, ip, path: "/auth/login" }
        );
        return null;
      }
      // Reset lock if lockout period is over
      await this.unlockAdmin(username);
    }

    // Verify password
    const isValid = await CryptoService.verifyPassword(
      password,
      admin.passwordHash,
      admin.salt
    );

    if (!isValid) {
      await this.handleFailedAdminLogin(username, ip, userAgent);
      return null;
    }

    // Reset failed attempts on successful login
    const token = CryptoService.generateToken();
    const expiry = new Date(Date.now() + this.TOKEN_EXPIRY);

    await Admins.updateOne(
      { username },
      {
        $set: {
          accessToken: token,
          tokenExpiry: expiry,
          lastLogin: new Date(),
          failedLoginAttempts: 0,
          lastLoginAttempt: new Date(),
        },
      }
    );

    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.ADMIN_LOGIN,
      { userAgent, ip, path: "/auth/login" }
    );

    return {
      token,
      expiry,
      role: UserRole.ADMIN,
      redirectTo: "/admin",
    };
  }

  /**
   * Verify a request token and device signature
   */
  static async verifyRequest(
    token: string,
    ip: string,
    userAgent: string,
    endpoint: string,
    startTime: number
  ): Promise<boolean> {
    const user = await WebUsers.findOne({ accessToken: token });
    if (!user || !user.tokenExpiry) return false;

    // Check token expiry
    if (new Date() > user.tokenExpiry) {
      await this.invalidateTokens(user._id!);
      return false;
    }

    // Only verify device fingerprint for non-bot requests
    if (!DeviceService.isKnownBot(userAgent)) {
      const storedDeviceInfo = user.activeDevice?.deviceInfo || "";
      const currentDeviceInfo = user.activeDevice?.deviceInfo || "";

      // Generate fingerprints without user agent to avoid middleware mismatches
      const fingerprint = DeviceService.generateFingerprint(
        "browser-client", // Use normalized user agent
        "",
        currentDeviceInfo
      );

      const storedFingerprint = DeviceService.generateFingerprint(
        "browser-client", // Use same normalized user agent
        "",
        storedDeviceInfo
      );

      // Check for major device mismatches
      if (fingerprint !== storedFingerprint) {
        try {
          // Parse device info for more granular comparison
          const stored = JSON.parse(storedDeviceInfo);
          const current = JSON.parse(currentDeviceInfo);

          // Only invalidate for significant changes
          const majorMismatch =
            stored.platform !== current.platform ||
            stored.timezone !== current.timezone;

          if (majorMismatch) {
            await this.invalidateTokens(user._id!);
            await this.logSecurityEvent(
              user.username,
              SecurityLogType.DEVICE_MISMATCH,
              ip,
              userAgent,
              `Platform or timezone mismatch. Stored: ${JSON.stringify(
                stored
              )}, Current: ${JSON.stringify(current)}`
            );
            return false;
          }
        } catch (error) {
          console.error("Error comparing device info:", error);
          // Continue if parsing fails - don't invalidate the session
        }
      }
    }

    // Check for suspicious activity
    const { allowed, reason } = await ScrapingDetectionService.handleRequest(
      user,
      ip,
      userAgent,
      endpoint,
      startTime
    );

    if (!allowed) {
      await this.lockAccount(
        user.username,
        reason || "suspicious_activity",
        ip,
        userAgent
      );
      return false;
    }

    // Update last seen timestamp
    await WebUsers.updateOne(
      { _id: user._id },
      {
        $set: {
          "activeDevice.lastSeen": new Date(),
          "activeDevice.ip": ip,
        },
      }
    );

    return true;
  }

  /**
   * Get user info from token
   */
  static async getUserInfo(token: string): Promise<{
    username: string;
    role: UserRole;
    deviceInfo?: any;
    isLocked?: boolean;
    lockReason?: string;
    isOfficeUser?: boolean;
    isSuperAdmin?: boolean;
  } | null> {
    // Check web users first
    const webUser = await WebUsers.findOne({ accessToken: token });
    if (webUser) {
      return {
        username: webUser.username,
        role: UserRole.USER,
        deviceInfo: webUser.activeDevice,
        isLocked: webUser.isLocked,
        lockReason: webUser.lockReason,
        isOfficeUser: webUser.isOfficeUser,
      };
    }

    // Check admins
    const admin = await Admins.findOne({ accessToken: token });
    if (admin) {
      return {
        username: admin.username,
        role: UserRole.ADMIN,
        isLocked: admin.isLocked,
        lockReason: admin.lockReason,
        isSuperAdmin: admin.isSuperAdmin
      };
    }

    return null;
  }

  /**
   * Handle failed login attempt for web users
   */
  private static async handleFailedLogin(
    username: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    const user = await WebUsers.findOne({ username });
    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const shouldLock = failedAttempts >= this.MAX_LOGIN_ATTEMPTS;

    const updates = {
      failedLoginAttempts: failedAttempts,
      lastLoginAttempt: new Date(),
      isLocked: shouldLock,
      ...(shouldLock && { lockReason: "multiple_failed_attempts" }),
    };

    await WebUsers.updateOne({ username }, { $set: updates });

    await this.logSecurityEvent(
      username,
      shouldLock
        ? SecurityLogType.ACCOUNT_LOCKED
        : SecurityLogType.LOGIN_FAILED,
      ip,
      userAgent
    );
  }

  /**
   * Handle failed admin login attempts
   */
  private static async handleFailedAdminLogin(
    username: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    const admin = await Admins.findOne({ username });
    if (!admin) return;

    const failedAttempts = (admin.failedLoginAttempts || 0) + 1;
    const shouldLock = failedAttempts >= this.MAX_LOGIN_ATTEMPTS;

    await Admins.updateOne(
      { username },
      {
        $set: {
          failedLoginAttempts: failedAttempts,
          lastLoginAttempt: new Date(),
          isLocked: shouldLock,
          ...(shouldLock && { lockReason: "multiple_failed_attempts" }),
        },
      }
    );

    await SecurityLogService.logSecurityEvent(
      username,
      shouldLock
        ? SecurityLogType.ACCOUNT_LOCKED
        : SecurityLogType.LOGIN_FAILED,
      { userAgent, ip, path: "/auth/login" }
    );
  }

  /**
   * Lock account and log security event
   */
  private static async lockAccount(
    username: string,
    reason: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    await WebUsers.updateOne(
      { username },
      {
        $set: {
          isLocked: true,
          lockReason: reason,
          lastLoginAttempt: new Date(),
        },
        $unset: {
          accessToken: 1,
          tokenExpiry: 1,
          activeDevice: 1,
        },
      }
    );

    await this.logSecurityEvent(
      username,
      SecurityLogType.ACCOUNT_LOCKED,
      ip,
      userAgent,
      reason
    );
  }

  /**
   * Reset admin password (super admin only)
   */
  static async resetAdminPassword(
    username: string,
    newPassword: string
  ): Promise<boolean> {
    const admin = await Admins.findOne({ username });
    if (!admin) return false;

    const { hash: newHash, salt: newSalt } = await CryptoService.hashPassword(
      newPassword
    );

    const result = await Admins.updateOne(
      { username },
      {
        $set: {
          passwordHash: newHash,
          salt: newSalt,
          isLocked: false,
          failedLoginAttempts: 0,
          lastLoginAttempt: new Date(),
        },
        $unset: {
          lockReason: 1,
          accessToken: 1,
          tokenExpiry: 1,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Unlock admin account
   */
  static async unlockAdmin(username: string): Promise<boolean> {
    const result = await Admins.updateOne(
      { username },
      {
        $set: {
          isLocked: false,
          failedLoginAttempts: 0,
          lastLoginAttempt: new Date(),
        },
        $unset: {
          lockReason: 1,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Revoke admin access (delete admin account)
   */
  static async revokeAdmin(username: string): Promise<boolean> {
    const result = await Admins.deleteOne({ username });
    return result.deletedCount > 0;
  }

  /**
   * Invalidate user tokens
   */
  private static async invalidateTokens(userId: string): Promise<void> {
    await WebUsers.updateOne(
      { _id: userId },
      {
        $unset: {
          accessToken: 1,
          tokenExpiry: 1,
          activeDevice: 1,
        },
      }
    );
  }

  /**
   * Log security event
   */
  private static async logSecurityEvent(
    username: string,
    logType: SecurityLogType,
    ip: string,
    userAgent: string,
    additionalInfo?: string
  ): Promise<void> {
    await SecurityLogService.logSecurityEvent(username, logType, {
      userAgent,
      ip,
      additionalInfo,
    });
  }

  /**
   * Refresh user token
   */
  static async refreshToken(token: string): Promise<{
    token: string;
    expiry: Date;
  } | null> {
    // Check web users first
    const webUser = await WebUsers.findOne({ accessToken: token });
    if (webUser) {
      const newToken = CryptoService.generateToken();
      const expiry = new Date(Date.now() + this.TOKEN_EXPIRY);

      await WebUsers.updateOne(
        { _id: webUser._id },
        { $set: { accessToken: newToken, tokenExpiry: expiry } }
      );

      return { token: newToken, expiry };
    }

    // Check admins
    const admin = await Admins.findOne({ accessToken: token });
    if (admin) {
      const newToken = CryptoService.generateToken();
      const expiry = new Date(Date.now() + this.TOKEN_EXPIRY);

      await Admins.updateOne(
        { _id: admin._id },
        { $set: { accessToken: newToken, tokenExpiry: expiry } }
      );

      return { token: newToken, expiry };
    }

    return null;
  }

  /**
   * Log out user or admin
   */
  static async logout(token: string): Promise<boolean> {
    const webUser = await WebUsers.findOne({ accessToken: token });
    if (webUser) {
      const result = await WebUsers.updateOne(
        { _id: webUser._id },
        {
          $unset: {
            accessToken: 1,
            tokenExpiry: 1,
            activeDevice: 1,
          },
        }
      );
      return result.modifiedCount > 0;
    }

    const admin = await Admins.findOne({ accessToken: token });
    if (admin) {
      const result = await Admins.updateOne(
        { _id: admin._id },
        {
          $unset: {
            accessToken: 1,
            tokenExpiry: 1,
          },
        }
      );
      return result.modifiedCount > 0;
    }

    return false;
  }

  /**
   * Reset password for web user
   */
  static async resetPassword(
    username: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await WebUsers.findOne({ username });
    if (!user) return false;

    // Verify old password
    const isValid = await CryptoService.verifyPassword(
      oldPassword,
      user.passwordHash,
      user.salt
    );

    if (!isValid) return false;

    // Generate new password hash
    const { hash: newHash, salt: newSalt } = await CryptoService.hashPassword(
      newPassword
    );

    const result = await WebUsers.updateOne(
      { username },
      {
        $set: {
          passwordHash: newHash,
          salt: newSalt,
        },
        $unset: {
          accessToken: 1,
          tokenExpiry: 1,
          activeDevice: 1,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Lock a user account
   */
  static async lockUser(username: string, reason?: string): Promise<boolean> {
    try {
      const result = await WebUsers.updateOne(
        { username },
        {
          $set: {
            isLocked: true,
            lockReason: reason || "manual_lock",
            lastLoginAttempt: new Date(),
          },
          $unset: {
            accessToken: 1,
            tokenExpiry: 1,
            activeDevice: 1,
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error locking user:", error);
      return false;
    }
  }

  /**
   * Unlock a user account
   */
  static async unlockUser(username: string): Promise<boolean> {
    try {
      const result = await WebUsers.updateOne(
        { username },
        {
          $set: {
            isLocked: false,
            failedLoginAttempts: 0,
            lastLoginAttempt: new Date(),
          },
          $unset: {
            lockReason: 1,
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error unlocking user:", error);
      return false;
    }
  }

  /**
   * Force logout a specific user
   */
  static async forceLogoutUser(username: string): Promise<boolean> {
    try {
      const result = await WebUsers.updateOne(
        { username },
        {
          $unset: {
            accessToken: 1,
            tokenExpiry: 1,
            activeDevice: 1,
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error force logging out user:", error);
      return false;
    }
  }

  /**
   * Reset user password (admin version - no old password required)
   */
  static async resetUserPasswordAdmin(
    username: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const user = await WebUsers.findOne({ username });
      if (!user) return false;

      const { hash: newHash, salt: newSalt } = await CryptoService.hashPassword(
        newPassword
      );

      const result = await WebUsers.updateOne(
        { username },
        {
          $set: {
            passwordHash: newHash,
            salt: newSalt,
          },
          $unset: {
            accessToken: 1,
            tokenExpiry: 1,
            activeDevice: 1,
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error resetting user password:", error);
      return false;
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(username: string): Promise<boolean> {
    try {
      // Delete from MongoDB
      const result = await WebUsers.deleteOne({ username });
      
      if (result.deletedCount === 0) {
        return false;
      }
  
      // // Delete from S3 (all user data)
      // await S3Service.deleteUserData(username);
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Delete Admin
   */
  static async deleteAdmin(username: string, requestingAdminUsername: string): Promise<boolean> {
    try {
      // Check if attempting to delete super admin
      const targetAdmin = await Admins.findOne({ username });
      if (targetAdmin?.isSuperAdmin) {
        return false; // Cannot delete super admin
      }
  
      // Check if attempting self-deletion
      if (username === requestingAdminUsername) {
        return false; // Cannot delete self
      }
  
      const result = await Admins.deleteOne({ username });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting admin:', error);
      return false;
    }
  }
}
