package edu.campusconnect

import edu.campusconnect.core.security.AppLogger
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class SensitiveDataLeakageTest {

    @Test
    fun testLogger_redactsBearerTokens() {
        val raw = "Executing request with header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDN context"
        val sanitized = AppLogger.sanitize(raw)
        assertFalse(sanitized.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"))
        assertTrue(sanitized.contains("[REDACTED]"))
    }

    @Test
    fun testLogger_redactsPasswords() {
        val raw = "Authentication payload: password=SuperSecretPassword123! and user=student"
        val sanitized = AppLogger.sanitize(raw)
        assertFalse(sanitized.contains("SuperSecretPassword123!"))
        assertTrue(sanitized.contains("[REDACTED]"))
    }

    @Test
    fun testLogger_redactsRefreshTokens() {
        val raw = "{\"refreshToken\":\"4a7f29e18b0c41d683a9e701db54c82e\"}"
        val sanitized = AppLogger.sanitize(raw)
        assertFalse(sanitized.contains("4a7f29e18b0c41d683a9e701db54c82e"))
        assertTrue(sanitized.contains("[REDACTED]"))
    }
}
