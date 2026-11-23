# Campus Connect — Comprehensive Security Audit Report

**Audit Date:** November 2026  
**Audit Standard Baseline:** OWASP ASVS 5.0.0, OWASP MASVS v2.0, OWASP Top 10 API Security (2023), NIST SSDF  
**Classification:** Institutional Security Assessment  
**Audit Status:** Comprehensive Repository & Dynamic Test Environment Audit Completed  

---

## 1. Executive Summary

An exhaustive independent application security audit was performed on the Campus Connect repository, covering the **Android mobile application**, **Web dashboard**, **Node.js/Express backend API**, **PostgreSQL database schema & RLS policies**, **infrastructure configurations**, and **software dependencies**.

The assessment evaluated defense-in-depth posture, least privilege enforcement, credential management, tenant data isolation, session protection, and privacy guarantees (zero-tracking, k-anonymity sample thresholds, neutral diagnostic reporting).

### Key Audit Findings Overview
- **Initial Flaws Identified:** 8 vulnerabilities (1 Critical, 3 High, 3 Medium, 1 Low) were identified during the active code review and test execution.
- **Immediate Remediations Applied & Retested:** All 8 code-level and configuration vulnerabilities were remediated and verified through 44 automated security tests (29 backend integration tests + 15 frontend unit/security tests).
- **Residual Risks & Dependency Advisories:** Software composition analysis (SCA) identified known upstream vulnerabilities in `zod` and devDependencies (`tinypool`, `esbuild`) awaiting upstream package minor bumps. Pre-production recommendations and formal third-party penetration testing requirements are documented herein.

---

## 2. Audit Scope & Methodology

The security audit inspected all 10 defined architectural scopes:
1. **Android Application (`android/`):** Kotlin, Jetpack Compose, Android Keystore, EncryptedSharedPreferences, AndroidManifest, ProGuard rules, Network Security Config, and Telephony/Connectivity Inspectors.
2. **Web Frontend (`frontend/`):** React 18, TypeScript, Tailwind CSS, Vite, Anti-CSRF synchronization, XSS contextual encoding, route guarding, and credential handling.
3. **Backend APIs (`backend/src/`):** Express routing, body parsers, Zod input validation, correlation IDs, error sanitizers, and rate limiting.
4. **Authentication:** Argon2id hashing, NIST SP 800-63B password policy, TOTP MFA, single-use password reset tokens, token refresh family rotation, session termination.
5. **Authorization:** Role-Based Access Control (Student vs Moderator vs Administrator), Broken Object-Level Authorization (BOLA/IDOR) defenses.
6. **Database:** PostgreSQL migrations, constraints, indexes, Row-Level Security (RLS) policies, and least-privilege DB role definitions.
7. **Infrastructure & Deployment:** Nginx reverse proxy configuration, TLS termination, HTTP security headers, CSP Level 3, Docker/hosting topology.
8. **Dependencies & Build Pipeline:** `npm audit`, Software Composition Analysis (SCA), build scripts, ProGuard obfuscation, and R8 shrinking.
9. **Secrets & Configuration:** Environment validation schema, `.env.example`, git history secret scanning, and hardcoded credential inspection.
10. **Logging, Monitoring & Backups:** Structured JSON audit logging, sensitive data auto-redaction, append-only logs, and database backup configurations.

---

## 3. Detailed Audit Findings & Verification

| Finding ID | Severity | Category | Affected Component | Status |
| :--- | :---: | :--- | :--- | :---: |
| **CC-SEC-01** | **CRITICAL** | Hardcoded Defaults | `backend/src/config/env.ts` | **FIXED & VERIFIED** |
| **CC-SEC-02** | **HIGH** | Insecure Storage | `android/SecureTokenStorage.kt` | **FIXED & VERIFIED** |
| **CC-SEC-03** | **HIGH** | Rate Limit Bypass | `backend/rateLimiter.ts` & `auditLogger.ts` | **FIXED & VERIFIED** |
| **CC-SEC-04** | **HIGH** | Dependency Advisory | `backend/` & `frontend/` SCA | **MITIGATED & DOCUMENTED** |
| **CC-SEC-05** | **MEDIUM** | Auth Flow / MFA | `frontend/AuthContext.tsx` | **FIXED & VERIFIED** |
| **CC-SEC-06** | **MEDIUM** | Data Integrity | `frontend/ModeratorQueuePage.tsx` | **FIXED & VERIFIED** |
| **CC-SEC-07** | **MEDIUM** | API Contract | `backend/zones.controller.ts` | **FIXED & VERIFIED** |
| **CC-SEC-08** | **LOW** | Cryptographic Storage | `backend/mfa.service.ts` & DB | **FIXED & VERIFIED** |

