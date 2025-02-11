import type { WebUser } from "../types/auth.types.js";

export class ScrapingDetectionService {
    private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    private static readonly RATE_LIMIT_MAX_REQUESTS = 60;  // 60 requests per minute
    private static readonly SUSPICIOUS_PATTERNS = {
      minResponseTime: 50,           // Milliseconds
      maxSequentialRequests: 10,     // Number of requests
      timeWindow: 60 * 1000,         // 1 minute
      suspiciousEndpoints: 5         // Unique endpoints
    };
  
    static isSuspiciousActivity(activities: WebUser['activityLog']): boolean {
      if (activities.length < 2) return false;
  
      // Check for too quick sequential requests
      const recentActivities = activities.filter(
        a => a.timestamp.getTime() > Date.now() - this.SUSPICIOUS_PATTERNS.timeWindow
      );
  
      // Too many requests in time window
      if (recentActivities.length > this.SUSPICIOUS_PATTERNS.maxSequentialRequests) {
        return true;
      }
  
      // Check for suspiciously fast response times
      const hasAbnormalSpeed = recentActivities.some(
        a => a.responseTime < this.SUSPICIOUS_PATTERNS.minResponseTime
      );
      if (hasAbnormalSpeed) return true;
  
      // Check for accessing too many different endpoints quickly
      const uniqueEndpoints = new Set(recentActivities.map(a => a.endpoint));
      if (uniqueEndpoints.size > this.SUSPICIOUS_PATTERNS.suspiciousEndpoints) {
        return true;
      }
  
      return false;
    }
  
    static async handleRequest(
      user: WebUser,
      ip: string,
      userAgent: string,
      endpoint: string,
      startTime: number
    ): Promise<{ allowed: boolean; reason?: string }> {
      // Check rate limit
      const now = Date.now();
      if (user.rateLimit.resetAt.getTime() < now) {
        user.rateLimit = { count: 0, resetAt: new Date(now + this.RATE_LIMIT_WINDOW) };
      }
      
      if (user.rateLimit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, reason: 'rate_limit_exceeded' };
      }
  
      // Log activity
      const responseTime = Date.now() - startTime;
      user.activityLog.push({
        timestamp: new Date(),
        action: 'api_request',
        ip,
        userAgent,
        endpoint,
        responseTime
      });
  
      // Trim activity log to keep last 1000 entries
      user.activityLog = user.activityLog.slice(-1000);
  
      // Check for suspicious activity
      if (this.isSuspiciousActivity(user.activityLog)) {
        return { allowed: false, reason: 'suspicious_activity' };
      }
  
      // Increment rate limit counter
      user.rateLimit.count++;
  
      return { allowed: true };
    }
  }