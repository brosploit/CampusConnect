package edu.campusconnect.core.network.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("user") val user: UserDto,
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("displayName") val displayName: String?,
    @SerializedName("role") val role: String,
    @SerializedName("mfaEnabled") val mfaEnabled: Boolean
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class RefreshTokenResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String
)

data class ReadingSubmissionRequest(
    @SerializedName("readingId") val readingId: String,
    @SerializedName("zoneId") val zoneId: String,
    @SerializedName("networkType") val networkType: String,
    @SerializedName("downloadMbps") val downloadMbps: Double?,
    @SerializedName("latencyMs") val latencyMs: Long?,
    @SerializedName("measurementSource") val measurementSource: String = "APP_TEST",
    @SerializedName("clientMeasuredAt") val clientMeasuredAt: String,
    @SerializedName("appVersion") val appVersion: String? = "1.0.0",
    @SerializedName("platformVersion") val platformVersion: String? = "Android",
    @SerializedName("networkContext") val networkContext: NetworkContextDto? = null
)

data class NetworkContextDto(
    @SerializedName("serviceState") val serviceState: String?,
    @SerializedName("signalDbm") val signalDbm: Int?,
    @SerializedName("radioTechnology") val radioTechnology: String?,
    @SerializedName("carrierLabel") val carrierLabel: String?,
    @SerializedName("activeTransport") val activeTransport: String?,
    @SerializedName("internetCapability") val internetCapability: Boolean?,
    @SerializedName("internetValidated") val internetValidated: Boolean?,
    @SerializedName("dataFreshness") val dataFreshness: String?
)

data class BatchReadingRequest(
    @SerializedName("readings") val readings: List<ReadingSubmissionRequest>
)

data class BatchReadingResponse(
    @SerializedName("accepted") val accepted: List<String>,
    @SerializedName("duplicates") val duplicates: List<String>,
    @SerializedName("rejected") val rejected: List<BatchRejectedItem>
)

data class BatchRejectedItem(
    @SerializedName("readingId") val readingId: String,
    @SerializedName("reason") val reason: String
)

data class ReadingSubmissionResponse(
    @SerializedName("accepted") val accepted: Boolean,
    @SerializedName("readingId") val readingId: String,
    @SerializedName("duplicate") val duplicate: Boolean,
    @SerializedName("receivedAt") val receivedAt: String,
    @SerializedName("validationStatus") val validationStatus: String
)

data class StartMonitoringRequest(
    @SerializedName("zoneId") val zoneId: String,
    @SerializedName("consentVersion") val consentVersion: String,
    @SerializedName("requestedDurationMinutes") val requestedDurationMinutes: Int
)

data class MonitoringSessionResponse(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("zoneId") val zoneId: String,
    @SerializedName("status") val status: String,
    @SerializedName("startedAt") val startedAt: String,
    @SerializedName("expiresAt") val expiresAt: String
)

data class CampusDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("slug") val slug: String,
    @SerializedName("description") val description: String?
)

data class CampusesResponse(
    @SerializedName("campuses") val campuses: List<CampusDto>
)

data class ZoneDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("buildingName") val buildingName: String?,
    @SerializedName("isActive") val isActive: Boolean
)

data class CampusZonesResponse(
    @SerializedName("campusId") val campusId: String,
    @SerializedName("campusName") val campusName: String,
    @SerializedName("zones") val zones: List<ZoneDto>
)

data class ZoneAnalyticsResponse(
    @SerializedName("zoneId") val zoneId: String,
    @SerializedName("zoneName") val zoneName: String,
    @SerializedName("metric") val metric: String,
    @SerializedName("sampleCount") val sampleCount: Int,
    @SerializedName("distinctDevices") val distinctDevices: Int?,
    @SerializedName("median") val median: Double?,
    @SerializedName("status") val status: String,
    @SerializedName("dataQuality") val dataQuality: String
)