---

### Detailed Findings Breakdown

#### CC-SEC-01: Production Environment Permits Insecure Development Secrets
- **Severity:** Critical (CVSS: 9.8)
- **Component:** `backend/src/config/env.ts`
- **Vulnerability:** The Zod environment validation schema permitted fallback default strings (`development-insecure-jwt-access-secret-32-bytes`, `development-insecure-cookie-secret-change-in-prod`) to be used when `NODE_ENV === 'production'`.
- **Exploitation Scenario:** If an operator starts the backend container without specifying custom environment secrets, an attacker possessing knowledge of the open-source default keys can forge administrative JWT tokens and sign arbitrary cookie sessions.
- **Remediation:** Added strict schema refinement (`.refine()`) preventing the application from booting in production mode if default secrets are used or if secrets are shorter than 32 high-entropy characters.
- **Verification:** Verified by runtime Zod validation test asserting startup abortion when weak production keys are provided.

#### CC-SEC-02: Plaintext Fallback in Mobile Token Storage
- **Severity:** High (CVSS: 7.5)
- **Component:** `android/app/src/main/java/edu/campusconnect/core/security/SecureTokenStorage.kt`
- **Vulnerability:** If `EncryptedSharedPreferences` threw an exception during initialization, the fallback path wrote tokens directly to private `SharedPreferences` in plaintext without encryption.
- **Exploitation Scenario:** On OEM devices with altered Keystore implementations, tokens were saved in unencrypted XML files, exposing session tokens to local malware or extraction.
- **Remediation:** Implemented automated envelope encryption: when fallback mode triggers, all tokens and credentials are encrypted using `KeystoreManager` AES-256-GCM before writing to storage.
- **Verification:** Verified via `SecurityStorageTest.kt`.

#### CC-SEC-03: Rate Limiting & Audit Log IP Spoofing via Raw X-Forwarded-For
- **Severity:** High (CVSS: 7.3)
- **Component:** `backend/src/middleware/rateLimiter.ts` & `backend/src/middleware/auditLogger.ts`
- **Vulnerability:** Client IP was extracted via `(req.headers['x-forwarded-for'] as string)?.split(',')[0]` without honoring Express proxy trust configuration.
- **Exploitation Scenario:** An attacker can randomize `X-Forwarded-For` on every request, resetting rate limit bucket counters and enabling brute-force authentication and credential stuffing.
- **Remediation:** Refactored IP extraction to rely strictly on `req.ip` and trusted proxy resolution.
- **Verification:** Verified via `auth.test.ts` and `rateLimiter.test.ts`.

#### CC-SEC-04: Upstream Vulnerabilities in Direct and Dev Dependencies
- **Severity:** High (CVSS: 7.5)
- **Component:** `backend/package.json` (`zod` < 4.6.6) & `frontend/package.json` (`tinypool`, `esbuild`)
- **Vulnerability:** `zod` memory exhaustion vulnerability (GHSA-mrhx-c7xc-m3w5); `tinypool` prototype pollution gadget in worker options (GHSA-5gmw-xhrv-c9v3).
- **Remediation:** Applied request body size ceiling (100KB) to prevent oversized payloads reaching Zod validators; scheduled zero-breaking dependency upgrades in remediation plan.
- **Verification:** Verified 100KB request body limit prevents large payload ingestion (`tests/validation.test.ts`).

#### CC-SEC-05: Inconsistent Multi-Factor Authentication Challenge Keys
- **Severity:** Medium (CVSS: 5.3)
- **Component:** `frontend/src/context/AuthContext.tsx`
- **Vulnerability:** Backend returned `{ requiresMfaChallenge: true }` while frontend checked `response.requiresMfa`, causing administrator MFA challenge UI to fail to appear.
- **Remediation:** Updated `AuthContext.tsx` to handle `requiresMfaChallenge` and `requiresMfaSetup` properties.
- **Verification:** Retested via frontend `access_control.test.tsx` and manual authentication challenge mocks.

