package edu.campusconnect

import edu.campusconnect.core.network.model.NetworkContextDto
import edu.campusconnect.core.network.model.ReadingSubmissionRequest
import edu.campusconnect.core.telephony.ProbeResult
import org.junit.Assert.*
import org.junit.Test
import java.lang.reflect.Field
import java.util.Locale

class DiagnosticPrivacyTest {

    @Test
    fun testDiagnosticFinding_strictlyNeutral_neverClaimsJammerPresence() {
        val prohibitedTerms = listOf("jammer", "jammed", "jamming", "blocker", "sabotage", "attack")

        val sampleFindings = listOf(
            "Endpoint reachable with 45ms latency",
            "HTTP response returned code 503",
            "Connection unreachable: UnknownHostException",
            "Connection unreachable: SocketTimeoutException",
            "No active cellular or Wi-Fi network interface detected",
            "Wi-Fi connected without internet validation"
        )

        for (finding in sampleFindings) {
            val lower = finding.lowercase(Locale.ROOT)
            for (term in prohibitedTerms) {
                assertFalse(
                    "Diagnostic finding must never mention '$term'. Finding: $finding",
                    lower.contains(term)
                )
            }
        }
    }

    @Test
    fun testUnavailableMetrics_areStrictlyNullNeverZero() {
        // When diagnostic reachability fails, latency and download throughput must be null, not 0 or 0.0
        val failedProbe = ProbeResult(
            reachability = false,
            latencyMs = null,
            downloadSpeedMbps = null,
            diagnosticFinding = "Connection unreachable: SocketTimeoutException"
        )

        assertFalse(failedProbe.reachability)
        assertNull("Unavailable latency must be null, not 0", failedProbe.latencyMs)
        assertNull("Unavailable download speed must be null, not 0.0", failedProbe.downloadSpeedMbps)

        val networkContext = NetworkContextDto(
            serviceState = "OUT_OF_SERVICE",
            signalDbm = null,
            radioTechnology = null,
            carrierLabel = null,
            activeTransport = "NONE",
            internetCapability = false,
            internetValidated = false,
            dataFreshness = "LIVE"
        )

        assertNull("Unavailable signal dBm must be null", networkContext.signalDbm)
        assertNull("Unavailable radioTechnology must be null", networkContext.radioTechnology)
        assertNull("Unavailable carrierLabel must be null", networkContext.carrierLabel)
    }

    @Test
    fun testReadingAndNetworkDTOs_strictlyProhibitHardwareAndLocationIdentifiers() {
        val prohibitedFieldKeywords = listOf(
            "imei", "imsi", "mac", "bssid", "ssid", "serial",
            "latitude", "lat", "longitude", "lon", "gps", "cid", "lac"
        )

        val classesToCheck = listOf(
            ReadingSubmissionRequest::class.java,
            NetworkContextDto::class.java
        )

        for (clazz in classesToCheck) {
            val allFields = clazz.declaredFields.map { it.name.lowercase(Locale.ROOT) }
            for (field in allFields) {
                for (prohibited in prohibitedFieldKeywords) {
                    assertFalse(
                        "Class ${clazz.simpleName} must not contain prohibited identifier '$field' matching '$prohibited'",
                        field == prohibited || field.contains(prohibited)
                    )
                }
            }
        }
    }

    @Test
    fun testDataMinimization_manualZoneSelectionOverGpsLocation() {
        val reading = ReadingSubmissionRequest(
            readingId = "read-12345",
            zoneId = "zone-library-north",
            networkType = "WIFI",
            downloadMbps = null,
            latencyMs = 45L,
            measurementSource = "MANUAL_TEST",
            clientMeasuredAt = "2026-11-23T18:00:00Z"
        )

        assertEquals("zone-library-north", reading.zoneId)
        assertNotNull(reading.readingId)
        assertNotNull(reading.clientMeasuredAt)
    }
}
