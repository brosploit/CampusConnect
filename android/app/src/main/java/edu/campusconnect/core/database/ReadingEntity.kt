package edu.campusconnect.core.database

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

enum class SyncStatus {
    PENDING,
    UPLOADING,
    UPLOADED,
    FAILED_RETRYABLE,
    FAILED_PERMANENT
}

@Entity(
    tableName = "pending_readings",
    indices = [
        Index(value = ["readingId"], unique = true),
        Index(value = ["syncStatus", "clientMeasuredAt"])
    ]
)
data class ReadingEntity(
    @PrimaryKey
    val readingId: String,
    val zoneId: String,
    val networkType: String,
    val downloadMbps: Double?,
    val latencyMs: Long?,
    val measurementSource: String,
    val clientMeasuredAt: Long,
    val appVersion: String?,
    val platformVersion: String?,
    val serviceState: String?,
    val signalDbm: Int?,
    val radioTechnology: String?,
    val carrierLabel: String?,
    val activeTransport: String?,
    val internetValidated: Boolean?,
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val retryCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
