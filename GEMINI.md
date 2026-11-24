# Campus Connect — Permanent Security Engineering Rules

> **MANDATORY POLICY:** These 18 rules apply to every future implementation, modification, refactor, bug fix, and deployment task across the entire Campus Connect development lifecycle.

---

## 1. The 18 Permanent Rules

1. **Security is a core requirement, not an optional improvement.**  
   Treat security and privacy controls with the same priority as core business logic.
2. **Read relevant project and security documentation before making changes.**  
   Always consult `docs/ARCHITECTURE.md`, `docs/PRIVACY_SECURITY.md`, `docs/THREAT_MODEL.md`, `docs/PRODUCTION_DEPLOYMENT_PLAN.md`, and `docs/PERMANENT_SECURITY_ENGINEERING_RULES.md` before altering code.
3. **Never weaken an existing security control to make a feature easier to implement.**  
   Workarounds, bypasses, or lax relaxations of controls (such as bypassing RLS, loosening rate limits, or widening CORS) are strictly forbidden.
4. **Never hardcode secrets, credentials, private keys, or production configuration.**  
   All credentials must reside in environment variables or managed secret vaults. Reject fallback defaults in production mode.
5. **Never trust client-side validation or client-supplied roles and ownership IDs.**  
   Validate all schemas on the server using Zod/equivalent. Derive ownership (`userId`, `role`, `campusId`) solely from authenticated session tokens or secure cookies.
6. **Enforce authorization on the backend for every protected resource and action.**  
   Verify role-based access control (RBAC) and object-level authorization (BOLA/IDOR defense) on every single endpoint.
7. **Minimise collection and exposure of personal information.**  
   Do not collect hardware identifiers (IMEI, IMSI, MAC), phone numbers, or precise GPS. Use manual campus zone selection.
8. **Never add permissions or data collection without a documented product requirement.**  
   Prohibit adding unneeded Android permissions (`READ_PHONE_STATE`, `ACCESS_FINE_LOCATION`, contacts, camera, SMS, microphone).
9. **Never expose private student data through public dashboards or analytics.**  
   Enforce $k$-anonymity: aggregated zone metrics must require $\ge 5$ observations across $\ge 3$ distinct devices before public display.
10. **Never disable TLS validation, authentication, or security middleware to fix a development issue.**  
    Never use trust-all certificate managers, disable CORS, remove CSRF middleware, or disable rate limiting.
11. **Never use real student data in development or testing.**  
    Use synthetic, anonymized test fixtures only.
12. **Add automated security tests for new authentication, authorization, data access, and administrative functionality.**  
    Every new endpoint or mutation must have accompanying unit/integration tests asserting positive, negative, and unauthorized access attempts.
13. **Update threat models and security documentation when architecture changes.**  
    Reflect changes immediately in `docs/THREAT_MODEL.md` and related architecture specifications.
14. **Run relevant tests and dependency/security checks after modifications.**  
    Execute backend integration tests (`npm test`), frontend tests (`vitest run`), linting, and vulnerability scans (`npm audit`).
15. **Report security trade-offs and unresolved risks honestly.**  
    Document edge cases, limitations, and potential vulnerabilities transparently.
16. **Do not claim a security control is implemented unless the code and tests demonstrate it.**  
    Claims must be backed by concrete code implementations and passing test assertions.
17. **Do not deploy to production without explicit approval.**  
    All production releases must pass the Deployment Gate Review and obtain formal human stakeholder sign-off.
18. **If a requested feature creates a security or privacy risk, explain it and propose a safer design before implementation.**  
    Proactively safeguard the user and institution against architectural security degradations.

---

## 2. Mandatory Task Completion Report

For **EVERY** completed task, the agent MUST include the following report in its response:

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
