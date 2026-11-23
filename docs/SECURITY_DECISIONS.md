# Campus Connect — Security Architecture Decisions (ADRs)

## 1. Overview & Decision Framework

This document records the foundational architectural decisions, threat trade-offs, and unresolved institutional questions governing the security and privacy engineering of Campus Connect. Each record follows the Architecture Decision Record (ADR) format: **Context**, **Decision**, **Rationale**, **Consequences**, and **Security Impact**.

---

## 2. Security Architecture Decision Records

### ADR-SEC-01: Identity & Authentication Strategy
- **Status:** Approved for MVP
- **Context:** Campus Connect requires identifying contributors to prevent spam and link reading history, while respecting privacy and supporting multi-role access (`student`, `campus_viewer`, `campus_admin`, `system_admin`). We evaluated: (A) Custom email/password database, (B) Fully anonymous tokenless contribution, (C) Federated OpenID Connect (OIDC) / OAuth 2.0 PKCE via campus identity provider (or managed Supabase Auth / Keycloak).
- **Decision:** Adopt **Federated OIDC / OAuth 2.0 with PKCE** backed by institutional SSO (or Supabase Auth as a development surrogate).
- **Rationale:** 
  - Prevents storing or managing sensitive password hashes in the application database.
  - Leverages institutional Multi-Factor Authentication (MFA) for administrative and staff accounts.
  - Eliminates credential-stuffing vulnerability surface from Campus Connect API servers.
  - Anonymous mode was rejected for the primary MVP because it prevents effective sybil attack prevention, enables uncontrolled telemetry poisoning, and prevents students from viewing or deleting their personal contribution history.
- **Consequences:** 
  - Requires integration with the college's IdP (Shibboleth, Google Workspace, Azure AD) or a managed OIDC bridge.
  - Offline Android diagnostics must function without an active network token, holding records locally until authentication is restored during upload.

---

### ADR-SEC-02: Device Integrity & Root Detection Policy
- **Status:** Approved for MVP
- **Context:** Students run diverse Android devices across Android 10 through Android 15. Some students intentionally root their devices or run custom ROMs (LineageOS, GrapheneOS) for technical curiosity or privacy reasons. We evaluated whether to enforce strict hardware attestation (Play Integrity API / SafetyNet) and block rooted devices.
- **Decision:** Implement **Permissive Diagnostic Mode with Soft Attestation Scoring**, rather than blocking rooted or uncertified devices.
- **Rationale:**
  - Campus Connect is an inclusive campus diagnostic utility, not a banking application. Blocking rooted phones would disenfranchise technical students and skew network observations in computer science departments.
  - Instead of blocking, the backend calculates an **integrity confidence score** based on submission velocity, geographic consistency, and signal plausibility.
  - Rooted devices can still submit readings, but single-device outlier submissions cannot unilaterally alter published zone statuses.
- **Consequences:**
  - Mitigates false data injection through server-side statistical validation, rate limiting, and median filtering rather than fragile client-side anti-tampering guards.
  - Preserves student trust and maximum participation.

---

### ADR-SEC-03: Mobile Local Storage Encryption (Android Room)
- **Status:** Approved for MVP
- **Context:** Unsent diagnostic readings are queued in a local SQLite (Room) database on the Android device. If a device is lost, stolen, or shared, unencrypted database files could be extracted.
- **Decision:** Use **SQLCipher for Android** integrated with AndroidX Security **MasterKey / EncryptedSharedPreferences** to encrypt the Room database file at rest using AES-256-GCM.
- **Rationale:**
  - Provides defense in depth against physical extraction via ADB backup, unprivileged file system browsing, or recovery environments.
  - The encryption key is generated locally using `SecureRandom`, stored securely in the hardware-backed **Android Keystore System**, and never transmitted over the network.
- **Consequences:**
  - Minimal performance overhead (~5-10ms per batch write) which is negligible for network telemetry persistence.
  - Requires adding the SQLCipher dependency (`net.zetetic:android-database-sqlcipher`).

---

