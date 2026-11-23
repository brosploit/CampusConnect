package edu.campusconnect.feature.diagnostics

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import edu.campusconnect.core.database.AppDatabase
import edu.campusconnect.core.database.ReadingEntity
import edu.campusconnect.core.database.SyncStatus
import edu.campusconnect.core.network.ApiClient
import edu.campusconnect.core.network.model.ReadingSubmissionRequest
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.ISecureTokenStorage
import edu.campusconnect.core.telephony.ConnectivityInspector
import edu.campusconnect.core.telephony.DiagnosticProbe
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class DiagnosticUiState(
    val isRunning: Boolean = false,
    val selectedZoneId: String = "22222222-2222-2222-2222-222222222222",
    val selectedZoneName: String = "Central Library",
    val activeTransport: String = "UNKNOWN",
    val internetValidated: Boolean? = null,
    val latencyMs: Long? = null,
    val signalDbm: Int? = null,
    val carrierLabel: String? = null,
    val diagnosticFinding: String = "Ready to run diagnostics",
    val savedOffline: Boolean = false,
    val uploadStatus: String = "IDLE"
)

class DiagnosticViewModel(
    context: Context,
    private val tokenStorage: ISecureTokenStorage
) : ViewModel() {

    private val database = AppDatabase.getInstance(context)
    private val inspector = ConnectivityInspector(context)
    private val probe = DiagnosticProbe()
    private val api = ApiClient.create(tokenStorage)

    private val _uiState = MutableStateFlow(DiagnosticUiState())
    val uiState: StateFlow<DiagnosticUiState> = _uiState.asStateFlow()

    fun selectZone(zoneId: String, zoneName: String) {
        _uiState.value = _uiState.value.copy(
            selectedZoneId = zoneId,
            selectedZoneName = zoneName
        )
    }

    fun runDiagnostics() {
        if (_uiState.value.isRunning) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isRunning = true,
                savedOffline = false,
                uploadStatus = "RUNNING",
                diagnosticFinding = "Observing network transport and reachability..."
            )

            val connState = inspector.inspectCurrentState()
            val probeResult = probe.executeProbe()

            val readingId = UUID.randomUUID().toString()
            val clientMeasuredAt = System.currentTimeMillis()

            // 1. Always persist to local encrypted Room queue FIRST (Offline-first principle)
            val readingEntity = ReadingEntity(
                readingId = readingId,
                zoneId = _uiState.value.selectedZoneId,
                networkType = connState.transport.name,
                downloadMbps = probeResult.downloadSpeedMbps,
                latencyMs = probeResult.latencyMs,
                measurementSource = "APP_TEST",
                clientMeasuredAt = clientMeasuredAt,
                appVersion = "1.0.0",
                platformVersion = "Android",
                serviceState = connState.networkContext?.serviceState,
                signalDbm = connState.networkContext?.signalDbm,
                radioTechnology = connState.networkContext?.radioTechnology,
                carrierLabel = connState.networkContext?.carrierLabel,
                activeTransport = connState.transport.name,
                internetValidated = connState.internetValidated,
                syncStatus = SyncStatus.PENDING
            )

            database.readingDao().insertReading(readingEntity)

            _uiState.value = _uiState.value.copy(
                isRunning = false,
                activeTransport = connState.transport.name,
                internetValidated = connState.internetValidated,
                latencyMs = probeResult.latencyMs,
                signalDbm = connState.networkContext?.signalDbm,
                carrierLabel = connState.networkContext?.carrierLabel,
                diagnosticFinding = probeResult.diagnosticFinding,
                savedOffline = true,
                uploadStatus = "SAVED_OFFLINE"
            )

            // 2. Attempt immediate network synchronization if online
            if (connState.internetValidated && tokenStorage.hasValidSession()) {
                try {
                    val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val request = ReadingSubmissionRequest(
                        readingId = readingId,
                        zoneId = _uiState.value.selectedZoneId,
                        networkType = connState.transport.name,
                        downloadMbps = probeResult.downloadSpeedMbps,
                        latencyMs = probeResult.latencyMs,
                        measurementSource = "APP_TEST",
                        clientMeasuredAt = dateFormat.format(Date(clientMeasuredAt)),
                        appVersion = "1.0.0",
                        platformVersion = "Android",
                        networkContext = connState.networkContext
                    )
                    val response = api.submitReading(request)
                    if (response.isSuccessful) {
                        database.readingDao().updateSyncStatus(readingId, SyncStatus.UPLOADED)
                        _uiState.value = _uiState.value.copy(uploadStatus = "UPLOADED")
                    }
                } catch (e: Exception) {
                    AppLogger.w("Immediate upload failed; kept in pending queue", e)
                }
            }
        }
    }
}
