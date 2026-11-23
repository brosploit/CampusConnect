package edu.campusconnect

import edu.campusconnect.core.network.AuthInterceptor
import edu.campusconnect.core.security.ISecureTokenStorage
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

class AuthInterceptorTest {

    private lateinit var tokenStorage: FakeSecureTokenStorage
    private lateinit var interceptor: AuthInterceptor

    @Before
    fun setUp() {
        tokenStorage = FakeSecureTokenStorage()
        interceptor = AuthInterceptor(tokenStorage)
    }

    @Test
    fun testAuthInterceptor_injectsBearerTokenAndRequestId() {
        tokenStorage.saveTokens("valid.jwt.token", "refresh.token", "u1", "student")

        var interceptedRequest: Request? = null
        val chain = object : Interceptor.Chain {
            override fun request(): Request = Request.Builder().url("https://api.campusconnect.edu/readings").build()
            override fun proceed(request: Request): Response {
                interceptedRequest = request
                return Response.Builder()
                    .request(request)
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body("{}".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            override fun connection() = null
            override fun call() = throw NotImplementedError()
            override fun connectTimeoutMillis() = 1000
            override fun readTimeoutMillis() = 1000
            override fun writeTimeoutMillis() = 1000
            override fun withConnectTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
            override fun withReadTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
            override fun withWriteTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
        }

        interceptor.intercept(chain)

        assertNotNull(interceptedRequest)
        assertEquals("Bearer valid.jwt.token", interceptedRequest?.header("Authorization"))
        assertNotNull(interceptedRequest?.header("X-Request-ID"))
    }

    @Test
    fun testAuthInterceptor_doesNotAttachTokenToLoginEndpoint() {
        tokenStorage.saveTokens("token", "refresh", "u1", "student")

        var interceptedRequest: Request? = null
        val chain = object : Interceptor.Chain {
            override fun request(): Request = Request.Builder().url("https://api.campusconnect.edu/auth/login").build()
            override fun proceed(request: Request): Response {
                interceptedRequest = request
                return Response.Builder()
                    .request(request)
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body("{}".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            override fun connection() = null
            override fun call() = throw NotImplementedError()
            override fun connectTimeoutMillis() = 1000
            override fun readTimeoutMillis() = 1000
            override fun writeTimeoutMillis() = 1000
            override fun withConnectTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
            override fun withReadTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
            override fun withWriteTimeout(timeout: Int, unit: java.util.concurrent.TimeUnit) = this
        }

        interceptor.intercept(chain)

        assertNull(interceptedRequest?.header("Authorization"))
        assertNotNull(interceptedRequest?.header("X-Request-ID"))
    }
}