### ADR-SEC-04: API Transport Security & Dynamic Key Pinning
- **Status:** Approved for MVP
- **Context:** Man-in-the-Middle (MitM) attacks on campus networks (e.g., rogue access points, ARP spoofing, hostile SSL proxying) could intercept student credentials or manipulate telemetry. We evaluated: (A) Standard CA validation, (B) Static hardcoded certificate pinning, (C) Dynamic SPKI Public Key Pinning via Android Network Security Config with backup disaster-recovery pins.
- **Decision:** Adopt **Dynamic SPKI Public Key Pinning via Android Network Security Config** with an active leaf pin and two backup intermediate/root pins.
- **Rationale:**
  - Standard CA trust allows compromised or enterprise-installed root certificates (e.g., university network inspection appliances) to inspect app traffic.
  - Static certificate pinning risks bricking the app when certificates expire or rotate unexpectedly.
  - SPKI pinning against the intermediate CA and backup disaster keys provides high MitM resilience while guaranteeing continuity during planned certificate renewals.
- **Consequences:**
  - Pin-set expiration must be managed as part of the operational certificate rotation lifecycle.
  - Captive portal detection must gracefully handle TLS handshake failures without degrading encryption.

---

### ADR-SEC-05: Background Job Processing Engine Selection
- **Status:** Approved for MVP
- **Context:** Processing asynchronous tasks (aggregating millions of zone measurements, recomputing hourly heatmaps, handling offline batch synchronizations, purging expired records) requires a secure background worker. We evaluated: (A) In-process JavaScript timers (`setInterval`), (B) Redis-backed BullMQ, (C) PostgreSQL-native queue (`pg-boss`).
- **Decision:** Deploy **BullMQ backed by an isolated, authenticated Redis instance** with strict TLS.
- **Rationale:**
  - In-process timers block the Node.js event loop during heavy statistical calculations and do not survive application restarts.
  - BullMQ provides distributed task management, dead-letter queues (DLQ), exponential backoff retries, and high-throughput job deduplication.
  - Dedicated Redis instance decouples compute-intensive aggregation workloads from the primary PostgreSQL transactional database, preventing database CPU starvation.
- **Consequences:**
  - Introduces a Redis infrastructure component. Redis must be configured with TLS, strong password authentication, and restricted network security groups.

---

### ADR-SEC-06: Database Authorization Strategy (Row-Level Security)
- **Status:** Approved for MVP
- **Context:** Traditional web applications rely solely on backend application code (Express middleware / ORM filters) to enforce tenant and user isolation. A single missing `WHERE user_id = ...` in an endpoint leaks private records (BOLA/IDOR).
- **Decision:** Enforce **PostgreSQL Row-Level Security (RLS)** in tandem with application middleware.
- **Rationale:**
  - Implements defense in depth. Even if an application bug omits a filter, the database engine itself rejects access to rows not owned by the active session user.
  - The API connection pool sets a session-level configuration variable (`SET LOCAL app.current_user_id = '...'`) at the start of each transaction.
- **Consequences:**
  - Requires database migrations to define and maintain RLS policies.
  - Adds minor query parsing overhead in PostgreSQL, well within performance budgets.

---

### ADR-SEC-07: Telephony API Data Minimization & Permissions
- **Status:** Approved for MVP
- **Context:** Capturing cellular network performance on Android involves Telephony APIs (`TelephonyManager`, `TelephonyCallback`, `SignalStrength`). On modern Android versions (Android 10+), accessing fine-grained cellular details or cell tower identifiers requires dangerous runtime permissions (`READ_PHONE_STATE`, `ACCESS_FINE_LOCATION`).
- **Decision:** Restrict collection strictly to **high-level, non-identifying telemetry**:
  - Carrier display name (normalized).
  - General network technology (e.g., LTE, 5G NR, Wi-Fi).
  - Signal strength in dBm or signal level (1-4).
  - Reachability and latency to a controlled HTTPS endpoint.
  - **Permanently ban collection of Cell ID (CID), Location Area Code (LAC), Tracking Area Code (TAC), Base Station ID, and GPS coordinates.**
- **Rationale:**
  - Cell tower IDs can be correlated against commercial cell-tower location databases (e.g., OpenCelliD) to triangulate a student's exact physical position without their consent.
  - Coarse signal and network type are completely sufficient to diagnose campus dead zones.
- **Consequences:**
  - App never requests Android location permissions, simplifying user trust and Play Store compliance.
  - If a device denies `READ_PHONE_STATE`, the app degrades gracefully, capturing Wi-Fi and speed/latency tests normally.

---

