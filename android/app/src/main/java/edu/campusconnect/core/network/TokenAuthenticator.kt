package edu.campusconnect.core.network

import com.google.gson.Gson
import edu.campusconnect.core.network.model.RefreshTokenRequest
import edu.campusconnect.core.network.model.RefreshTokenResponse
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.ISecureTokenStorage
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route

/**
 * OkHttp Authenticator that securely handles HTTP 401 Unauthorized responses.
 * 1. Synchronously attempts refresh token rotation.
 * 2. If refresh succeeds: persists new access/refresh tokens and retries request.
 * 3. If refresh fails (expired or revoked): clears local session and terminates retries.
 * 4. Limits retry count to 1 to prevent infinite authentication loops.
 */
class TokenAuthenticator(
    private val tokenStorage: ISecureTokenStorage,
    private val baseUrl: String,
    private val refreshClient: OkHttpClient = OkHttpClient.Builder().build(),
    private val onSessionExpired: () -> Unit = {}
) : Authenticator {

    private val gson = Gson()
    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite loops if response was already a retry attempt
        if (responseCount(response) >= 2) {
            AppLogger.w("Aborting token refresh: retry limit exceeded")
            return null
        }

        // Do not attempt refresh on the refresh endpoint itself
        if (response.request.url.encodedPath.contains("/auth/refresh")) {
            AppLogger.w("401 on refresh endpoint; revoking local credentials")
            clearAndNotifySessionExpired()
            return null
        }

        synchronized(lock) {
            val currentAccessToken = tokenStorage.getAccessToken()
            val requestHeaderToken = response.request.header("Authorization")?.removePrefix("Bearer ")

            // If token was already updated by another thread, retry request with the new token
            if (currentAccessToken != null && currentAccessToken != requestHeaderToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentAccessToken")
                    .build()
            }

            val refreshToken = tokenStorage.getRefreshToken()
            if (refreshToken.isNullOrBlank()) {
                AppLogger.w("No refresh token available; clearing session")
                clearAndNotifySessionExpired()
                return null
            }

            // Execute synchronous refresh token call
            val newTokens = performRefreshTokenCall(refreshToken)
            return if (newTokens != null) {
                tokenStorage.saveTokens(
                    accessToken = newTokens.accessToken,
                    refreshToken = newTokens.refreshToken,
                    userId = tokenStorage.getUserId() ?: "",
                    role = tokenStorage.getUserRole() ?: "student"
                )
                AppLogger.i("Token successfully refreshed; retrying request")
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${newTokens.accessToken}")
                    .build()
            } else {
                AppLogger.w("Token refresh failed; clearing session")
                clearAndNotifySessionExpired()
                null
            }
        }
    }

    private fun performRefreshTokenCall(refreshToken: String): RefreshTokenResponse? {
        return try {
            val refreshUrl = if (baseUrl.endsWith("/")) "${baseUrl}auth/refresh" else "$baseUrl/auth/refresh"
            val bodyJson = gson.toJson(RefreshTokenRequest(refreshToken))
            val requestBody = bodyJson.toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(refreshUrl)
                .post(requestBody)
                .build()

            val callResponse = refreshClient.newCall(request).execute()
            if (callResponse.isSuccessful) {
                val responseBody = callResponse.body?.string()
                gson.fromJson(responseBody, RefreshTokenResponse::class.java)
            } else {
                AppLogger.w("Refresh token call returned HTTP ${callResponse.code}")
                null
            }
        } catch (e: Exception) {
            AppLogger.e("Exception during refresh token call", e)
            null
        }
    }

    private fun clearAndNotifySessionExpired() {
        tokenStorage.clearSession()
        onSessionExpired()
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
