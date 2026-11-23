import * as argon2 from 'argon2';
import crypto from 'crypto';

export class PasswordService {
  /**
   * Hashes password using Argon2id with OWASP-recommended parameters:
   * Memory: 64 MB (65536 KiB), Iterations: 3, Parallelism: 1
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies password against Argon2id hash.
   */
  static async verifyPassword(hash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }

  /**
   * Constant-time SHA-256 hash for single-use tokens (refresh tokens, password reset tokens)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random token (e.g., for password resets or refresh tokens)
   */
  static generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