### ADR-SEC-08: Differential Privacy & K-Anonymity Aggregation Thresholds
- **Status:** Approved for MVP
- **Context:** Publishing heatmaps in sparse or low-occupancy campus areas (e.g., a quiet research laboratory or night-shift library room) could allow an observer to infer an individual student's presence or schedule by watching real-time updates.
- **Decision:** Enforce a **K-Anonymity Threshold ($k \ge 5$) across at least 3 distinct devices** and **quantize time into 1-hour windows**.
- **Rationale:**
  - Prevents single-user re-identification through temporal or spatial correlation.
  - A zone displaying status is guaranteed to represent collective student experiences rather than an isolated individual.
- **Consequences:**
  - Zones with fewer than 5 readings will display `INSUFFICIENT_DATA` (grey) on the public heatmap until adequate sample volume is reached.
  - Dashboard UI must clearly explain to users why low-sample zones do not yet show color-coded statuses.

---

### ADR-SEC-09: Diagnostic Neutrality & Terminology Proscription
- **Status:** Approved for MVP
- **Context:** Connectivity failures can be caused by concrete walls, dead spots, network congestion, misconfigured APs, SIM failures, or captive portal timeouts. Asserting that a network outage is caused by a "mobile jammer" or "malicious attack" without physical radio spectrum analysis is scientifically irresponsible, causes panic, and exposes the institution to legal liability.
- **Decision:** Mandate **Strict Diagnostic Neutrality**. Prohibit all references to "jammers", "sabotage", "malicious interference", or "hostile signals" in the codebase, database, UI copy, and documentation.
- **Rationale:**
  - Preserves empirical integrity. The platform reports *what* the device observed (e.g., "No carrier service available", "Latency 450ms"), never *why* or *who* caused it.
  - Automated CI/CD pipeline linters scan and block commits containing prohibited terminology.
- **Consequences:**
  - UI copy and documentation strictly describe network conditions in neutral engineering terms.

---

### ADR-SEC-10: Web Dashboard Token Storage & Anti-CSRF
- **Status:** Approved for MVP
- **Context:** Single Page Applications (SPAs) often store access tokens in `localStorage`, exposing them to theft via Cross-Site Scripting (XSS). Storing tokens in cookies exposes state-changing endpoints to Cross-Site Request Forgery (CSRF).
- **Decision:** Store **Short-Lived Access Tokens in JavaScript Memory (Closure Scope)**; store **Refresh Tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies**; enforce **Double Submit Anti-CSRF tokens** for all state-changing API operations.
- **Rationale:**
  - Memory-stored access tokens cannot be stolen via `localStorage` harvesting scripts.
  - `HttpOnly` refresh cookies cannot be read by malicious client scripts.
  - Custom `X-CSRF-Token` header validation blocks cross-origin form submissions.
- **Consequences:**
  - Page refresh causes a quick silent token renewal via `/auth/refresh`.
  - Requires web client to handle transparent refresh token renewal.

---

## 3. Unresolved Decisions & Open Questions for Institutional Review

Before proceeding with production deployment or code implementation, the following decisions must be formally approved by institutional stakeholders:

```text
+----+---------------------------------------------------+---------------------------------------------+------------------------------------+
| ID | Decision Question                                 | Architectural Recommendation                | Institutional Authority Required   |
+----+---------------------------------------------------+---------------------------------------------+------------------------------------+
| Q1 | Official Identity Provider Integration            | Connect to campus SAML/OIDC SSO with MFA.   | Campus IT / Information Security   |
| Q2 | Public vs. Campus-Restricted Heatmap Access       | Restrict dashboard to campus network / SSO. | Dean of Student Affairs / IT Dir. |
| Q3 | Diagnostic Measurement Server Hosting             | Host dedicated speed test endpoint on-prem. | Campus Network Infrastructure Team |
| Q4 | Raw Telemetry Retention Period                     | Purge raw readings after 30 days; retain    | Institutional Data Protection /    |
|    |                                                   | anonymized aggregates for 1 academic year.  | Legal Counsel                      |
| Q5 | Anonymous Contribution Mode Feasibility           | Prohibit anonymous mode initially to        | Privacy Committee / IT Security    |
|    |                                                   | prevent sybil telemetry poisoning.          |                                    |
+----+---------------------------------------------------+---------------------------------------------+------------------------------------+
```
