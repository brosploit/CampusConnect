package edu.campusconnect.core.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import edu.campusconnect.core.database.AppDatabase
import edu.campusconnect.core.database.SyncStatus
import edu.campusconnect.core.network.ApiClient
import edu.campusconnect.core.network.model.BatchReadingRequest
import edu.campusconnect.core.network.model.NetworkContextDto
import edu.campusconnect.core.network.model.ReadingSubmissionRequest
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.SecureTokenStorage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * WorkManager worker for uploading offline queued diagnostic readings
 * under network-connected constraints with exponential backoff.
 */
class SyncReadingsWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val database = AppDatabase.getInstance(appContext)
    private val tokenStorage = SecureTokenStorage(appContext)
    private val api = ApiClient.create(tokenStorage)

    override suspend fun doWork(): Result {
        val dao = database.readingDao()
        val pending = dao.getPendingReadings(limit = 50)

        if (pending.isEmpty()) {
            // Prune old uploaded records (>24h old) to protect local storage
            val cutoff = System.currentTimeMillis() - 24 * 60 * 60 * 1000
            dao.pruneOldUploadedReadings(cutoff)
            return Result.success()
        }

        AppLogger.i("SyncReadingsWorker: Found ${pending.size} pending records to synchronize")

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val requestItems = pending.map { entity ->
            val contextDto = if (entity.serviceState != null || entity.signalDbm != null) {
                NetworkContextDto(
                    serviceState = entity.serviceState,
                    signalDbm = entity.signalDbm,
                    radioTechnology = entity.radioTechnology,
                    carrierLabel = entity.carrierLabel,
                    activeTransport = entity.activeTransport,
                    internetCapability = entity.internetValidated,
                    internetValidated = entity.internetValidated,
                    dataFreshness = "CACHED"
                )
            } else null

            ReadingSubmissionRequest(
                readingId = entity.readingId,
                zoneId = entity.zoneId,
                networkType = entity.networkType,
                downloadMbps = entity.downloadMbps,
                latencyMs = entity.latencyMs,
                measurementSource = entity.measurementSource,
                clientMeasuredAt = dateFormat.format(Date(entity.clientMeasuredAt)),
                appVersion = entity.appVersion,
                platformVersion = entity.platformVersion,
                networkContext = contextDto
            )
        }

        return try {
            val response = api.submitBatch(BatchReadingRequest(requestItems))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val uploadedIds = body.accepted + body.duplicates
                dao.updateBatchSyncStatus(uploadedIds, SyncStatus.UPLOADED)

                // Mark permanent failures
                for (rej in body.rejected) {
                    dao.updateSyncStatus(rej.readingId, SyncStatus.FAILED_PERMANENT)
                }

                AppLogger.i("SyncReadingsWorker: Successfully synced ${uploadedIds.size} records")
                Result.success()
            } else {
                AppLogger.w("SyncReadingsWorker: Batch upload failed with HTTP ${response.code()}")
                dao.updateBatchSyncStatus(pending.map { it.readingId }, SyncStatus.FAILED_RETRYABLE)
                Result.retry()
            }
        } catch (e: Exception) {
            AppLogger.e("SyncReadingsWorker: Network exception during batch upload", e)
            dao.updateBatchSyncStatus(pending.map { it.readingId }, SyncStatus.FAILED_RETRYABLE)
            Result.retry()
        }
    }
}
