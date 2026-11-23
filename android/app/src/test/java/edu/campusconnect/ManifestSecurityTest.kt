package edu.campusconnect

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class ManifestSecurityTest {

    @Test
    fun testManifest_prohibitsBannedPermissions() {
        val manifestFile = File("android/app/src/main/AndroidManifest.xml")
        val content = if (manifestFile.exists()) {
            manifestFile.readText()
        } else {
            File("app/src/main/AndroidManifest.xml").readText()
        }

        // Must NOT request location
        assertFalse(content.contains("android.permission.ACCESS_FINE_LOCATION"))
        assertFalse(content.contains("android.permission.ACCESS_COARSE_LOCATION"))
        assertFalse(content.contains("android.permission.ACCESS_BACKGROUND_LOCATION"))

        // Must NOT request personal PII / communication permissions
        assertFalse(content.contains("android.permission.READ_CONTACTS"))
        assertFalse(content.contains("android.permission.READ_SMS"))
        assertFalse(content.contains("android.permission.RECEIVE_SMS"))
        assertFalse(content.contains("android.permission.READ_CALL_LOG"))
        assertFalse(content.contains("android.permission.RECORD_AUDIO"))
        assertFalse(content.contains("android.permission.CAMERA"))
        assertFalse(content.contains("android.permission.READ_PRIVILEGED_PHONE_STATE"))
    }

    @Test
    fun testManifest_enforcesSecureBackupAndCleartextSettings() {
        val manifestFile = File("android/app/src/main/AndroidManifest.xml")
        val content = if (manifestFile.exists()) {
            manifestFile.readText()
        } else {
            File("app/src/main/AndroidManifest.xml").readText()
        }

        assertTrue("allowBackup must be false", content.contains("android:allowBackup=\"false\""))
        assertTrue("usesCleartextTraffic must be false", content.contains("android:usesCleartextTraffic=\"false\""))
        assertTrue("networkSecurityConfig must be declared", content.contains("android:networkSecurityConfig=\"@xml/network_security_config\""))
    }

    @Test
    fun testManifest_internalComponentsAreNotExported() {
        val manifestFile = File("android/app/src/main/AndroidManifest.xml")
        val content = if (manifestFile.exists()) {
            manifestFile.readText()
        } else {
            File("app/src/main/AndroidManifest.xml").readText()
        }

        // MonitoringService must NOT be exported
        assertTrue(
            content.contains("<service\n            android:name=\".core.monitoring.MonitoringService\"\n            android:exported=\"false\"") ||
            content.contains("android:name=\".core.monitoring.MonitoringService\"") && content.contains("android:exported=\"false\"")
        )
    }

    @Test
    fun testNetworkSecurityConfig_enforcesCleartextProhibitionAndPinning() {
        val configFile = File("android/app/src/main/res/xml/network_security_config.xml")
        val content = if (configFile.exists()) {
            configFile.readText()
        } else {
            File("app/src/main/res/xml/network_security_config.xml").readText()
        }

        assertTrue(content.contains("cleartextTrafficPermitted=\"false\""))
        assertTrue(content.contains("<pin-set"))
        assertTrue(content.contains("api.campusconnect.edu"))
    }
}
