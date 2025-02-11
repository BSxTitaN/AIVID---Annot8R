// src/services/device.service.ts
import { createHash } from "crypto";

export class DeviceService {
  static generateFingerprint(userAgent: string, _ip: string, additionalData: string = ''): string {
    // Normalize user agent - ignore it for fingerprinting to avoid middleware/client mismatches
    const normalizedUserAgent = 'browser-client';
    
    // Parse additional device data if available
    let deviceData = '';
    try {
      if (additionalData) {
        const parsed = typeof additionalData === 'string' 
          ? JSON.parse(additionalData)
          : additionalData;

        // Only use stable characteristics
        deviceData = [
          parsed.platform,           // OS/Platform
          parsed.screenResolution,   // Screen resolution
          parsed.language,           // Language setting
          parsed.timezone           // Timezone
        ].filter(Boolean).join('|');
      }
    } catch {
      // If parsing fails, just use empty string
      deviceData = '';
    }

    console.log('Generating fingerprint with:', {
      userAgent: normalizedUserAgent,
      deviceData: deviceData
    });

    // Generate fingerprint using only device data and normalized user agent
    // This makes it more resilient to middleware/client differences
    return createHash('sha256')
      .update(`${deviceData}`)  // Remove userAgent from fingerprint
      .digest('hex');
  }

  static isKnownBot(userAgent: string): boolean {
    if (!userAgent) return false;
    
    const botPatterns = [
      'bot', 'crawler', 'spider', 'headless', 'puppet', 'selenium',
      'chrome-lighthouse', 'googlebot', 'bingbot', 'apache-httpclient',
      'next.js'  // Add Next.js to known patterns
    ];
    return botPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );
  }

  static normalizeDeviceInfo(deviceInfo: any): string {
    if (!deviceInfo) return '';

    try {
      const data = typeof deviceInfo === 'string' 
        ? JSON.parse(deviceInfo)
        : deviceInfo;

      return JSON.stringify({
        platform: data.platform || 'unknown',
        screenResolution: data.screenResolution || 'unknown',
        language: data.language || 'unknown',
        timezone: data.timezone || 'UTC'
      });
    } catch {
      return '';
    }
  }
}