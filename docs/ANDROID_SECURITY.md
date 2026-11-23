# Campus Connect — Android Application Security Architecture & Verification

## 1. Executive Summary & Security Objectives

The Campus Connect Android application is engineered strictly in accordance with **OWASP MASVS (Mobile Application Security Verification Standard) v2.0** and **OWASP MASTG (Mobile Application Security Testing Guide)**. It adheres to privacy-by-design and defense-in-depth principles:
- **Zero Sensitive Credential Leakage:** All tokens and cryptographic keys are hardware-backed via Android Keystore and `EncryptedSharedPreferences`.
- **Zero Cleartext Network Traffic:** Enforced via `network_security_config.xml` with strict TLS certificate validation and SPKI pinsets.
- **Privacy & Data Minimization:** Zero collection of IMEI, IMSI, MAC address, contacts, SMS, call logs, camera, microphone, or precise GPS location.
- **Manual Zone Selection:** Connectivity observations are attributed to user-selected campus zones rather than GPS coordinates.
- **Neutral Diagnostic Reporting:** Unavailable network metrics are strictly `null` (never synthetic zeros). The app strictly avoids speculating or claiming mobile jammer presence.
- **Controlled Foreground Monitoring:** Monitoring is off-by-default, opt-in, visible via an ongoing foreground notification with an explicit Stop button, and enforces a strict 30-minute maximum runtime limit.

---

## 2. OWASP MASVS v2.0 Traceability Matrix

| MASVS ID | Requirement Summary | Implementation in Campus Connect | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **MASVS-STORAGE-1** | System credential store & secure storage | `SecureTokenStorage.kt` uses AndroidX `EncryptedSharedPreferences` backed by `MasterKey` AES-256-GCM. | `SecurityStorageTest.kt` verifies clean token persistence and complete wiping on logout. |
| **MASVS-STORAGE-2** | No sensitive data in device backups | `AndroidManifest.xml` sets `android:allowBackup="false"`, and `backup_rules.xml` & `data_extraction_rules.xml` exclude all shared prefs and encrypted databases. | `ManifestSecurityTest.kt` verifies backup rules and exclusion paths. |
| **MASVS-CRYPTO-1** | Standard cryptographic algorithms | `KeystoreManager.kt` uses `AES/GCM/NoPadding` with 256-bit keys and 128-bit authentication tags generated inside Android Keystore. | `KeystoreManager.kt` hardware Keystore integration. |
| **MASVS-CRYPTO-2** | Hardware-backed key management | Keys generated in AndroidKeyStore with `KeyGenParameterSpec.Builder(PURPOSE_ENCRYPT or PURPOSE_DECRYPT)`. | `KeystoreManager.kt` |
| **MASVS-AUTH-1** | Secure token rotation & expiry | `TokenAuthenticator.kt` intercepts HTTP 401, synchronously rotates refresh token with backend `/auth/refresh`, and prevents infinite loops (max 1 retry). | `TokenAuthenticatorTest.kt` verifies refresh rotation and session clearing on invalid token. |
| **MASVS-NETWORK-1** | Cleartext traffic prohibited | `android:usesCleartextTraffic="false"` and `network_security_config.xml` blocks cleartext for all domains in release. | `ManifestSecurityTest.kt` & `network_security_config.xml`. |
| **MASVS-NETWORK-2** | Platform TLS validation & SPKI pinning | `network_security_config.xml` configures leaf and disaster-recovery backup SPKI pins for `api.campusconnect.edu`. No custom `TrustManager` bypasses. | `ApiClient.kt` & `network_security_config.xml`. |
| **MASVS-PLATFORM-1** | Minimal component exposure | All Activities, Services, and Receivers (except `MainActivity` launcher) are strictly `android:exported="false"`. | `ManifestSecurityTest.kt`. |
| **MASVS-PLATFORM-2** | Least privilege permissions | AndroidManifest requests only `INTERNET`, `ACCESS_NETWORK_STATE`, and optional `READ_PHONE_STATE`. Location, SMS, contacts, and camera are explicitly absent. | `ManifestSecurityTest.kt`. |
| **MASVS-CODE-1** | Production obfuscation & stripping | ProGuard rules in `proguard-rules.pro` strip all `android.util.Log` calls in release builds and enable R8 resource and code shrinking. | `proguard-rules.pro` & `app/build.gradle.kts`. |
| **MASVS-CODE-2** | Sensitive data redaction in memory & logs | `AppLogger.kt` regex-redacts JWT tokens, passwords, and authorization headers from logs. | `SensitiveDataLeakageTest.kt`. |

---

## 3. Cryptography & Key Management Architecture

### Android Keystore & MasterKey
1. **Master Key:** Initialized through AndroidX Security Crypto:
   ```kotlin
   MasterKey.Builder(context)
       .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
       .setRequestStrongBoxed(true) // Uses StrongBox Keymaster if available on hardware
       .build()
   ```
