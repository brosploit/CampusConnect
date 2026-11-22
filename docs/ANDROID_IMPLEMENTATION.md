# Android Implementation — Campus Connect

## Stack
Kotlin, Jetpack Compose, MVVM, Room, Coroutines/Flow, Retrofit/OkHttp, WorkManager, Android Telephony APIs, ConnectivityManager, Hilt (recommended).

## Suggested modules
```text
android/
  app/
  core/{common,database,network,permissions,designsystem}/
  feature/{dashboard,diagnostics,campusmap,history,monitoring,reports,settings}/
  data/{local,remote,repository}/
  domain/{model,usecase,validation}/
  workers/
```

## Screens
Welcome/privacy, sign-in if needed, dashboard, zone selector, diagnostic progress, result, history, monitoring session, issue report, settings/privacy.

## Manual diagnostic
- Select zone.
- Create diagnostic and unique measurement ID.
- Read permitted service/signal information.
- Inspect network transport and capabilities.
- Distinguish Wi-Fi from cellular.
- Check internet reachability with an HTTPS endpoint.
- Measure latency only when endpoint is reachable.
- Run throughput test only when valid and appropriate.
- Save locally before upload.
- Explain unavailable values.

Cellular registration does not guarantee internet access. Wi-Fi availability does not prove mobile service is available. Keep these measurements separate.

## Android API considerations
Use ConnectivityManager, NetworkCallback, and NetworkCapabilities for network state. Use TelephonyManager and modern TelephonyCallback APIs where supported. Cellular values may be stale, null, or unavailable depending on device, subscription, carrier, OS, and permission. Record freshness when possible.

Handle no SIM, dual SIM, unsupported telephony, permission denial, airplane mode, Wi-Fi-only, no default network, captive portal, null/stale readings, and callback failures.

## Permissions
Start with `INTERNET`, `ACCESS_NETWORK_STATE`, and `READ_PHONE_STATE` only where required. Some cellular APIs require location-related permission depending on the API and Android version. Verify exact requirements before implementation. Do not request background location, SMS, contacts, call logs, phone numbers, IMEI/IMSI, or advertising ID for the MVP. Manual zone selection avoids GPS.

## Example model
```kotlin
data class DiagnosticResult(
    val measurementId: String,
    val zoneId: String,
    val serviceState: String?,
    val signalDbm: Int?,
    val networkType: String?,
    val carrierLabel: String?,
    val activeTransport: String?,
    val internetReachable: Boolean?,
    val latencyMs: Long?,
    val downloadSpeedMbps: Double?,
    val measuredAtEpochMs: Long,
    val dataFreshness: String?,
    val uploadStatus: String
)
```
Null means unavailable/not measured, never zero.

## Offline queue
Use Room states such as PENDING, UPLOADING, UPLOADED, FAILED_RETRYABLE, FAILED_PERMANENT. Upload with WorkManager under network constraints, bounded exponential backoff, and stable measurement IDs. Keep records until server acknowledgement subject to retention rules.

## Monitoring lifecycle
Off by default. Explain collection and duration. Require explicit start. Show active state and stop action. Set maximum duration. Stop on expiry/user action. No continuous GPS. Explain battery/data use. Upload later.

## UI states
Permission explanation/denial, no SIM, no service, cellular but no internet, Wi-Fi, testing, saved offline, upload pending/failure, insufficient sample size.
