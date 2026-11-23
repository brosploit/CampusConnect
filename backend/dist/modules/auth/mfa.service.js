"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaService = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Standard RFC 6238 TOTP (Time-Based One-Time Password) implementation
 * Zero external dependency; uses Node.js crypto with constant-time verification.
 */
class MfaService {
    static BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    /**
     * Generates a random base32 encoded TOTP secret (160 bits / 20 bytes = 32 base32 chars)
     */
    static generateSecret() {
        const buffer = crypto_1.default.randomBytes(20);
        let secret = '';
        for (let i = 0; i < buffer.length; i++) {
            secret += this.BASE32_CHARS[buffer[i] % 32];
        }
        return secret;
    }
    /**
     * Generates TOTP code for a given timestamp step (30s window, 6 digits)
     */
    static generateTOTP(secret, timeStep = Math.floor(Date.now() / 1000 / 30)) {
        const key = this.base32Decode(secret);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(timeStep));
        const hmac = crypto_1.default.createHmac('sha1', key).update(timeBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0xf;
        const binary = ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);
        const otp = binary % 1000000;
        return otp.toString().padStart(6, '0');
    }
    /**
     * Validates user-provided OTP code against secret with +/- 1 time step tolerance (prevents clock skew)
     */
    static verifyTOTP(secret, token) {
        if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
            return false;
        }
        const currentStep = Math.floor(Date.now() / 1000 / 30);
        for (let step = currentStep - 1; step <= currentStep + 1; step++) {
            const generated = this.generateTOTP(secret, step);
            if (crypto_1.default.timingSafeEqual(Buffer.from(generated), Buffer.from(token))) {
                return true;
            }
        }
        return false;
    }
    static base32Decode(base32) {
        const cleaned = base32.toUpperCase().replace(/=+$/, '');
        let bits = 0;
        let value = 0;
        const output = [];
        for (let i = 0; i < cleaned.length; i++) {
            const idx = this.BASE32_CHARS.indexOf(cleaned[i]);
            if (idx === -1)
                continue;
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
exports.MfaService = MfaService;
