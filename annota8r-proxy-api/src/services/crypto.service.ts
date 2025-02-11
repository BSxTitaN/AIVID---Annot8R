// src/services/crypto.service.ts
import { randomBytes, pbkdf2, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

export class CryptoService {
  private static readonly ITERATIONS = 600000;
  private static readonly KEYLEN = 64;
  private static readonly DIGEST = 'sha512';
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Hash a password with salt
   */
  static async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const usedSalt = salt || randomBytes(32).toString('hex');
    const hash = await pbkdf2Async(
      password,
      usedSalt,
      this.ITERATIONS,
      this.KEYLEN,
      this.DIGEST
    );
    
    return { hash: hash.toString('hex'), salt: usedSalt };
  }

  /**
   * Verify a password against stored hash
   */
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    if (!password || !hash || !salt) {
      return false;
    }

    try {
      const { hash: compareHash } = await this.hashPassword(password, salt);
      const hashBuffer = Buffer.from(hash, 'hex');
      const compareHashBuffer = Buffer.from(compareHash, 'hex');
      
      return timingSafeEqual(hashBuffer, compareHashBuffer);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  static generateToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a verification hash
   */
  static createVerificationHash(data: string): string {
    return randomBytes(32).toString('hex') + Buffer.from(data).toString('hex');
  }

  /**
   * Compare two hashes safely
   */
  static compareHashes(hash1: string, hash2: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(hash1, 'hex'), Buffer.from(hash2, 'hex'));
    } catch {
      return false;
    }
  }
}