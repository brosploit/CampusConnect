export declare class PasswordService {
    /**
     * Hashes password using Argon2id with OWASP-recommended parameters:
     * Memory: 64 MB (65536 KiB), Iterations: 3, Parallelism: 1
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Verifies password against Argon2id hash.
     */
    static verifyPassword(hash: string, plaintext: string): Promise<boolean>;
    /**
     * Constant-time SHA-256 hash for single-use tokens (refresh tokens, password reset tokens)
     */
    static hashToken(token: string): string;
    /**
     * Generates a cryptographically secure random token (e.g., for password resets or refresh tokens)
     */
    static generateSecureToken(bytes?: number): string;
}
