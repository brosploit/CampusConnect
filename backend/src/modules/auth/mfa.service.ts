import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Standard RFC 6238 TOTP (Time-Based One-Time Password) implementation
 * Zero external dependency; uses Node.js crypto with constant-time verification.
 */
export class MfaService {
  private static BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * Field-level encryption for TOTP secrets stored in database (AES-256-GCM)
   */
  static encryptSecret(secret: string): string {
    const key = crypto.createHash('sha256').update(env.COOKIE_SECRET).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  /**
   * Field-level decryption for TOTP secrets stored in database
   */
  static decryptSecret(stored: string): string {
    if (!stored || !stored.startsWith('enc:')) {
      return stored; // fallback for unencrypted seeds
    }
    const [, ivHex, tagHex, cipherHex] = stored.split(':');
    const key = crypto.createHash('sha256').update(env.COOKIE_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Generates a random base32 encoded TOTP secret (160 bits / 20 bytes = 32 base32 chars)
   */
  static generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    let secret = '';
    for (let i = 0; i < buffer.length; i++) {
      secret += this.BASE32_CHARS[buffer[i] % 32];
    }
    return secret;
  }

  /**
   * Generates TOTP code for a given timestamp step (30s window, 6 digits)
   */
  static generateTOTP(secret: string, timeStep = Math.floor(Date.now() / 1000 / 30)): string {
    const key = this.base32Decode(secret);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Validates user-provided OTP code against secret with +/- 1 time step tolerance (prevents clock skew)
   */
  static verifyTOTP(secret: string, token: string): boolean {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return false;
    }

    const currentStep = Math.floor(Date.now() / 1000 / 30);
    for (let step = currentStep - 1; step <= currentStep + 1; step++) {
      const generated = this.generateTOTP(secret, step);
      if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(token))) {
        return true;
      }
    }
    return false;
  }

  private static base32Decode(base32: string): Buffer {
    const cleaned = base32.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = this.BASE32_CHARS.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  }
}
