package edu.campusconnect

import edu.campusconnect.core.network.TokenAuthenticator
import edu.campusconnect.core.network.model.RefreshTokenResponse
import com.google.gson.Gson
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.concurrent.atomic.AtomicBoolean

class TokenAuthenticatorTest {

    private lateinit var tokenStorage: FakeSecureTokenStorage
    private val baseUrl = "https://api.campusconnect.edu/"
    private val gson = Gson()

    @Before
    fun setUp() {
        tokenStorage = FakeSecureTokenStorage()
    }

    private fun create401Response(
        url: String = "https://api.campusconnect.edu/readings",
        authHeader: String? = "Bearer expired.access.token",
        priorResponse: Response? = null
    ): Response {
        val requestBuilder = Request.Builder().url(url)
        if (authHeader != null) {
            requestBuilder.header("Authorization", authHeader)
        }
        val request = requestBuilder.build()

        val responseBuilder = Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(401)
            .message("Unauthorized")
            .body("{\"error\":\"TOKEN_EXPIRED\"}".toResponseBody("application/json".toMediaType()))

        if (priorResponse != null) {
            responseBuilder.priorResponse(priorResponse)
        }

        return responseBuilder.build()
    }

    private fun createMockClient(handler: (Request) -> Response): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                handler(chain.request())
            })
            .build()
    }

    @Test
    fun testAuthenticate_whenExpiredToken_callsRefreshAndRetriesWithNewToken() {
        tokenStorage.saveTokens("expired.access.token", "valid.refresh.token", "user-42", "student")
        val sessionExpiredCalled = AtomicBoolean(false)

        val mockClient = createMockClient { req ->
            assertEquals("https://api.campusconnect.edu/auth/refresh", req.url.toString())
            val refreshPayload = gson.toJson(RefreshTokenResponse("new.access.token", "new.rotated.refresh"))
            Response.Builder()
                .request(req)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body(refreshPayload.toResponseBody("application/json".toMediaType()))
                .build()
        }

        val authenticator = TokenAuthenticator(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl,
            refreshClient = mockClient,
            onSessionExpired = { sessionExpiredCalled.set(true) }
        )

        val response401 = create401Response()
        val retryRequest = authenticator.authenticate(null, response401)

        assertNotNull(retryRequest)
        assertEquals("Bearer new.access.token", retryRequest?.header("Authorization"))
        assertEquals("new.access.token", tokenStorage.getAccessToken())
        assertEquals("new.rotated.refresh", tokenStorage.getRefreshToken())
        assertFalse("Session expiry callback must not be invoked on successful refresh", sessionExpiredCalled.get())
    }

    @Test
    fun testAuthenticate_whenRefreshFails_clearsSessionAndTerminates() {
        tokenStorage.saveTokens("expired.access.token", "revoked.refresh.token", "user-42", "student")
        val sessionExpiredCalled = AtomicBoolean(false)

        val mockClient = createMockClient { req ->
            Response.Builder()
                .request(req)
                .protocol(Protocol.HTTP_1_1)
                .code(401)
                .message("Unauthorized")
                .body("{\"error\":\"INVALID_REFRESH_TOKEN\"}".toResponseBody("application/json".toMediaType()))
                .build()
        }

        val authenticator = TokenAuthenticator(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl,
            refreshClient = mockClient,
            onSessionExpired = { sessionExpiredCalled.set(true) }
        )

        val response401 = create401Response()
        val retryRequest = authenticator.authenticate(null, response401)

        assertNull("Retry request must be null when refresh fails", retryRequest)
        assertFalse("Token storage must be cleared", tokenStorage.hasValidSession())
        assertNull(tokenStorage.getAccessToken())
        assertNull(tokenStorage.getRefreshToken())
        assertTrue("Session expiry callback must be invoked", sessionExpiredCalled.get())
    }

    @Test
    fun testAuthenticate_whenNoRefreshToken_clearsSessionImmediately() {
        tokenStorage.saveTokens("expired.access.token", "", "user-42", "student")
        val sessionExpiredCalled = AtomicBoolean(false)

        val authenticator = TokenAuthenticator(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl,
            onSessionExpired = { sessionExpiredCalled.set(true) }
        )

        val response401 = create401Response()
        val retryRequest = authenticator.authenticate(null, response401)

        assertNull(retryRequest)
        assertFalse(tokenStorage.hasValidSession())
        assertTrue(sessionExpiredCalled.get())
    }

    @Test
    fun testAuthenticate_whenRetryLimitExceeded_preventsInfiniteLoop() {
        tokenStorage.saveTokens("expired.access.token", "valid.refresh.token", "user-42", "student")

        val firstResponse = create401Response()
        val secondResponse = create401Response(priorResponse = firstResponse)

        val authenticator = TokenAuthenticator(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl
        )

        val retryRequest = authenticator.authenticate(null, secondResponse)
        assertNull("Retry request must be null when retry limit >= 2", retryRequest)
    }

    @Test
    fun testAuthenticate_when401OnRefreshEndpoint_clearsSessionAndReturnsNull() {
        tokenStorage.saveTokens("access", "refresh", "user-42", "student")
        val sessionExpiredCalled = AtomicBoolean(false)

        val authenticator = TokenAuthenticator(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl,
            onSessionExpired = { sessionExpiredCalled.set(true) }
        )

        val responseOnRefresh = create401Response(url = "https://api.campusconnect.edu/auth/refresh")
        val retryRequest = authenticator.authenticate(null, responseOnRefresh)

        assertNull(retryRequest)
        assertFalse(tokenStorage.hasValidSession())
        assertTrue(sessionExpiredCalled.get())
    }
}
