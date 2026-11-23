package edu.campusconnect.core.network

import edu.campusconnect.BuildConfig
import edu.campusconnect.core.security.ISecureTokenStorage
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Factory for creating the security-hardened Retrofit API client.
 */
object ApiClient {

    fun create(
        tokenStorage: ISecureTokenStorage,
        baseUrl: String = BuildConfig.BASE_URL,
        onSessionExpired: () -> Unit = {}
    ): CampusConnectApi {
        val okHttpClientBuilder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(tokenStorage))
            .authenticator(TokenAuthenticator(tokenStorage, baseUrl, onSessionExpired))

        // Logging: Header-only in debug mode; completely disabled in release builds
        if (BuildConfig.ENABLE_NETWORK_LOGS) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.HEADERS
            }
            okHttpClientBuilder.addInterceptor(loggingInterceptor)
        }

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClientBuilder.build())
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(CampusConnectApi::class.java)
    }
}
