package edu.campusconnect.core.monitoring

import android.app.Service
import android.content.Intent
import android.os.IBinder
import edu.campusconnect.core.database.AppDatabase
import edu.campusconnect.core.database.ReadingEntity
import edu.campusconnect.core.database.SyncStatus
import edu.campusconnect.core.network.ApiClient
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.SecureTokenStorage
import edu.campusconnect.core.telephony.ConnectivityInspector
import edu.campusconnect.core.telephony.DiagnosticProbe
import kotlinx.coroutines.*
import java.util.UUID

/**
 * Opt-in, time-limited, user-controlled monitoring foreground service.
 * Enforces:
 * 1. Non-dismissible ongoing notification with visible Stop button.
 * 2. Hard timeout ceiling (max 30 minutes).
 * 3. Immediate callback unregistration upon user stop or timeout.
 * 4. Never restarts automatically after reboot or process death (START_NOT_STICKY).
 */
class MonitoringService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var countdownJob: Job? = null
    private var measurementJob: Job? = null

    private lateinit var tokenStorage: SecureTokenStorage
    private lateinit var database: AppDatabase
    private lateinit var inspector: ConnectivityInspector
    private val diagnosticProbe = DiagnosticProbe()

    private var activeSessionId: String? = null
    private var currentZoneId: String = ""
    private var currentZoneName: String = ""
    private var maxDurationMinutes: Int = 20

    override fun onCreate() {
        super.onCreate()
        tokenStorage = SecureTokenStorage(applicationContext)
        database = AppDatabase.getInstance(applicationContext)
        inspector = ConnectivityInspector(applicationContext)
        MonitoringNotification.createNotificationChannel(applicationContext)
        AppLogger.i("MonitoringService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent.action == MonitoringNotification.ACTION_STOP_MONITORING) {
            AppLogger.i("Stop action received via notification; terminating monitoring session")
            stopMonitoring()
            return START_NOT_STICKY
        }

        activeSessionId = intent.getStringExtra("EXTRA_SESSION_ID")
        currentZoneId = intent.getStringExtra("EXTRA_ZONE_ID") ?: ""
        currentZoneName = intent.getStringExtra("EXTRA_ZONE_NAME") ?: "Campus Zone"
        maxDurationMinutes = intent.getIntExtra("EXTRA_DURATION_MINUTES", 20).coerceIn(1, 30)

        startForeground(
            MonitoringNotification.NOTIFICATION_ID,
            MonitoringNotification.buildNotification(this, currentZoneName, maxDurationMinutes)
        )

        startPeriodicMeasurements()
        startCountdownTimer(maxDurationMinutes)

        return START_NOT_STICKY // Never restart automatically without explicit user action
    }

    private fun startPeriodicMeasurements() {
        measurementJob?.cancel()
        measurementJob = serviceScope.launch {
            while (isActive) {
                try {
                    val connState = inspector.inspectCurrentState()
                    val probeResult = diagnosticProbe.executeProbe()

                    val reading = ReadingEntity(
                        readingId = UUID.randomUUID().toString(),
                        zoneId = currentZoneId,
                        networkType = connState.transport.name,
                        downloadMbps = null,
                        latencyMs = probeResult.latencyMs,
                        measurementSource = "MONITORING_SESSION",
                        clientMeasuredAt = System.currentTimeMillis(),
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

                    database.readingDao().insertReading(reading)
                    AppLogger.d("Monitoring observation recorded in local Room queue: ${reading.readingId}")
                } catch (e: Exception) {
                    AppLogger.w("Monitoring measurement observation failed", e)
                }

                // Sample every 60 seconds during active monitoring session
                delay(60_000L)
            }
        }
    }

    private fun startCountdownTimer(durationMinutes: Int) {
        countdownJob?.cancel()
        countdownJob = serviceScope.launch {
            var remaining = durationMinutes
            while (remaining > 0 && isActive) {
                delay(60_000L)
                remaining--
                val notification = MonitoringNotification.buildNotification(
                    this@MonitoringService,
                    currentZoneName,
                    remaining
                )
                val manager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
                manager.notify(MonitoringNotification.NOTIFICATION_ID, notification)
            }
            AppLogger.i("Monitoring duration expired; auto-stopping service")
            stopMonitoring()
        }
    }

    private fun stopMonitoring() {
        measurementJob?.cancel()
        countdownJob?.cancel()
        serviceScope.cancel()

        // Inform backend if session ID exists
        activeSessionId?.let { id ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val api = ApiClient.create(tokenStorage)
                    api.stopMonitoringSession(id)
                } catch (e: Exception) {
                    AppLogger.w("Could not notify server of session stop", e)
                }
            }
        }

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        measurementJob?.cancel()
        countdownJob?.cancel()
        serviceScope.cancel()
        AppLogger.i("MonitoringService destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
