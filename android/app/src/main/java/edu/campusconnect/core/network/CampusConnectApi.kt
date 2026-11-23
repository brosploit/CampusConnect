package edu.campusconnect.core.network

import edu.campusconnect.core.network.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit REST API interface for Campus Connect.
 */
interface CampusConnectApi {

    @POST("auth/register")
    suspend fun register(@Body request: Map<String, Any>): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: Map<String, Any>): Response<AuthResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Map<String, String>>

    @GET("campuses")
    suspend fun getCampuses(): Response<CampusesResponse>

    @GET("campuses/{campusId}/zones")
    suspend fun getCampusZones(
        @Path("campusId") campusId: String,
        @Query("active") activeOnly: Boolean = true
    ): Response<CampusZonesResponse>

    @GET("zones/{zoneId}/analytics")
    suspend fun getZoneAnalytics(
        @Path("zoneId") zoneId: String,
        @Query("metric") metric: String = "download"
    ): Response<ZoneAnalyticsResponse>

    @POST("readings")
    suspend fun submitReading(@Body reading: ReadingSubmissionRequest): Response<ReadingSubmissionResponse>

    @POST("readings/batch")
    suspend fun submitBatch(@Body batch: BatchReadingRequest): Response<BatchReadingResponse>

    @POST("monitoring/sessions")
    suspend fun startMonitoringSession(@Body request: StartMonitoringRequest): Response<MonitoringSessionResponse>

    @POST("monitoring/sessions/{sessionId}/stop")
    suspend fun stopMonitoringSession(@Path("sessionId") sessionId: String): Response<Map<String, Any>>
}
