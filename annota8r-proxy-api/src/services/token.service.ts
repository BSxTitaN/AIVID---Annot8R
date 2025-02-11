// src/services/token.service.ts
import { createHash } from 'crypto'
import { env } from '../config/env.js'

const EXPIRY_TIME = 3600 // 1 hour in seconds

interface TokenData {
  key: string
  timestamp: number
}

export class TokenService {
  private static generateHash(data: string): string {
    return createHash('sha256')
      .update(data + env.AWS_SECRET_ACCESS_KEY) // Using AWS secret as additional entropy
      .digest('hex')
  }

  static generateToken(key: string): string {
    const timestamp = Date.now()
    const data = JSON.stringify({ key, timestamp })
    const hash = this.generateHash(data)
    return Buffer.from(`${data}|${hash}`).toString('base64')
  }

  static verifyToken(token: string): TokenData | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [data, hash] = decoded.split('|')
      if (!data || !hash) return null

      const calculatedHash = this.generateHash(data)
      if (calculatedHash !== hash) return null

      const tokenData: TokenData = JSON.parse(data)
      const now = Date.now()
      
      // Check if token is expired (1 hour)
      if (now - tokenData.timestamp > EXPIRY_TIME * 1000) return null

      return tokenData
    } catch {
      return null
    }
  }
}