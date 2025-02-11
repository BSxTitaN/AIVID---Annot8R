// src/services/log.service.ts
import { SecurityLogs } from '../config/mongo.js';
import type { SecurityLog } from '../types/log.types.js';
import { SecurityLogType } from '../types/log.types.js';

export class SecurityLogService {
  // Log security event
  static async logSecurityEvent(
    userId: string,
    logType: SecurityLogType,
    details: {
      userAgent: string;
      ip: string;
      path?: string;
      keyPressed?: string;
      requestCount?: number;
      deviceInfo?: string;
      additionalInfo?: string;
    }
  ): Promise<boolean> {
    try {
      const log: SecurityLog = {
        userId,
        timestamp: new Date(),
        logType,
        details
      };

      await SecurityLogs.insertOne(log);
      return true;
    } catch (error) {
      console.error('Error logging security event:', error);
      return false;
    }
  }

  // Get logs with filtering for admins
  static async getSecurityLogs(filters?: {
    userId?: string;
    logType?: SecurityLogType | SecurityLogType[];  // Update this to accept array
    startDate?: Date;
    endDate?: Date;
    ip?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const query: any = {};
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;
  
      if (filters) {
        if (filters.userId) query.userId = filters.userId;
        if (filters.ip) query["details.ip"] = filters.ip;
        
        // Handle both single logType and array of logTypes
        if (filters.logType) {
          if (Array.isArray(filters.logType)) {
            query.logType = { $in: filters.logType };
          } else {
            query.logType = filters.logType;
          }
        }
        
        if (filters.startDate || filters.endDate) {
          query.timestamp = {};
          if (filters.startDate) query.timestamp.$gte = filters.startDate;
          if (filters.endDate) query.timestamp.$lte = filters.endDate;
        }
      }
  
      const [logs, total] = await Promise.all([
        SecurityLogs.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        SecurityLogs.countDocuments(query)
      ]);
  
      return {
        logs,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      };
    } catch (error) {
      console.error('Error fetching security logs:', error);
      throw error;
    }
  }

  // Get user security summary for admins
  static async getUserSecuritySummary(userId: string) {
    try {
      const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [recentLogs, summary] = await Promise.all([
        SecurityLogs.find({ 
          userId, 
          timestamp: { $gte: lastDay } 
        })
          .sort({ timestamp: -1 })
          .toArray(),
        
        SecurityLogs.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: '$logType',
              count: { $sum: 1 },
              lastOccurrence: { $max: '$timestamp' }
            }
          }
        ]).toArray()
      ]);

      return {
        recentLogs,
        summary,
        totalEvents: summary.reduce((acc, curr) => acc + curr.count, 0)
      };
    } catch (error) {
      console.error('Error getting user security summary:', error);
      throw error;
    }
  }

  // Get overall security statistics for admins
  static async getSecurityStats(timeframe: number = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - timeframe);

    try {
      const [
        totalEvents,
        userStats,
        eventTypeStats,
        recentEvents
      ] = await Promise.all([
        SecurityLogs.countDocuments({ timestamp: { $gte: cutoffDate } }),
        
        SecurityLogs.aggregate([
          { $match: { timestamp: { $gte: cutoffDate } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).toArray(),
        
        SecurityLogs.aggregate([
          { $match: { timestamp: { $gte: cutoffDate } } },
          { $group: { _id: '$logType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
        
        SecurityLogs.find()
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray()
      ]);

      return {
        timeframe,
        totalEvents,
        topUsers: userStats,
        eventDistribution: eventTypeStats,
        recentEvents
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      throw error;
    }
  }
}