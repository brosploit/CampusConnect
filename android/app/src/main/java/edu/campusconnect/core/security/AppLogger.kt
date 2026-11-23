package edu.campusconnect.core.security

import android.util.Log
import edu.campusconnect.BuildConfig

/**
 * Privacy-preserving, security-hardened logger.
 * 1. Strips all log output in release builds (BuildConfig.DEBUG == false).
 * 2. Automatically redacts authentication tokens, passwords, and sensitive identifiers.
 */
object AppLogger {
    private const val TAG = "CampusConnect"
    private const val REDACTED = "[REDACTED]"

    private val SENSITIVE_PATTERNS = listOf(
        Regex("(?i)bearer\\s+[A-Za-z0-9_\\-\\.]+"),
        Regex("(?i)password[\"']?\\s*[:=]\\s*[\"']?[^\"'\\s]+"),
        Regex("(?i)refreshToken[\"']?\\s*[:=]\\s*[\"']?[^\"'\\s]+"),
        Regex("(?i)accessToken[\"']?\\s*[:=]\\s*[\"']?[^\"'\\s]+"),
        Regex("(?i)secret[\"']?\\s*[:=]\\s*[\"']?[^\"'\\s]+")
    )

    fun d(message: String, tag: String = TAG) {
        if (BuildConfig.DEBUG) {
            Log.d(tag, sanitize(message))
        }
    }

    fun i(message: String, tag: String = TAG) {
        if (BuildConfig.DEBUG) {
            Log.i(tag, sanitize(message))
        }
    }

    fun w(message: String, throwable: Throwable? = null, tag: String = TAG) {
        if (BuildConfig.DEBUG) {
            Log.w(tag, sanitize(message), throwable)
        }
    }

    fun e(message: String, throwable: Throwable? = null, tag: String = TAG) {
        if (BuildConfig.DEBUG) {
            Log.e(tag, sanitize(message), throwable)
        }
    }

    /**
     * Sanitizes a log message by masking sensitive patterns.
     */
    fun sanitize(input: String): String {
        var result = input
        for (pattern in SENSITIVE_PATTERNS) {
            result = pattern.replace(result, REDACTED)
        }
        return result
    }
}
