package edu.campusconnect.feature.monitoring

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import edu.campusconnect.core.monitoring.MonitoringNotification
import edu.campusconnect.core.monitoring.MonitoringService
import edu.campusconnect.core.network.ApiClient
import edu.campusconnect.core.network.model.StartMonitoringRequest
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.ISecureTokenStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class MonitoringUiState(
    val isMonitoringActive: Boolean = false,
    val selectedZoneId: String = "22222222-2222-2222-2222-222222222222",
    val selectedZoneName: String = "Central Library",
    val selectedDurationMinutes: Int = 20,
    val consentNoticeVersion: String = "monitoring-consent-v1.0",
    val activeSessionId: String? = null,
    val errorMessage: String? = null
)

class MonitoringViewModel(
    private val context: Context,
    private val tokenStorage: ISecureTokenStorage
) : ViewModel() {

    private val api = ApiClient.create(tokenStorage)
    private val _uiState = MutableStateFlow(MonitoringUiState())
    val uiState: StateFlow<MonitoringUiState> = _uiState.asStateFlow()

    fun updateDuration(minutes: Int) {
        _uiState.value = _uiState.value.copy(
            selectedDurationMinutes = minutes.coerceIn(5, 30)
        )
    }

    fun startMonitoring() {
        if (_uiState.value.isMonitoringActive) return

        viewModelScope.launch {
            try {
                var sessionId: String? = null
                if (tokenStorage.hasValidSession()) {
                    val response = api.startMonitoringSession(
                        StartMonitoringRequest(
                            zoneId = _uiState.value.selectedZoneId,
                            consentVersion = _uiState.value.consentNoticeVersion,
                            requestedDurationMinutes = _uiState.value.selectedDurationMinutes
                        )
                    )
                    if (response.isSuccessful && response.body() != null) {
                        sessionId = response.body()!!.sessionId
                    }
                }

                _uiState.value = _uiState.value.copy(
                    isMonitoringActive = true,
                    activeSessionId = sessionId,
                    errorMessage = null
                )

                // Start visible Foreground Service
                val intent = Intent(context, MonitoringService::class.java).apply {
                    putExtra("EXTRA_SESSION_ID", sessionId)
                    putExtra("EXTRA_ZONE_ID", _uiState.value.selectedZoneId)
                    putExtra("EXTRA_ZONE_NAME", _uiState.value.selectedZoneName)
                    putExtra("EXTRA_DURATION_MINUTES", _uiState.value.selectedDurationMinutes)
                }
                context.startService(intent)
            } catch (e: Exception) {
                AppLogger.e("Failed to start monitoring session", e)
                _uiState.value = _uiState.value.copy(errorMessage = "Could not start monitoring: ${e.message}")
            }
        }
    }

    fun stopMonitoring() {
        viewModelScope.launch {
            val intent = Intent(context, MonitoringService::class.java).apply {
                action = MonitoringNotification.ACTION_STOP_MONITORING
            }
            context.startService(intent)

            _uiState.value = _uiState.value.copy(
                isMonitoringActive = false,
                activeSessionId = null
            )
        }
    }
}
