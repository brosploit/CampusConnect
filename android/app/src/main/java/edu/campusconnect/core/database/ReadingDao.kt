package edu.campusconnect.core.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ReadingDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReading(reading: ReadingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReadings(readings: List<ReadingEntity>)

    @Query("SELECT * FROM pending_readings WHERE readingId = :readingId")
    suspend fun getReadingById(readingId: String): ReadingEntity?

    @Query("SELECT * FROM pending_readings WHERE syncStatus IN ('PENDING', 'FAILED_RETRYABLE') ORDER BY clientMeasuredAt ASC LIMIT :limit")
    suspend fun getPendingReadings(limit: Int = 50): List<ReadingEntity>

    @Query("UPDATE pending_readings SET syncStatus = :status WHERE readingId = :readingId")
    suspend fun updateSyncStatus(readingId: String, status: SyncStatus)

    @Query("UPDATE pending_readings SET syncStatus = :status WHERE readingId IN (:readingIds)")
    suspend fun updateBatchSyncStatus(readingIds: List<String>, status: SyncStatus)

    @Query("SELECT * FROM pending_readings ORDER BY clientMeasuredAt DESC")
    fun getAllReadingsFlow(): Flow<List<ReadingEntity>>

    @Query("DELETE FROM pending_readings WHERE syncStatus = 'UPLOADED' AND createdAt < :cutoffEpochMs")
    suspend fun pruneOldUploadedReadings(cutoffEpochMs: Long)

    @Query("DELETE FROM pending_readings WHERE readingId = :readingId")
    suspend fun deleteReading(readingId: String)
}
