# Campus Connect — Security Verification & Test Plan

## 1. Objectives & Scope

This Security Verification and Test Plan establishes the automated and manual testing procedures required to validate the security, privacy, and resilience posture of Campus Connect before any pilot deployment.

The scope encompasses:
1. **Static Application Security Testing (SAST)** and code quality gates.
2. **Software Composition Analysis (SCA)** and dependency vulnerability scanning.
3. **Secret Detection & Prevention** across git repositories.
4. **Dynamic Application Security Testing (DAST)** for the Express REST API.
5. **Mobile Application Security Testing (MAST)** for the Android Kotlin application (OWASP MASTG).
6. **Web Application Security Testing** for the React dashboard.
7. **Manual Penetration Testing & Fuzzing Scenarios** targeting BOLA, BFLA, rate limiting, and telemetry tampering.
8. **Automated CI/CD Quality Gates & Pipeline Breakers**.

---

## 2. Automated Testing Pipeline & Tooling

```mermaid
flowchart LR
    DevCommit[Developer Commit / PR] --> PreCommit[Pre-Commit Hooks\n- Gitleaks\n- ESLint / Detekt]
    PreCommit --> CI_Pipeline[CI/CD Security Pipeline]
    
    subgraph CI_Pipeline ["CI/CD Pipeline Security Gates"]
        SCA[Dependency Scanning\n- npm audit\n- Gradle depCheck]
        SAST[Static Analysis\n- Semgrep\n- SonarQube]
        SecretScan[Deep Secret Scan\n- Trufflehog]
        ManifestCheck[Privacy & Manifest Audit\n- Banned Permissions]
    end

    CI_Pipeline -->|Pass (0 Crit/High)| BuildArtifacts[Build & Package Artifacts]
    CI_Pipeline -.->|Fail (Violations Found)| BlockDeploy[Block Pipeline & Alert]
    
    BuildArtifacts --> StagingEnv[Deploy to Hardened Staging]
    StagingEnv --> DAST_Scan[Dynamic Scans\n- OWASP ZAP\n- Postman Security Suite]
    StagingEnv --> Mobile_MAST[Mobile Security\n- MobSF Analysis]
```

### Tooling Specification

| Security Domain | Tool | Target Scope | Execution Frequency | Breaking Threshold |
|---|---|---|---|---|
| **Secret Scanning** | Gitleaks & Trufflehog | Entire Git history, PR diffs, environment files | Pre-commit & CI Build | $\ge 1$ detected secret |
| **Backend SAST** | Semgrep (OWASP Top 10 Ruleset) | Node.js / Express / TypeScript source code | Every pull request | $\ge 1$ High or Critical finding |
| **Android SAST** | Detekt + Android Lint Security Rules | Kotlin Jetpack Compose Android codebase | Every pull request | $\ge 1$ High or Critical finding |
| **Web SAST** | ESLint (`eslint-plugin-security`, `eslint-plugin-react`) | React / TypeScript source code | Every pull request | $\ge 1$ High or Critical finding |
| **Backend SCA** | `npm audit --audit-level=high` & Snyk | `package-lock.json` dependencies | Every build & Daily Cron | Any unpatched CVE with CVSS $\ge 7.0$ |
| **Android SCA** | OWASP Dependency-Check (Gradle) | `build.gradle.kts` dependencies | Every build & Daily Cron | Any unpatched CVE with CVSS $\ge 7.0$ |
| **API DAST** | OWASP ZAP (Baseline & Full API Scan) | Staging REST API endpoints via OpenAPI spec | Nightly staging build | $\ge 1$ High or Critical finding |
| **Mobile MAST** | MobSF (Mobile Security Framework) | Release APK / Android App Bundle (AAB) | Weekly & Pre-release | Security Score $< 85$ or High flaw |
| **Privacy Linter** | Custom Python AST / Grep Script | Android Manifest & source files | Every pull request | Any occurrence of banned permissions |

---

## 3. Traceable Security Test Matrix

The following test cases specify the inputs, execution steps, expected behavior, and pass/fail criteria for verifying security controls.

