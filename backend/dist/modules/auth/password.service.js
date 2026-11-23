"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const argon2 = __importStar(require("argon2"));
const crypto_1 = __importDefault(require("crypto"));
class PasswordService {
    /**
     * Hashes password using Argon2id with OWASP-recommended parameters:
     * Memory: 64 MB (65536 KiB), Iterations: 3, Parallelism: 1
     */
    static async hashPassword(password) {
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
    static async verifyPassword(hash, plaintext) {
        try {
            return await argon2.verify(hash, plaintext);
        }
        catch {
            return false;
        }
    }
    /**
     * Constant-time SHA-256 hash for single-use tokens (refresh tokens, password reset tokens)
     */
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Generates a cryptographically secure random token (e.g., for password resets or refresh tokens)
     */
    static generateSecureToken(bytes = 32) {
        return crypto_1.default.randomBytes(bytes).toString('hex');
    }
}
exports.PasswordService = PasswordService;
