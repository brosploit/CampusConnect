# Campus Connect — Permanent Security Engineering Rules & Governance

**Scope:** Entire Campus Connect Lifecycle (Android, Web Dashboard, Backend API, Database, Background Workers, CI/CD, Infrastructure).  
**Effective Date:** Permanent / Mandatory.  
**Audience:** All software engineers, security architects, DevOps contributors, and automated AI agents.

---

## 1. Executive Mandate

Security, privacy, and architectural defensibility in Campus Connect are foundational operational requirements. The 18 permanent security engineering rules specified below must be rigorously enforced for all feature additions, refactoring, bug fixes, maintenance tasks, and deployment operations.

---

## 2. The 18 Permanent Security Engineering Rules

### Rule 1: Security is a core requirement, not an optional improvement
Security and privacy acceptance criteria carry equal weight with feature functionality. Code that delivers functionality while compromising security is considered broken and unacceptable for merge.

### Rule 2: Read relevant project and security documentation before making changes
Prior to modifying code or configuration, engineers and agents must inspect the project documentation:
- Architecture: [docs/ARCHITECTURE.md](file:///d:/BroSploit/Code/CampusConnect/docs/ARCHITECTURE.md)
- Privacy & Consent: [docs/PRIVACY_SECURITY.md](file:///d:/BroSploit/Code/CampusConnect/docs/PRIVACY_SECURITY.md)
- Threat Modeling: [docs/THREAT_MODEL.md](file:///d:/BroSploit/Code/CampusConnect/docs/THREAT_MODEL.md)
- Deployment Strategy: [docs/PRODUCTION_DEPLOYMENT_PLAN.md](file:///d:/BroSploit/Code/CampusConnect/docs/PRODUCTION_DEPLOYMENT_PLAN.md)
- Gate Review: [docs/DEPLOYMENT_GATE_REVIEW.md](file:///d:/BroSploit/Code/CampusConnect/docs/DEPLOYMENT_GATE_REVIEW.md)

### Rule 3: Never weaken an existing security control to make a feature easier to implement
Never circumvent security layers to speed up implementation or bypass test hurdles:
- Do not disable or loosen PostgreSQL Row-Level Security (RLS).
- Do not widen CORS to wildcard (`*`) or loosen SameSite/HttpOnly cookie attributes.
- Do not disable anti-CSRF token verification on state-changing API endpoints.
- Do not increase rate limits to mask inefficient client polling loops.

### Rule 4: Never hardcode secrets, credentials, private keys or production configuration
- Secrets, tokens, salts, and database connection strings must be supplied exclusively through environment variables or secure vault stores (e.g., AWS Secrets Manager, HashiCorp Vault).
- `backend/src/config/env.ts` must actively validate entropy and reject default/fallback secrets in production mode.
- Android code must store tokens only via hardware Keystore AES-256-GCM envelope encryption.

### Rule 5: Never trust client-side validation or client-supplied roles and ownership IDs
- All client inputs must be validated on the server using strict Zod schemas with finite length bounds, regex enforcement, and stripped unrecognized keys.
- Client requests must never specify their own `role`, `campusId`, or `userId` for authorization purposes; these values must be extracted exclusively from validated server-issued session tokens or secure cookies.

### Rule 6: Enforce authorization on the backend for every protected resource and action
- Every protected route must pass through authentication (`authenticateToken` / `authenticateCookie`) and role-based access control (`requireRole`).
- Every query, mutation, and resource retrieval must enforce object-level authorization (IDOR/BOLA defense) to ensure users can only access their own records or authorized campus data.

### Rule 7: Minimise collection and exposure of personal information
- Adhere strictly to the principle of data minimization.
- Absolute prohibition against collecting:
  - Hardware identifiers (IMEI, IMSI, SIM card ICCID, MAC address).
  - Phone numbers or telephony subscriber identities.
  - Precise GPS coordinates.
- Location is strictly represented through user-selected campus zones.

### Rule 8: Never add permissions or data collection without a documented product requirement
- Never declare sensitive Android permissions (`READ_PHONE_STATE`, `ACCESS_FINE_LOCATION`, `CAMERA`, `RECORD_AUDIO`, `READ_CONTACTS`, `RECEIVE_SMS`) without formal product architecture review and documented necessity.
- Background monitoring must remain off by default, require explicit informed consent, display a foreground notification with a Stop control, and terminate automatically after 30 minutes.

### Rule 9: Never expose private student data through public dashboards or analytics
- Public and cross-student aggregation endpoints must enforce **$k$-anonymity**:
  - Minimum of 5 observations from at least 3 distinct devices per zone window.
  - If thresholds are unmet, return `status: INSUFFICIENT_DATA`.
- Never expose individual student movement histories or individual device timelines.

### Rule 10: Never disable TLS validation, authentication or security middleware to fix a development issue
- Never introduce custom `TrustAllCertificates` or `ALLOW_ALL_HOSTNAME_VERIFIER` routines in Android or backend.
- Never bypass authentication middleware or comment out CSRF protection to resolve local testing friction.

### Rule 11: Never use real student data in development or testing
- Development, staging, and automated test environments must operate exclusively on synthetic, anonymized test fixtures.
- Production database dumps must never be restored into non-production environments without verified automated anonymization/pseudonymization pipelines.

### Rule 12: Add automated security tests for new authentication, authorization, data access and administrative functionality
- All new API routes, data models, and authentication logic must include automated integration tests covering:
  - Positive assertions (valid authorized requests).
  - Negative assertions (unauthenticated requests rejected with 401).
  - Authorization assertions (unauthorized roles rejected with 403; cross-user IDOR attempts rejected).
  - Boundary assertions (schema validation failures rejected with 400).

### Rule 13: Update threat models and security documentation when architecture changes
- Any change to network topology, authentication schemes, roles, or third-party integrations must be accompanied by an update to [docs/THREAT_MODEL.md](file:///d:/BroSploit/Code/CampusConnect/docs/THREAT_MODEL.md).

### Rule 14: Run relevant tests and dependency/security checks after modifications
- Following any code modification, run:
  - Backend: `npm test` and `npm audit`.
  - Frontend: `npm test` (`vitest run`), `npm run build`, and `npm audit`.
  - Android: `gradlew test` and lint checks.

### Rule 15: Report security trade-offs and unresolved risks honestly
- Never obscure security trade-offs, potential attack vectors, or deferred remediations.
- Document residual risks clearly in audit reports and PR summaries.

### Rule 16: Do not claim a security control is implemented unless the code and tests demonstrate it
- Never assert production readiness, encryption, or security compliance based on intentions or library inclusion alone.
- Verification requires inspecting the actual source code and executing automated test assertions that validate the control under adversarial conditions.

### Rule 17: Do not deploy to production without explicit approval
- Production deployment is gated by the formal [docs/DEPLOYMENT_GATE_REVIEW.md](file:///d:/BroSploit/Code/CampusConnect/docs/DEPLOYMENT_GATE_REVIEW.md).
- Automated CI/CD pipelines must pause at a protected manual approval gate; no production action may be executed without explicit college leadership and human operator sign-off.

### Rule 18: If a requested feature creates a security or privacy risk, explain it and propose a safer design before implementation
- If a user or feature request would introduce an insecure design (e.g., GPS tracking, client-side moderation filters, cleartext fallback storage), the engineer or agent must explicitly flag the risk, explain why it violates security/privacy invariants, and propose an alternative compliant design before writing code.

---

## 3. Mandatory Task Completion Reporting Template

At the conclusion of every implementation, refactor, bug fix, or deployment task, the agent or engineer **MUST** provide the following standardized report:

```markdown
### Task Completion Report

- **Files changed:** [List of modified and created files with file:/// links]
- **Security controls affected:** [Authentication, Authorization/RBAC, Input Validation, Encryption, Rate Limiting, Audit Logging, etc.]
- **Tests executed:** [Commands and test suites executed]
- **Test results:** [Exact test pass/fail metrics]
- **New dependencies:** [Any added packages, or "None"]
- **New permissions or data collected:** [Any new Android/API permissions or data fields, or "None"]
- **Remaining risks:** [Any unmitigated risks or edge cases, or "None"]
- **Whether a security review is required:** [Yes / No, with justification]
```
