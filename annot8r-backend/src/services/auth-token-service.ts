// src/services/auth-token-service.ts
import { ObjectId, type Filter } from "mongodb";
import type { User, AuthToken } from "../types/index.js";
import { generateUserToken } from "../utils/jwt.js";
import { BaseService } from "./base-service.js";
import { JWT_EXPIRY } from "../config/index.js";

export class AuthTokenService extends BaseService<AuthToken> {
  constructor() {
    super('auth_tokens');
  }
  
  /**
   * Create authentication token
   */
  async createToken(
    user: User,
    secret: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const token = generateUserToken(user, secret);
    
    await this.create({
      userId: user._id,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + JWT_EXPIRY),
      lastUsedAt: new Date(),
      ipAddress,
      userAgent,
      isRevoked: false
    });
    
    return token;
  }
  
  /**
   * Find token by value
   */
  async findToken(token: string): Promise<AuthToken | null> {
    return this.findOne({ token, isRevoked: false } as Filter<AuthToken>);
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { token } as Filter<AuthToken>,
      { $set: { isRevoked: true } }
    );
    
    return result.modifiedCount > 0;
  }
  
  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.collection().updateMany(
      { userId: new ObjectId(userId), isRevoked: false } as Filter<AuthToken>,
      { $set: { isRevoked: true } }
    );
  }
  
  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.collection().deleteMany({
      expiresAt: { $lt: new Date() }
    } as Filter<AuthToken>);
    
    return result.deletedCount;
  }
}