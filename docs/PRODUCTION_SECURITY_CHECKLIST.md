# Campus Connect — Production Security Checklist

This checklist provides an itemized verification baseline for the entire Campus Connect platform prior to production release. Every control is traced to code evidence and automated tests.

---

## 1. Authentication & Session Security

- [x] **Argon2id Password Hashing:** Passwords hashed with Argon2id ($m=65536, t=3, p=4$); plaintext passwords never stored.  
  *Evidence:* [password.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/password.service.ts#L10) | Verified in `auth.test.ts`.
- [x] **NIST SP 800-63B Password Policy:** Minimum 10 characters, max 128 characters, checks against common password lists.  
  *Evidence:* [auth.schemas.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/auth.schemas.ts#L5) | Verified in `auth.test.ts`.
- [x] **Anti-Enumeration Responses:** Registration, login, and password reset endpoints return identical generic messages and timings regardless of whether an email exists.  
  *Evidence:* [auth.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/auth.service.ts#L113) | Verified in `auth.test.ts`.
- [x] **Multi-Factor Authentication (MFA):** RFC 6238 TOTP with constant-time verification; mandatory for administrator accounts.  
  *Evidence:* [mfa.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/mfa.service.ts) & [auth.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/auth.service.ts#L137).
- [x] **MFA Secrets Encrypted at Rest:** Database column `users.mfa_secret` encrypted via AES-256-GCM.  
  *Evidence:* [mfa.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/mfa.service.ts#L15).
- [x] **Single-Use Password Reset Tokens:** 256-bit cryptographically secure tokens; hashed with SHA-256 in database; 15-minute expiry; immediately invalidated upon use.  
  *Evidence:* [auth.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/auth.service.ts#L210) | Verified in `auth.test.ts`.
- [x] **Refresh Token Rotation & Family Revocation:** Single-use refresh tokens rotated upon consumption. Replaying a used token immediately invalidates the entire token family.  
  *Evidence:* [token.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/auth/token.service.ts#L65) | Verified in `auth.test.ts`.
- [x] **Zero Tokens in Web LocalStorage:** JWTs never stored in browser `localStorage` or `sessionStorage`. Transmitted via HttpOnly cookies.  
  *Evidence:* [client.ts](file:///d:/BroSploit/Code/CampusConnect/frontend/src/api/client.ts) | Verified in `credential_storage.test.ts`.
- [x] **Session Revocation & Suspension:** Immediate session termination and token revocation upon password reset, role modification, or account suspension.  
  *Evidence:* [admin.controller.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/admin/admin.controller.ts#L123).

---

## 2. Authorization & Access Control

- [x] **Role-Based Access Control (RBAC):** Strict separation of `student`, `moderator`, and `administrator` roles enforced at middleware layer.  
  *Evidence:* [rbac.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/rbac.ts) | Verified in `authz.test.ts`.
- [x] **Object-Level Authorization (BOLA/IDOR Prevention):** Validates resource ownership for student records, personal diagnostic histories, and trouble tickets.  
  *Evidence:* [objectAuth.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/objectAuth.ts) | Verified in `authz.test.ts`.
- [x] **Client Route Guarding (403 Enforcement):** Web frontend renders HTTP 403 Access Denied view when students attempt to view administrative routes.  
  *Evidence:* [ProtectedRoute.tsx](file:///d:/BroSploit/Code/CampusConnect/frontend/src/components/common/ProtectedRoute.tsx) | Verified in `access_control.test.tsx`.
- [x] **Self-Demotion & Self-Suspension Prevention:** Administrators prohibited from suspending their own accounts or demoting themselves.  
  *Evidence:* [admin.controller.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/admin/admin.controller.ts#L117).

---

## 3. Application Vulnerability Mitigations

- [x] **Cross-Site Scripting (XSS) Prevention:** Contextual output encoding via React text nodes and `<SafeText />`. Zero `dangerouslySetInnerHTML`.  
  *Evidence:* [SafeText.tsx](file:///d:/BroSploit/Code/CampusConnect/frontend/src/components/common/SafeText.tsx) | Verified in `xss_prevention.test.tsx`.
- [x] **Anti-CSRF Protection:** Double-submit cookie verification (`X-CSRF-Token` header matching `cc_csrf_token` cookie) for all state-changing browser requests.  
  *Evidence:* [securityHeaders.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/securityHeaders.ts#L62) & [client.ts](file:///d:/BroSploit/Code/CampusConnect/frontend/src/api/client.ts). Verified in `csrf_protection.test.ts`.
- [x] **SQL Injection Defense:** All database queries executed via parameterized SQL statements or safe ORM repository abstractions. Zero dynamic string concatenation.  
  *Evidence:* [pgRepository.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/database/pgRepository.ts) | Verified in `validation.test.ts`.
- [x] **Mass Assignment Defense:** Ingestion requests validated strictly against Zod schemas; unexpected fields are stripped.  
  *Evidence:* [validate.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/validate.ts) | Verified in `validation.test.ts`.
- [x] **Payload Size Limits:** Express JSON body parser strictly limits request bodies to 100KB, preventing ReDoS and memory exhaustion attacks.  
  *Evidence:* [app.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/app.ts#L27) | Verified in `validation.test.ts`.
- [x] **Error Sanitization:** Error handler masks PostgreSQL syntax errors, internal file paths, and server stack traces.  
  *Evidence:* [errorHandler.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/errorHandler.ts) & [client.ts](file:///d:/BroSploit/Code/CampusConnect/frontend/src/api/client.ts). Verified in `error_sanitization.test.ts`.

---

## 4. Mobile Security (OWASP MASVS v2.0)

- [x] **Android Keystore Hardware Protection:** AES-256-GCM cipher initialized inside AndroidKeyStore with hardware StrongBox key protection where available.  
  *Evidence:* [KeystoreManager.kt](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/java/edu/campusconnect/core/security/KeystoreManager.kt).
- [x] **Encrypted Local Storage with Keystore Fallback:** Tokens stored in `EncryptedSharedPreferences` backed by `MasterKey`, with automated Keystore envelope encryption fallback.  
  *Evidence:* [SecureTokenStorage.kt](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/java/edu/campusconnect/core/security/SecureTokenStorage.kt). Verified in `SecurityStorageTest.kt`.
- [x] **Prohibited Dangerous Permissions:** Manifest strictly omits permissions for GPS location, camera, microphone, contacts, SMS, and phone state identifiers (IMEI/IMSI).  
  *Evidence:* [AndroidManifest.xml](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/AndroidManifest.xml). Verified in `ManifestSecurityTest.kt`.
- [x] **Backup Exclusions:** `allowBackup="false"` in manifest, and `backup_rules.xml` & `data_extraction_rules.xml` exclude encrypted token storage and databases.  
  *Evidence:* [backup_rules.xml](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/res/xml/backup_rules.xml). Verified in `ManifestSecurityTest.kt`.
- [x] **Network Security Config & Certificate Pinning:** Cleartext traffic disabled; leaf and disaster-recovery backup SPKI pins defined for `api.campusconnect.edu`.  
  *Evidence:* [network_security_config.xml](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/res/xml/network_security_config.xml).
- [x] **Component Protection:** All Activities and Services (except launcher `MainActivity`) are explicitly `android:exported="false"`.  
  *Evidence:* [AndroidManifest.xml](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/AndroidManifest.xml). Verified in `ManifestSecurityTest.kt`.
- [x] **Release Obfuscation & Log Stripping:** ProGuard rules strip all `android.util.Log` invocations in release builds; R8 shrinking enabled.  
  *Evidence:* [proguard-rules.pro](file:///d:/BroSploit/Code/CampusConnect/android/app/proguard-rules.pro).

---

## 5. Privacy Safeguards & Data Minimization

- [x] **K-Anonymity Sample Thresholds:** Public and student views withhold metrics for zones with fewer than the configured sample threshold (5 observations), displaying `INSUFFICIENT_DATA`.  
  *Evidence:* [OverviewPage.tsx](file:///d:/BroSploit/Code/CampusConnect/frontend/src/pages/OverviewPage.tsx#L85) & [readings.service.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/modules/readings/readings.service.ts). Verified in `privacy_threshold.test.ts`.
- [x] **Zero Location Tracking:** Telemetry is attributed to user-selected campus zones rather than GPS coordinates.  
  *Evidence:* [ConnectivityInspector.kt](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/java/edu/campusconnect/core/telephony/ConnectivityInspector.kt). Verified in `DiagnosticPrivacyTest.kt`.
- [x] **Neutral Diagnostic Findings:** Findings strictly report factual connectivity (e.g. timeout, DNS failure); never claims radio jammer presence.  
  *Evidence:* [DiagnosticProbe.kt](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/java/edu/campusconnect/core/telephony/DiagnosticProbe.kt). Verified in `DiagnosticPrivacyTest.kt`.
- [x] **Time-Limited Foreground Service:** Opt-in background monitoring runs with a persistent notification containing an explicit Stop button, and enforces a hard 30-minute limit.  
  *Evidence:* [MonitoringService.kt](file:///d:/BroSploit/Code/CampusConnect/android/app/src/main/java/edu/campusconnect/core/monitoring/MonitoringService.kt).

---

## 6. Infrastructure, Secrets & Operations

- [x] **Content Security Policy (Level 3):** Disallows `unsafe-eval`, inline scripts, and restricts origins strictly to API and OpenStreetMap tiles.  
  *Evidence:* [index.html](file:///d:/BroSploit/Code/CampusConnect/frontend/index.html) & [nginx.conf](file:///d:/BroSploit/Code/CampusConnect/frontend/nginx.conf).
- [x] **HTTP Security Headers:** HSTS (2 years), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.  
  *Evidence:* [securityHeaders.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/securityHeaders.ts) & [nginx.conf](file:///d:/BroSploit/Code/CampusConnect/frontend/nginx.conf).
- [x] **CORS Explicit Allowlist:** Strict origin verification against allowlist; wildcard `*` origins rejected when credentials are true.  
  *Evidence:* [securityHeaders.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/securityHeaders.ts#L42) | Verified in `authz.test.ts`.
- [x] **Structured Security Audit Logging:** Append-only database audit log; recursive regex auto-redaction of passwords, tokens, and authorization headers.  
  *Evidence:* [auditLogger.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/middleware/auditLogger.ts). Verified in `audit.test.ts`.
- [x] **Zero Secrets in Source Control:** No real passwords, private keys, or API tokens committed in repository files or git history.  
  *Evidence:* Verified via repository secret scan and `git diff` inspection.
- [x] **Production Secret Validation:** Backend startup halts if default development secrets are supplied when `NODE_ENV === 'production'`.  
  *Evidence:* [env.ts](file:///d:/BroSploit/Code/CampusConnect/backend/src/config/env.ts).

---

## 7. Items Requiring External / Operational Execution Prior to Go-Live

The following items cannot be fully automated in code and require operational execution by campus IT and infrastructure engineering:

1. **[ ] Issue Production TLS Certificates:** Install valid CA-signed certificates (e.g. Let's Encrypt / Institutional PKI) on Nginx reverse proxy to activate HSTS and Secure cookie transport.
2. **[ ] Populate Production Secrets:** Generate 32+ character high-entropy random keys for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, and `CSRF_SECRET` in production `.env` / vault.
3. **[ ] Database Role Provisioning:** Run migrations with `cc_migration_user` and run the application service with least-privilege `cc_api_user` credentials.
4. **[ ] Automated Backup & Restore Drill:** Schedule daily encrypted PostgreSQL backups and conduct a verified restore drill to secondary storage.
5. **[ ] Third-Party Penetration Test:** Commission an independent CREST-accredited penetration testing firm to conduct black-box/grey-box testing against the production staging cluster.