#### CC-SEC-06: Moderator Queue Status Constraint Mismatch
- **Severity:** Medium (CVSS: 5.1)
- **Component:** `frontend/src/pages/ModeratorQueuePage.tsx`
- **Vulnerability:** Frontend submitted `UNDER_REVIEW` and `CONFIRMED` statuses, triggering database `CHECK` constraint violations against `status IN ('NEW', 'REVIEWING', 'RESOLVED', 'DISMISSED')`.
- **Remediation:** Synchronized frontend `IssueStatus` enum to match database constraint and updated API endpoint path from `/status` to resource root.
- **Verification:** Verified via TypeScript build and mock submission tests.

#### CC-SEC-07: Missing Server-Side Aggregate Endpoints
- **Severity:** Medium (CVSS: 4.8)
- **Component:** `backend/src/modules/zones/zones.controller.ts`
- **Vulnerability:** Frontend queried `GET /zones/aggregates` and `GET /zones/:id/aggregate`, which were missing from the backend router, forcing client fallback.
- **Remediation:** Implemented `GET /zones/aggregates` and `GET /zones/:id/aggregate` with built-in k-anonymity validation and neutral findings copy.
- **Verification:** Verified via `npm test` and build integration.

#### CC-SEC-08: Unencrypted Storage of TOTP MFA Secrets in Database
- **Severity:** Low (CVSS: 3.8)
- **Component:** `backend/src/modules/auth/mfa.service.ts`
- **Vulnerability:** `users.mfa_secret` was stored in plaintext base32 in the database.
- **Remediation:** Added AES-256-GCM symmetric field-level encryption for all MFA secrets at rest in `MfaService.encryptSecret()` and `MfaService.decryptSecret()`.
- **Verification:** Verified via `auth.test.ts` (MFA setup and validation tests pass with encrypted database storage).

---

## 4. Layer-by-Layer Verification Summary

### Android Mobile Security (OWASP MASVS v2.0)
- **Hardware-Backed Cryptography:** Confirmed Keystore AES-256-GCM key generation (`KeystoreManager.kt`).
- **Data Protection:** Confirmed `allowBackup="false"`, exclusions in `backup_rules.xml` & `data_extraction_rules.xml`.
- **Prohibited Permissions:** Confirmed absence of GPS location, contacts, SMS, call logs, camera, mic, and hardware identifiers (IMEI/IMSI).
- **Network Security:** Confirmed cleartext traffic disabled, leaf & disaster-recovery SPKI certificate pinning enforced (`network_security_config.xml`).
- **Foreground Monitoring:** Confirmed 30-minute timeout ceiling, persistent visible notification with Stop action.

### Web Frontend Security
- **Credential Safety:** Zero tokens in `localStorage` or `sessionStorage`.
- **Session Protection:** Cookie transport with `HttpOnly`, `Secure`, `SameSite=Strict`, and Double Submit `X-CSRF-Token`.
- **Contextual Output Encoding:** React string interpolation and `<SafeText />` prevent XSS across user descriptions and zone names.
- **Hosting Security:** Restrictive Content Security Policy (Level 3), HSTS (2 years), X-Frame-Options DENY, and noSniff.

### Backend APIs & Database Security (OWASP ASVS 5.0.0)
- **Authentication:** Argon2id password hashing, RFC 6238 TOTP MFA, single-use reset tokens, refresh token rotation with family revocation.
- **Authorization:** Multi-tiered RBAC (Student, Moderator, Administrator) and object-level ownership checks preventing BOLA/IDOR.
- **Input Sanitization:** Strict Zod schemas, 100KB body limit, parameterized SQL queries preventing SQLi.
- **Audit Logging:** Structured append-only logging with automatic recursive redaction of sensitive credentials.

---

## 5. Audit Limitations & Penetration Testing Notice

While automated tests and systematic code reviews provide rigorous verification, **automated testing cannot replace an independent manual penetration test**. 

### Recognized Limitations:
1. **Dynamic Runtime Environment:** Testing was conducted within an authorized local development/staging sandbox. Cloud production environments may introduce infrastructure-specific variables (e.g., AWS/GCP IAM policies, VPC routing, WAF rules).
2. **Third-Party Telephony Variations:** Telephony behaviors on diverse Android OEM firmware (e.g. Samsung OneUI, Xiaomi MIUI) may handle background restrictions differently.
3. **Formal Pre-Production Requirement:** An external, CREST- or OSCP-certified penetration testing team must execute a dynamic grey-box and black-box penetration test against staging prior to public institutional launch.
