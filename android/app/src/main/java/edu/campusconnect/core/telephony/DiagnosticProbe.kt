package edu.campusconnect.core.telephony

import edu.campusconnect.core.security.AppLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

data class ProbeResult(
    val reachability: Boolean,
    val latencyMs: Long?,
    val downloadSpeedMbps: Double?,
    val diagnosticFinding: String
)

/**
 * Diagnostic probe executor.
 * Targets a lightweight, static HTTPS diagnostic probe endpoint.
 * Discloses neutral findings; strictly avoids claiming or inferring jammer presence.
 */
class DiagnosticProbe(
    private val probeUrl: String = "https://api.campusconnect.edu/health"
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    suspend fun executeProbe(): ProbeResult = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        try {
            val request = Request.Builder()
                .url(probeUrl)
                .head() // Minimal HEAD request to test round-trip latency
                .build()

            val response = client.newCall(request).execute()
            val latency = System.currentTimeMillis() - start

            if (response.isSuccessful) {
                ProbeResult(
                    reachability = true,
                    latencyMs = latency,
                    downloadSpeedMbps = null, // Set only when throughput test is run
                    diagnosticFinding = "Endpoint reachable with ${latency}ms latency"
                )
            } else {
                ProbeResult(
                    reachability = false,
                    latencyMs = null,
                    downloadSpeedMbps = null,
                    diagnosticFinding = "HTTP response returned code ${response.code}"
                )
            }
        } catch (e: Exception) {
            AppLogger.w("Probe connection failed: ${e.message}")
            ProbeResult(
                reachability = false,
                latencyMs = null,
                downloadSpeedMbps = null,
                diagnosticFinding = "Connection unreachable: ${e.javaClass.simpleName}"
            )
        }
    }
}
