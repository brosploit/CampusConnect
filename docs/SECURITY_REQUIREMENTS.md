# Campus Connect — Traceable Security Requirements Checklist

## 1. Overview & Framework Alignment

This document establishes the traceable, enforceable security requirements for the Campus Connect platform. Requirements are derived directly from four recognized security engineering standards and contextualized for a college campus connectivity intelligence platform:
1. **OWASP ASVS 5.0.0 (Application Security Verification Standard):** Backend, authentication, and web session controls.
2. **OWASP MASVS v2.0 & MASTG (Mobile Application Security Verification Standard / Mobile Security Testing Guide):** Android mobile client, telemetry collection, and local persistence.
3. **OWASP API Security Top 10 (2023):** REST API surface, rate limiting, and object-level authorization.
4. **NIST SSDF (Secure Software Development Framework - SP 800-218):** Secure coding practices, pipeline integrity, and supply chain controls.
5. **Campus Connect Privacy Invariants (CC-PRIV):** Institutional data minimization, zone-based location decoupling, consent lifecycle, and diagnostic neutrality.

---

## 2. Traceability Matrix & Security Requirements Checklist

| Requirement ID | Domain | Standard Mapping | Target Component | Technical Requirement Specification | Implementation Mechanism | Verification Method |
|---|---|---|---|---|---|---|
| **REQ-AUTH-01** | Authentication | ASVS V2.1.1<br/>API2:2023 | Backend API | All non-public API endpoints must verify cryptographic JWT signatures using asymmetric keys (RS256 or ES256). Prohibit `alg: none` and symmetric fallback. | Express JWT middleware with cached remote JWKS client and strict algorithm filtering. | Automated integration test with forged, expired, and unsigned tokens. |
| **REQ-AUTH-02** | Authentication | ASVS V3.2.1<br/>API2:2023 | Backend API | Access tokens must have a maximum lifetime of 15 minutes. Refresh tokens must be single-use and rotate upon every invocation. | Identity Provider token configuration; server-side refresh token rotation with family invalidation on reuse. | Integration test asserting token expiration at 15m and detecting refresh token replay. |
| **REQ-AUTH-03** | Authentication | ASVS V2.2.1<br/>NIST SP 800-63B | IdP / Auth Service | Passwords must be at least 12 characters and checked against breached credential databases (HaveIBeenPwned). Campus SSO must enforce MFA for admin roles. | Identity Provider password policy and breach detection hooks. | Auth test validating rejection of weak and compromised passwords. |
| **REQ-AUTH-04** | Authentication | ASVS V3.4.1 | Web Dashboard | Web client access tokens must be stored in memory only. Refresh tokens must be held in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. | React auth context closure state + secure cookie headers on `/auth/refresh`. | DAST and browser storage inspection confirming zero token persistence in `localStorage`. |
| **REQ-AUTHZ-01** | Authorization | ASVS V4.1.1<br/>API5:2023 | Backend API | Administrative routes (`/api/v1/admin/*`) must enforce role-based access control. Non-admin tokens must be rejected with HTTP `403 Forbidden`. | Declarative Express middleware `requireRole(['campus_admin', 'system_admin'])`. | Matrix test calling every admin endpoint with `student` and `campus_viewer` tokens. |
| **REQ-AUTHZ-02** | Authorization | ASVS V4.2.1<br/>API1:2023 (BOLA) | Backend API | Users may only view or manipulate their own resources (e.g., `/readings/mine`, `/monitoring/sessions/:id/stop`). Resource IDs must be bound to the token subject. | Database queries enforce `WHERE user_id = token.sub` regardless of path parameters. | BOLA automated test attempting to stop another student's monitoring session by ID. |
| **REQ-AUTHZ-03** | Authorization | ASVS V4.1.3 | Database | Enforce Row-Level Security (RLS) on PostgreSQL tables (`readings`, `issue_reports`, `monitoring_sessions`) as defense in depth against application logic flaws. | PostgreSQL `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements. | Database integration test executing queries without `WHERE` clause under `cc_api_user` role. |
| **REQ-DATA-01** | Data Minimization | CC-PRIV-01<br/>MASVS-PRIVACY | Android Client | The Android application must NEVER collect, store, or transmit IMEI, IMSI, SIM serial, MAC address, or hardware serial numbers. | Static analysis linting; absence of telephony identifier method calls in codebase. | Release APK source inspection, byte-code audit, and network payload interception. |
| **REQ-DATA-02** | Data Minimization | CC-PRIV-02<br/>MASVS-PRIVACY | Android Client | The Android application must NEVER request or collect contacts, SMS, call logs, browsing history, or personal phone numbers. | AndroidManifest.xml verification; absence of sensitive permission declarations. | Automated manifest audit gate in CI/CD pipeline. |
| **REQ-DATA-03** | Location Privacy | CC-PRIV-03<br/>ASVS V8.3.1 | Android Client / Backend | The system must use manual campus-zone selection for the MVP. Precise GPS location (`ACCESS_FINE_LOCATION`) must not be requested or persisted. | UI zone picker; database schema stores `zone_id` only; JSON schemas reject coordinate fields. | Static code analysis and API schema validation asserting coordinate fields are rejected. |
| **REQ-DATA-04** | Data Minimization | CC-PRIV-04<br/>ASVS V8.3.2 | Backend / Aggregator | Public heatmap and aggregate analytics endpoints must apply a minimum sample threshold ($k \ge 5$ readings across $\ge 3$ distinct devices) before publishing zone status. | Aggregation SQL query filters `HAVING sample_count >= 5 AND distinct_devices >= 3`, else returns `INSUFFICIENT_DATA`. | Analytics unit test verifying that 4 readings result in `INSUFFICIENT_DATA` status. |
| **REQ-MON-01** | Consent & Monitoring | CC-PRIV-05<br/>MASVS-USER | Android Client | Automatic monitoring must be opt-in, disabled by default, require explicit user initiation, display an active notification, and provide an immediate Stop action. | Jetpack Compose consent dialog, Foreground Service with non-dismissible notification and Stop pending intent. | UI instrumentation test asserting monitoring cannot start without user tap and stops immediately. |
| **REQ-MON-02** | Monitoring Expiry | CC-PRIV-06 | Backend / Android | Monitoring sessions must enforce a server-side maximum duration (max 30 minutes) and expire automatically upon abandonment or app termination. | Backend session record `expires_at = started_at + interval`; background cleanup job; Android AlarmManager / timer. | Test verifying server rejects readings submitted after `expires_at` timestamp. |
| **REQ-DIAG-01** | Diagnostic Neutrality | CC-PRIV-07 | System-wide | The system must never assert, infer, or label connectivity failures as "jammers" or intentional radio interference. Diagnostic findings must be described neutrally. | UI copy guidelines; automated linter blocking terms `jammer`, `interference attack`, `hostile carrier`. | CI grep check scanning all source files for prohibited strings. |
| **REQ-INPUT-01** | Input Validation | ASVS V5.1.1<br/>API3:2023 | Backend API | All incoming API request bodies, query parameters, and path variables must be strictly validated against runtime schemas (Zod). Unknown fields must be stripped. | Strict Zod schemas with `.strict()` mode on all routes; type coercion prohibited. | Fuzz test submitting unexpected fields, invalid enums, negative numbers, and oversized strings. |
| **REQ-INPUT-02** | Input Validation | ASVS V5.2.2 | Backend API | String inputs must enforce strict character whitelists and length limits to prevent ReDoS and buffer exhaustion. | Zod regex validation (`/^[\w\.\-]+$/`) and `.max(length)` bounds on all text fields. | ReDoS fuzzing test with evil regex payload strings. |
| **REQ-INJ-01** | SQL Injection | ASVS V5.3.1 | Backend API / DB | All database interactions must use parameterized queries or type-safe query builders with parameter binding ($1, $2). Raw SQL string concatenation is strictly prohibited. | Kysely / Prisma / parameterized `pg` queries; ESLint rule `no-unsafe-query-concat`. | Static code analysis (Semgrep) and dynamic SQL injection scans (sqlmap, OWASP ZAP). |
| **REQ-INJ-02** | Cross-Site Scripting | ASVS V5.3.3 | Web Dashboard | All user-supplied text (issue descriptions, zone notes) rendered in the web dashboard must be contextually escaped and sanitized to prevent XSS. | React auto-escaping; DOMPurify sanitization before rendering; strict CSP `script-src 'self'`. | Dynamic XSS test suite injecting polyglot XSS vectors into issue reports. |
| **REQ-RATE-01** | Anti-Abuse / DoS | ASVS V13.1.5<br/>API4:2023 | Perimeter / API | The API must enforce tiered rate limiting: public endpoints (100 req/min/IP), reading submissions (10 req/min/user), batch submissions (5 req/min/user, max 50 items). | Redis token-bucket rate limiter middleware returning HTTP `429 Too Many Requests`. | Automated load test validating that exceeding request limits triggers `429` with `Retry-After`. |
| **REQ-NET-01** | Transport Security | ASVS V9.1.1<br/>MASVS-NETWORK | Android Client | The Android app must enforce TLS 1.3, prohibit cleartext traffic, and apply dynamic SPKI public key pinning for production endpoints. | `res/xml/network_security_config.xml` with `cleartextTrafficPermitted="false"` and primary/backup pin-sets. | MitM proxy test (mitmproxy / Burp Suite) confirming app aborts connection with untrusted cert. |
| **REQ-NET-02** | Transport Security | ASVS V9.2.1 | Perimeter / Web | Web dashboard and API must enforce HSTS with preload (`max-age=63072000; includeSubDomains; preload`) and serve strict CSP Level 3 headers. | Nginx / Cloudflare security header injection; Express Helmet middleware. | SSL Labs A+ verification scan and Mozilla Observatory security header audit. |
| **REQ-SEC-STORE-01**| Mobile Storage | MASVS-STORAGE-1 | Android Client | Local SQLite (Room) database must be encrypted at rest using AES-256-GCM. Database key must be secured in Android Keystore. | SQLCipher for Android integrated with AndroidX Security `MasterKey`. | Physical device extraction test verifying Room database file cannot be read in plaintext. |
| **REQ-SEC-STORE-02**| Secret Management | ASVS V8.2.1<br/>NIST SSDF PS3 | Infrastructure | Zero secrets, private keys, or credentials stored in source code. Secrets must be injected at runtime via managed Secret Manager. | Doppler / AWS Secrets Manager / Vault; pre-commit git-hook scanning with Gitleaks. | Automated Gitleaks scan in CI/CD pipeline failing on any committed secret or token. |
| **REQ-ERR-01** | Secure Failure | ASVS V13.2.3 | Backend API | Errors must never expose database schemas, internal paths, SQL queries, or stack traces. Responses must adhere to sanitized, opaque JSON error contracts. | Centralized Express error-handling middleware mapping exceptions to standard error envelopes. | Negative test suite triggering database constraint violations, verifying no stack trace leaks. |
| **REQ-AUDIT-01** | Security Auditing | ASVS V8.1.1<br/>API8:2023 | Backend / DB | All administrative actions, authentication failures, authorization denials, and rate-limit triggers must generate append-only structured audit logs. | Winston / Pino structured JSON logger streaming to centralized SIEM; PostgreSQL `pgaudit`. | Audit verification test asserting an audit log event is generated on every admin action. |
| **REQ-SUPPLY-01** | Supply Chain | NIST SSDF PW4<br/>NIST SSDF PW7 | CI/CD Pipeline | All dependencies must be locked via deterministic lockfiles and audited against vulnerability databases. CVSS $\ge 7.0$ blocks deployment. | `npm audit --audit-level=high`, Gradle dependencyCheck, Dependabot automated PRs. | Automated CI build step failing if unpatched high/critical CVEs exist. |

---

## 3. Detailed Technical Invariant Specifications

### 3.1 CC-PRIV-01: Prohibition of Persistent Hardware Identifiers
```text
INVARIANT: At no point in the lifecycle of Campus Connect shall the client collect, generate, or transmit:
  - International Mobile Equipment Identity (IMEI)
  - International Mobile Subscriber Identity (IMSI)
  - Integrated Circuit Card Identifier (ICCID / SIM serial)
  - Media Access Control (MAC) address
  - Mobile Station International Subscriber Directory Number (MSISDN / phone number)

