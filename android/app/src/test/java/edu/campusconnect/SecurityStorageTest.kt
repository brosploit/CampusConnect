package edu.campusconnect

import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.ISecureTokenStorage
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class FakeSecureTokenStorage : ISecureTokenStorage {
    private var accessToken: String? = null
    private var refreshToken: String? = null
    private var userId: String? = null
    private var userRole: String? = null

    override fun saveTokens(accessToken: String, refreshToken: String, userId: String, role: String) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.userId = userId
        this.userRole = role
    }

    override fun getAccessToken(): String? = accessToken
    override fun getRefreshToken(): String? = refreshToken
    override fun getUserId(): String? = userId
    override fun getUserRole(): String? = userRole
    override fun hasValidSession(): Boolean = !accessToken.isNullOrBlank()
    override fun clearSession() {
        accessToken = null
        refreshToken = null
        userId = null
        userRole = null
    }
}

class SecurityStorageTest {

    private lateinit var tokenStorage: ISecureTokenStorage

    @Before
    fun setUp() {
        tokenStorage = FakeSecureTokenStorage()
    }

    @Test
    fun testTokenStorage_savesAndRetrievesTokensCorrectly() {
        tokenStorage.saveTokens(
            accessToken = "sample.access.token",
            refreshToken = "sample.refresh.token",
            userId = "user-1234",
            role = "student"
        )

        assertTrue(tokenStorage.hasValidSession())
        assertEquals("sample.access.token", tokenStorage.getAccessToken())
        assertEquals("sample.refresh.token", tokenStorage.getRefreshToken())
        assertEquals("user-1234", tokenStorage.getUserId())
        assertEquals("student", tokenStorage.getUserRole())
    }

    @Test
    fun testTokenStorage_clearSession_wipesAllTokensCompletely() {
        tokenStorage.saveTokens("tokenA", "tokenR", "user1", "student")
        assertTrue(tokenStorage.hasValidSession())

        tokenStorage.clearSession()

        assertFalse(tokenStorage.hasValidSession())
        assertNull(tokenStorage.getAccessToken())
        assertNull(tokenStorage.getRefreshToken())
        assertNull(tokenStorage.getUserId())
        assertNull(tokenStorage.getUserRole())
    }
}
