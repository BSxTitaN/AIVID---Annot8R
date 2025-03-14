// src/utils/password.ts
import { createHash, randomBytes } from "crypto";

/**
 * Password utility functions using SHA-256 with salt
 */
export const password = {
  /**
   * Hash a password
   */
  hash(plainPassword: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256")
      .update(plainPassword + salt)
      .digest("hex");
    return `${salt}:${hash}`;
  },

  /**
   * Verify a password against a hash
   */
  verify(plainPassword: string, hashedPassword: string): boolean {
    const [salt, originalHash] = hashedPassword.split(":");
    const hash = createHash("sha256")
      .update(plainPassword + salt)
      .digest("hex");
    return hash === originalHash;
  }
};