2. **Encrypted Token Storage:** `SecureTokenStorage.kt` uses `EncryptedSharedPreferences` with:
   - Key encryption: `AES256_SIV`
   - Value encryption: `AES256_GCM`
3. **Database Encryption:** Local diagnostic readings are cached in Room backed by SQLCipher (`AppDatabase.kt`), using a 256-bit passphrase stored securely in Keystore.
4. **Session Termination (`clearSession()`):** When a user logs out or a refresh token is rejected:
   - Access and refresh tokens are wiped from encrypted storage.
   - User ID and role metadata are purged.
   - Any pending in-flight sync jobs discard unauthenticated payloads.

---

## 4. Network Security & Certificate Pinning

### Network Security Configuration (`network_security_config.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.campusconnect.edu</domain>
        <pin-set expiration="2027-12-31">
            <!-- Primary Production SPKI SHA-256 Pin -->
            <pin digest="SHA-256">47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=</pin>
            <!-- Disaster Recovery Backup SPKI Pin -->
            <pin digest="SHA-256">YLh1dUR9y6Kja30AzzxYT3j8EBHKCRbLRLKnOhQKtwU=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### Automatic Session Recovery & Refresh Token Rotation
```
Client Request -> 401 Unauthorized
  │
  ▼
TokenAuthenticator intercepts 401
  ├─ If prior response count >= 2 ──> Terminate (Prevent infinite loop)
  ├─ If path is /auth/refresh ──────> Clear session & notify UI
  └─ Synchronized lock:
       ├─ If token updated by parallel thread ──> Retry with updated token
       ├─ If no refresh token ──────────────────> Clear session & notify UI
       └─ Call POST /auth/refresh with refreshClient
            ├─ Success (200 OK) ──> Save new tokens, retry request
            └─ Failure (401/403) ─> Clear session & notify UI (User prompted to re-login)
```

---

## 5. Privacy Safeguards & Data Minimization

1. **Zero Hardware Identifiers:**
   - No calls to `TelephonyManager.getImei()`, `getDeviceId()`, or `getSubscriberId()`.
   - No Wi-Fi MAC address or BSSID harvesting.
   - All network telemetry is aggregated into `NetworkContextDto` containing only coarse network technology (`LTE`, `5G`, `WIFI`), non-identifying carrier display label, and signal strength (dBm).
2. **Neutral Diagnostic Reporting:**
   - If connectivity fails, `DiagnosticProbe.kt` records diagnostic facts: e.g., `Connection unreachable: SocketTimeoutException` or `HTTP response returned code 503`.
   - Strictly prohibits speculating or attributing failures to cellular jammers or malicious interference.
3. **Missing Metrics as Null:**
   - If cellular signal strength or latency cannot be obtained, the value is stored and transmitted as `null`. It is never converted to `0` or `0.0`, preventing data corruption or false metrics in campus analytics.
4. **Time-Limited Foreground Monitoring:**
   - `MonitoringService.kt` runs as an explicit Android Foreground Service (`foregroundServiceType="specialUse"`).
   - Posts `MonitoringNotification.kt` which is visible, persistent, and contains an explicit `STOP` button.
   - Automatically halts after a maximum hard limit of 30 minutes to prevent background battery and data drain.

---

## 6. Security Testing & Verification Evidence

The Android security layer is validated by 6 automated unit and security test suites located in `android/app/src/test/java/edu/campusconnect/`:

1. `AuthInterceptorTest.kt`:
   - Verifies injection of `Authorization: Bearer <token>` and `X-Request-ID` tracing header on authenticated requests.
   - Verifies that public endpoints (e.g. `/auth/login`) do NOT leak bearer tokens.
2. `TokenAuthenticatorTest.kt`:
   - Verifies handling of 401 Unauthorized responses.
   - Verifies synchronous refresh token rotation and retrying of the original request.
   - Verifies session clearing and termination when refresh tokens are expired or revoked.
   - Verifies loop prevention when retry limit is reached.
3. `SecurityStorageTest.kt`:
   - Verifies secure storage and retrieval of session tokens.
   - Verifies complete wiping of all credentials upon `clearSession()`.
4. `SensitiveDataLeakageTest.kt`:
   - Verifies that `AppLogger` automatically redacts Bearer tokens, passwords, and authorization headers from logs.
5. `DiagnosticPrivacyTest.kt`:
   - Verifies neutral diagnostic reporting (zero occurrence of "jammer", "blocker", or attack claims).
   - Verifies that missing metrics are stored as `null` rather than `0`.
   - Uses reflection on DTO classes to verify that zero fields match IMEI, IMSI, MAC, BSSID, GPS, or cell tower IDs.
6. `ManifestSecurityTest.kt`:
   - Parses `AndroidManifest.xml` to verify:
     - All internal activities, services, and receivers are `exported="false"`.
     - `android:allowBackup="false"`.
     - `android:usesCleartextTraffic="false"`.
     - Prohibited permissions (Location, Camera, Audio, SMS, Contacts) are not requested.