RATIONALE: Telephony identifiers are globally unique, immutable, and link physical individuals to radio telemetry without consent.
ENFORCEMENT: 
1. Android Lint rule prohibits `TelephonyManager.getImei()`, `getMeid()`, `getSubscriberId()`, `getSimSerialNumber()`.
2. Zod backend ingestion schemas explicitly prohibit fields matching `imei`, `imsi`, `mac`, `phone`.
```

### 3.2 CC-PRIV-03: Zone-Based Decoupling & GPS Proscription
```text
INVARIANT: Location attribution is strictly bounded to predefined campus administrative zones (e.g., "Library", "Hostel A").
  - The Android application manifest must NOT declare ACCESS_FINE_LOCATION or ACCESS_BACKGROUND_LOCATION.
  - The backend database will store zone UUIDs only; it will not store raw latitude/longitude points of contributors.

RATIONALE: Continuous GPS coordinates enable stalking, routine mapping, and deanonymization of students. Broad zones provide actionable campus intelligence while preserving privacy.
```

### 3.3 CC-PRIV-05 & 06: Consent, Transparency, and Revocation of Monitoring
```text
INVARIANT: Automatic diagnostic monitoring is strictly ephemeral, opt-in, visible, and revocable.
  - Default State: OFF.
  - Activation: Requires affirmative user interaction with clear disclosure of metrics, zone association, and duration.
  - Visibility: Non-dismissible Android Foreground Notification while active.
  - Revocation: User tap on "Stop Monitoring" must immediately unregister all OS callbacks and notify backend.
  - Maximum Lifetime: Hard ceiling of 30 minutes enforced both locally and server-side.
```

### 3.4 CC-PRIV-07: Diagnostic & Scientific Neutrality Invariant
```text
INVARIANT: The system is an empirical diagnostic recorder, not an attribution engine.
  - The UI and API must never declare an area to be "jammed" or "under attack".
  - Failed reachability, weak signal, or high packet loss must be displayed neutrally as measured conditions.
  - Automated CI tests will scan all strings and markdown assets for prohibited terminology.
```