```text
+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-01       | BOLA / IDOR Verification on Monitoring Session Termination                                       |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Broken Object-Level Authorization (OWASP API1:2023 / ASVS V4.2.1)                                |
| Target Component  | Express API: `POST /api/v1/monitoring/sessions/:sessionId/stop`                                  |
| Objective         | Verify that an authenticated student cannot stop another student's active monitoring session.    |
| Test Procedure    | 1. Authenticate Student A (Token A) and Student B (Token B).                                     |
|                   | 2. Using Token B, create an active monitoring session `session_B`.                               |
|                   | 3. Using Token A, send `POST /api/v1/monitoring/sessions/{session_B}/stop`.                     |
| Expected Pass     | API returns HTTP 403 Forbidden or 404 Not Found. Session `session_B` remains ACTIVE in DB.       |
| Failure Condition | API returns HTTP 200 OK or `session_B` status changes to STOPPED.                                |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-02       | Broken Function-Level Authorization (BFLA) on Administrative Endpoints                           |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Broken Function-Level Authorization (OWASP API5:2023 / ASVS V4.1.1)                              |
| Target Component  | Express API: All `/api/v1/admin/*` endpoints                                                     |
| Objective         | Verify that students and unauthenticated users cannot access administrative controls.           |
| Test Procedure    | 1. Obtain a valid JWT for a user with the `student` role.                                        |
|                   | 2. Attempt: `GET /admin/issues`, `PATCH /admin/issues/:id`, `POST /admin/zones`, `PATCH /zones`.  |
|                   | 3. Repeat requests with no token and with an invalid token.                                      |
| Expected Pass     | 100% of requests return HTTP 403 Forbidden (for student) and HTTP 401 Unauthorized (for no token).|
| Failure Condition | Any administrative endpoint returns HTTP 200/201 or reveals administrative data.                |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-03       | SQL Injection Resistance in Filtering and Pagination Queries                                     |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Injection (OWASP ASVS V5.3.1 / CWE-89)                                                           |
| Target Component  | Express API: `GET /campuses/:id/heatmap`, `GET /zones/:id/analytics`, `GET /readings/mine`      |
| Objective         | Verify that all query parameters are strictly parameterized and immune to SQL injection.         |
| Test Procedure    | 1. Fuzz query parameters (`metric`, `networkType`, `from`, `to`, `bucket`, `page`, `pageSize`)   |
|                   |    with SQL injection vectors: `' OR '1'='1`, `1; DROP TABLE readings;--`, `1' UNION SELECT...`|
|                   | 2. Inspect server responses, database error logs, and database table state.                      |
| Expected Pass     | API returns HTTP 400 Validation Error (caught by Zod schema) or safe empty dataset. Zero SQL err.|
| Failure Condition | Database syntax error exposed, timing delay observed (blind SQLi), or unauthorized rows leaked.  |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-04       | Stored & Reflected Cross-Site Scripting (XSS) in Issue Reports                                   |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Cross-Site Scripting (OWASP ASVS V5.3.3 / CWE-79)                                                |
| Target Component  | Web Dashboard (React) / Express API: `POST /api/v1/issues`                                       |
| Objective         | Verify that malicious script tags in issue descriptions are sanitized and never execute.         |
| Test Procedure    | 1. Submit issue report with payload: `<script>window.xss_canary=true</script><img src=x onerror=alert(1)>`.|
|                   | 2. Log into the Web Dashboard as a campus administrator.                                         |
|                   | 3. Navigate to the Issue Moderation screen and view the submitted report.                        |
|                   | 4. Inspect browser DOM and verify whether `window.xss_canary` is defined.                         |
| Expected Pass     | Payload is escaped or sanitized via DOMPurify; script does not execute; CSP blocks inline script.|
| Failure Condition | Script executes or alert box triggers in the browser context.                                   |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-05       | Ingestion Rate Limiting & Denial-of-Service Defense                                               |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Unrestricted Resource Consumption (OWASP API4:2023 / ASVS V13.1.5)                               |
| Target Component  | Express API: `POST /api/v1/readings` and `POST /api/v1/readings/batch`                            |
| Objective         | Verify that high-cadence automated submissions trigger rate-limiting HTTP 429 responses.         |
| Test Procedure    | 1. Using a single student token, send 50 consecutive reading submissions within 5 seconds.       |
|                   | 2. Send 10 consecutive batch submissions (50 readings each) within 10 seconds.                   |
| Expected Pass     | Requests exceeding quota receive HTTP 429 Too Many Requests with a valid `Retry-After` header.   |
| Failure Condition | All 50 individual requests or 10 batch uploads succeed without throttling.                       |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-06       | ReDoS & Malformed Input Resilience in Schema Validation                                          |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Denial of Service (OWASP ASVS V5.2.2 / CWE-1333)                                                 |
| Target Component  | Express API: Ingestion JSON validation middleware (Zod)                                          |
| Objective         | Verify that catastrophic regex backtracking cannot stall the Node.js event loop.                 |
| Test Procedure    | 1. Transmit reading payload with `appVersion` and `carrierLabel` set to evil regex string:        |
|                   |    `"a" * 10000 + "!"` targeting vulnerable exponential regex patterns.                          |
|                   | 2. Monitor Node.js event loop latency during processing.                                         |
| Expected Pass     | Request is rejected within <50ms by Zod string length constraints (`max(32)`). Event loop clear. |
| Failure Condition | Event loop lag exceeds 500ms or API process hangs.                                               |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-07       | Mobile Local Storage Encryption Verification (SQLCipher)                                         |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Insecure Data Storage (OWASP MASVS-STORAGE-1 / MASTG-TEST-0001)                                  |
| Target Component  | Android Application: Room SQLite Database                                                        |
| Objective         | Confirm that local SQLite database files cannot be read without the hardware Keystore key.      |
| Test Procedure    | 1. Install app on an Android test device or emulator, run diagnostic, and save offline reading.  |
|                   | 2. Extract database file via root ADB shell: `/data/data/edu.campusconnect.app/databases/*.db`.  |
|                   | 3. Attempt to inspect database using standard `sqlite3` CLI tool.                                |
| Expected Pass     | `sqlite3` command outputs error: `file is not a database` or `file is encrypted`.                |
| Failure Condition | `sqlite3` opens file and dumps reading tables in cleartext.                                      |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-08       | Android Network Security Config & Man-in-the-Middle (MitM) Resistance                            |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Insecure Communication (OWASP MASVS-NETWORK-1 / MASTG-TEST-0020)                                 |
| Target Component  | Android Application: `network_security_config.xml` & Retrofit/OkHttp Client                      |
| Objective         | Verify that the application aborts network operations if presented with an untrusted proxy cert. |
| Test Procedure    | 1. Route Android device traffic through an active MitM proxy (mitmproxy / Burp Suite).           |
|                   | 2. Install proxy user certificate onto the Android device trusted user certificate store.        |
|                   | 3. Trigger manual diagnostic test and background upload in the app.                              |
| Expected Pass     | App network calls fail with `SSLHandshakeException` / `CertPathValidatorException`. Zero traffic |
|                   | decrypted by proxy. Cleartext traffic permanently rejected.                                      |
| Failure Condition | MitM proxy successfully intercepts and inspects API requests and bearer tokens in cleartext.     |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-09       | Privacy Proscription Audit: Zero Hardware Identifiers in Transit                                 |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Data Minimization & Privacy (OWASP MASVS-PRIVACY / CC-PRIV-01)                                   |
| Target Component  | Android Telephony Probes & API Ingestion Body                                                    |
| Objective         | Verify that hardware identifiers (IMEI, IMSI, MAC, SIM serial) are never collected or sent.      |
| Test Procedure    | 1. Instrument release APK with Frida / Objection to monitor `TelephonyManager` invocations.      |
|                   | 2. Perform 50 manual and monitored diagnostic runs across multiple device states.               |
|                   | 3. Inspect all outbound HTTP payloads logged in test gateway proxies.                            |
| Expected Pass     | Zero invocations of `getImei()`, `getSubscriberId()`, etc. Zero hardware IDs present in JSON.    |
| Failure Condition | Any occurrence of an IMEI, IMSI, or SIM serial number detected in client memory or payloads.     |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-10       | Differential Privacy & K-Anonymity Heatmap Threshold Verification                                |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Information Disclosure & Data Aggregation (OWASP ASVS V8.3.2 / CC-PRIV-04)                       |
| Target Component  | Backend Analytics Aggregator: `GET /campuses/:id/heatmap`                                        |
| Objective         | Verify that low-traffic zones never display status until minimum sample size threshold is met.   |
| Test Procedure    | 1. Create a fresh test zone `Zone_Quiet`.                                                        |
|                   | 2. Submit 3 valid readings from 2 distinct test accounts.                                        |
|                   | 3. Trigger aggregate calculation worker and query `/campuses/:id/heatmap`.                       |
|                   | 4. Submit 2 additional readings from a 3rd distinct account (total 5 readings across 3 devices).|
|                   | 5. Re-run aggregate calculation and re-query endpoint.                                           |
| Expected Pass     | Step 3 returns status `INSUFFICIENT_DATA`. Step 5 returns valid status (e.g., `GOOD`).           |
| Failure Condition | Step 3 reveals calculated median or color status with only 3 samples.                            |
+-------------------+--------------------------------------------------------------------------------------------------+

+-------------------+--------------------------------------------------------------------------------------------------+
| TEST-SEC-11       | Prohibited Terminology & Neutral Diagnostic Compliance Audit                                     |
+-------------------+--------------------------------------------------------------------------------------------------+
| Category          | Diagnostic Neutrality (CC-PRIV-07)                                                               |
| Target Component  | Web Dashboard, Android App, API Error Messages, Database Seeds                                   |
| Objective         | Ensure no code or documentation asserts the presence of "jammers" or intentional attacks.        |
| Test Procedure    | 1. Execute automated CI regex scanner across all repositories for words: `jammer`, `sabotage`,   |
|                   |    `interference attack`, `hostile signal`.                                                      |
| Expected Pass     | Zero matches in application UI copy, API messages, and user-facing documentation.                |
| Failure Condition | Any UI element or API response claims a jammer or intentional attack has occurred.              |
+-------------------+--------------------------------------------------------------------------------------------------+
```

---

## 4. CI/CD Security Quality Gates

The deployment pipeline enforces automated security gates. If any gate fails, the deployment is aborted immediately and security incident notifications are dispatched to the development team.

```text
Pipeline Stage: PRE-BUILD
  ├── Gate 1: Gitleaks Scan (Pass = 0 detected keys/tokens)
  └── Gate 2: Privacy Manifest & Permission Audit (Pass = 0 banned permissions declared)

Pipeline Stage: BUILD & SAST
  ├── Gate 3: npm audit (Pass = 0 High/Critical CVEs)
  ├── Gate 4: Gradle dependencyCheck (Pass = 0 High/Critical CVEs)
  ├── Gate 5: Semgrep Security Scan (Pass = 0 High/Critical findings)
  └── Gate 6: ESLint & Detekt Security Rules (Pass = 0 security rule violations)

Pipeline Stage: INTEGRATION & UNIT TEST
  ├── Gate 7: Automated Security Unit & BOLA Tests (Pass = 100% test pass rate)
  └── Gate 8: Ingestion Schema Strictness Validation (Pass = 100% negative tests pass)

Pipeline Stage: STAGING DAST & MOBILE SCAN
  ├── Gate 9: OWASP ZAP API Security Scan (Pass = 0 High/Critical alerts)
  └── Gate 10: MobSF Static & Dynamic Android Scan (Pass = Security Score >= 85)
```

---

## 5. Security Test Sign-off Checklist

Before transitioning from Phase 0 / Phase 1 into code implementation and pilot deployment, each item in this checklist must be signed off by the engineering and security leads:

- [ ] All 11 core security tests in the test matrix have automated test cases implemented.
- [ ] Gitleaks pre-commit hooks configured on all developer workstations.
- [ ] Dependency scanning integrated into CI pipeline with automated failure on CVSS $\ge 7.0$.
- [ ] Android Network Security Config verified on physical test devices running Android 10, 13, and 15.
- [ ] Database migrations tested with PostgreSQL Row-Level Security enabled.
- [ ] Centralized error-handling middleware confirmed to redact internal stack traces in production mode.
- [ ] Automated regex search confirmed zero occurrences of "jammer" or non-neutral diagnostic claims.
- [ ] Institutional approval secured for privacy notice and OIDC identity provider integration.
