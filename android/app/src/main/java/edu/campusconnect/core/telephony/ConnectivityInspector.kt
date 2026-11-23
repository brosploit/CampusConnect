package edu.campusconnect.core.telephony

import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import edu.campusconnect.core.network.model.NetworkContextDto
import edu.campusconnect.core.security.AppLogger

enum class ActiveTransport {
    WIFI,
    CELLULAR,
    ETHERNET,
    OTHER,
    NONE
}

data class ConnectivityState(
    val transport: ActiveTransport,
    val internetValidated: Boolean,
    val internetCapable: Boolean,
    val networkContext: NetworkContextDto?
)

/**
 * Privacy-compliant connectivity inspector.
 * 1. Checks high-level network capabilities without GPS or location triangulation.
 * 2. Checks TelephonyManager coarse signal/technology only if READ_PHONE_STATE is granted.
 * 3. Permanently avoids querying IMEI, IMSI, or cell tower IDs.
 * 4. Treats unavailable values strictly as null (never zero).
 */
class ConnectivityInspector(
    private val context: Context
) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
    private val telephonyManager =
        context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

    fun inspectCurrentState(): ConnectivityState {
        val activeNetwork = connectivityManager?.activeNetwork
        val caps = connectivityManager?.getNetworkCapabilities(activeNetwork)

        val transport = when {
            caps == null -> ActiveTransport.NONE
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ActiveTransport.WIFI
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ActiveTransport.CELLULAR
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> ActiveTransport.ETHERNET
            else -> ActiveTransport.OTHER
        }

        val internetCapable = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        val internetValidated = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true

        // Capture optional cellular context if permission is present
        val networkContext = captureTelephonyContext(caps, transport)

        return ConnectivityState(
            transport = transport,
            internetValidated = internetValidated,
            internetCapable = internetCapable,
            networkContext = networkContext
        )
    }

    private fun captureTelephonyContext(
        caps: NetworkCapabilities?,
        transport: ActiveTransport
    ): NetworkContextDto? {
        if (telephonyManager == null) return null

        val hasPhonePermission = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED

        // Extract normalized carrier display label (non-identifying)
        val carrierLabel = try {
            telephonyManager.networkOperatorName.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }

        val serviceStateStr = try {
            val state = telephonyManager.serviceState?.state
            when (state) {
                android.telephony.ServiceState.STATE_IN_SERVICE -> "IN_SERVICE"
                android.telephony.ServiceState.STATE_OUT_OF_SERVICE -> "OUT_OF_SERVICE"
                android.telephony.ServiceState.STATE_EMERGENCY_ONLY -> "EMERGENCY_ONLY"
                android.telephony.ServiceState.STATE_POWER_OFF -> "POWER_OFF"
                else -> "UNKNOWN"
            }
        } catch (e: Exception) {
            null
        }

        // Coarse signal dBm where available (API 29+)
        val signalDbm: Int? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasPhonePermission) {
            try {
                val signal = telephonyManager.signalStrength
                signal?.cellSignalStrengths?.firstOrNull()?.dbm
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }

        val radioTech = if (hasPhonePermission) {
            try {
                getRadioTechnologyName(telephonyManager.dataNetworkType)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }

        return NetworkContextDto(
            serviceState = serviceStateStr,
            signalDbm = signalDbm,
            radioTechnology = radioTech,
            carrierLabel = carrierLabel,
            activeTransport = transport.name,
            internetCapability = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
            internetValidated = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
            dataFreshness = "FRESH"
        )
    }

    private fun getRadioTechnologyName(networkType: Int): String {
        return when (networkType) {
            TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
            TelephonyManager.NETWORK_TYPE_NR -> "5G_NR"
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_HSPAP,
            TelephonyManager.NETWORK_TYPE_UMTS -> "3G_HSPA"
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_GPRS -> "2G"
            else -> "UNKNOWN"
        }
    }
}
