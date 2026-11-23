/**
 * Standard RFC 6238 TOTP (Time-Based One-Time Password) implementation
 * Zero external dependency; uses Node.js crypto with constant-time verification.
 */
export declare class MfaService {
    private static BASE32_CHARS;
    /**
     * Generates a random base32 encoded TOTP secret (160 bits / 20 bytes = 32 base32 chars)
     */
    static generateSecret(): string;
    /**
     * Generates TOTP code for a given timestamp step (30s window, 6 digits)
     */
    static generateTOTP(secret: string, timeStep?: number): string;
    /**
     * Validates user-provided OTP code against secret with +/- 1 time step tolerance (prevents clock skew)
     */
    static verifyTOTP(secret: string, token: string): boolean;
    private static base32Decode;
}
