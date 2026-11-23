package edu.campusconnect.core.network

import edu.campusconnect.core.security.ISecureTokenStorage
import okhttp3.Interceptor
import okhttp3.Response
import java.util.UUID

/**
 * Interceptor that attaches the Bearer access token to authenticated requests
 * and injects a unique X-Request-ID correlation header.
 */
class AuthInterceptor(
    private val tokenStorage: ISecureTokenStorage
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val builder = original.newBuilder()

        // 1. Inject Request Correlation ID
        builder.header("X-Request-ID", UUID.randomUUID().toString())
        builder.header("Accept", "application/json")

        // 2. Attach Authorization header if access token exists and not an auth bypass route
        val path = original.url.encodedPath
        val isAuthEndpoint = path.contains("/auth/login") || path.contains("/auth/register") || path.contains("/auth/refresh")

        if (!isAuthEndpoint) {
            val accessToken = tokenStorage.getAccessToken()
            if (!accessToken.isNullOrBlank()) {
                builder.header("Authorization", "Bearer $accessToken")
            }
        }

        return chain.proceed(builder.build())
    }
}
