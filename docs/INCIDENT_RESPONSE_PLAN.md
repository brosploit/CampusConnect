# Campus Connect — Security Incident Response Plan (IRP)

**Classification:** Institutional Security Operational Procedure  
**Effective Date:** November 2026  
**Audience:** Security Operations, Incident Commanders, System Administrators, Campus IT  

---

## 1. Incident Response Lifecycle Overview

The Campus Connect Incident Response Lifecycle follows **NIST SP 800-61 Rev. 2** (Computer Security Incident Handling Guide), structured across six distinct phases:
1. **Preparation:** Security tooling, audit logging, emergency credential stores, and communication channels.
2. **Detection & Analysis:** Alerting rules, audit log review, SIEM anomaly detection, and triage categorization.
3. **Containment:** Short-term isolation of affected hosts, sessions, or credentials to prevent spread.
4. **Eradication:** Removal of malicious artifacts, closing attack vectors, and revoking compromised keys.
5. **Recovery:** Restoring services from verified immutable backups, re-enabling access under rotation.
6. **Post-Incident Review:** Root-cause analysis (RCA), timeline documentation, and defense hardening.

---

## 2. Emergency Incident Response Playbooks

---

### Playbook 1: Leaked Secrets / API Credentials

#### Triggers
- Alert from automated secret scanner (e.g. GitGuardian, TruffleHog).
- Public disclosure of `.env` contents, database credentials, or JWT secrets.

#### Phase 1: Containment
1. **Revoke Compromised Credentials Immediately:**
   - In AWS Secrets Manager / Vault / Cloud Console, generate replacement secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, and `CSRF_SECRET`.
   - Update production environment secrets in the container orchestrator.
2. **Terminate Active Sessions:**
   - Restart backend instances with the new secrets. Because JWT signatures are verified using `JWT_ACCESS_SECRET`, updating the secret instantly renders all forged or stolen access tokens invalid.
   - Execute database query to revoke all active refresh tokens:
     ```sql
     UPDATE refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;
     ```

#### Phase 2: Investigation
- Inspect `audit_logs` for any administrative operations or data downloads executed using the leaked keys:
  ```sql
  SELECT * FROM audit_logs WHERE created_at >= NOW() - INTERVAL '48 hours' ORDER BY created_at DESC;
  ```
- Identify IP addresses and endpoints accessed during the window of exposure.

#### Phase 3: Recovery & Post-Mortem
- Re-run git history secret scrub via `git-filter-repo` or BFG if committed to git.
- Audit team members with access to the credential vault.

---

### Playbook 2: Compromised Administrator Account

#### Triggers
- Suspicious administrative actions logged outside normal operating hours.
- Sudden modification of user roles or mass zone deletions.
- Administrator reports unrecognized login or lost MFA device.

#### Phase 1: Containment
1. **Immediately Suspend Compromised Account:**
   - An authorized secondary administrator executes:
     ```bash
     curl -X PATCH https://api.campusconnect.edu/api/v1/admin/users/<compromised_user_id>/suspend \
          -H "Authorization: Bearer <sec_admin_token>" \
          -H "Content-Type: application/json" \
          -d '{"isSuspended": true, "reason": "Emergency security incident lock"}'
     ```
   - Suspending the user triggers immediate database revocation of all refresh tokens and invalidates the session.
2. **Force Global Admin Session Invalidation:**
   - If multiple accounts are suspected, execute:
     ```sql
     UPDATE users SET tokens_revoked_at = NOW() WHERE role = 'administrator';
     UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE role = 'administrator');
     ```

#### Phase 2: Investigation & Eradication
- Audit all actions performed by `actor_id = <compromised_user_id>` in `audit_logs`.
- Check for unauthorized secondary accounts created by the attacker.
- Reset the administrator's password and reset their MFA seed (`mfa_secret = NULL`, `mfa_enabled = false`).

#### Phase 3: Recovery
- Re-enroll administrator using out-of-band identity verification (in-person or video verification with campus IT).
- Issue new hardware security key (FIDO2/WebAuthn) or re-provision TOTP MFA.

---

### Playbook 3: Unauthorized Data Access or Exfiltration

#### Triggers
- Rate limiter spike alerts on `/api/v1/readings/mine` or `/api/v1/zones`.
- Student reporting unauthorized access to personal records.
- Excessive traffic egress from backend containers.

#### Phase 1: Containment
1. Block attacking IP addresses at reverse proxy / WAF level:
   ```nginx
   deny <attacker_ip>;
   ```
2. If BOLA vulnerability is actively being exploited, disable affected endpoint at Nginx gateway:
   ```nginx
   location /api/v1/vulnerable-endpoint { return 503; }
   ```

#### Phase 2: Investigation
- Determine the scope of exfiltrated data: Check audit logs for all access queries.
- Inspect whether individual student identifiers were exposed or only aggregate metrics.
- Confirm whether privacy guarantees (k-anonymity) prevented identification.

#### Phase 3: Notification & Compliance
- Notify Institutional Data Protection Officer (DPO) and Campus Legal Counsel within 24 hours.
- Prepare breach notification if personal identifying information was accessed.

---

### Playbook 4: Database Exposure / SQL Injection

#### Triggers
- Database monitoring alert: unusual query volume or full-table scans.
- Error handler alert: SQL syntax injection attempts detected in query params.

#### Phase 1: Containment
1. Immediately isolate database network: verify PostgreSQL accepts connections strictly from `backend_net` Docker network.
2. Rotate runtime database credentials (`cc_api_user` password).
3. If database is publicly reachable, terminate public ingress port immediately.

#### Phase 2: Eradication & Recovery
- Review parameterized query logs.
- Audit database schema for unauthorized modifications or backdoors.
- Restore from verified clean snapshot if data was corrupted or dropped.

---

### Playbook 5: Malicious Code Deployment / Supply Chain Compromise

#### Triggers
- Container vulnerability scanner flags malicious package.
- Unexpected outbound connections from backend containers.
- Unauthorized git commit on `main`.

#### Phase 1: Containment
1. Roll back cluster deployment to previous known-good image digest:
   ```bash
   docker compose -f docker-compose.production.yml rollback
   ```
2. Freeze CI/CD pipeline and revoke GitHub deployment tokens.

#### Phase 2: Eradication
- Identify corrupted dependency via `npm audit` / SCA.
- Audit git commit log and enforce multi-party signed commits.

---

### Playbook 6: Ransomware or Host Infrastructure Compromise

#### Triggers
- File encryption activity, unrecognized processes on VM host, inaccessible filesystems.

#### Phase 1: Containment
1. Sever network connectivity to infected host (disconnect virtual NIC).
2. Do NOT reboot or power off abruptly (preserve memory for forensic snapshot).

#### Phase 2: Recovery
1. Provision clean, fresh host instances from hardened infrastructure-as-code templates.
2. Restore database from offline, immutable, encrypted backup using [restore.sh](file:///d:/BroSploit/Code/CampusConnect/infra/backup/restore.sh).
3. Verify SHA-256 integrity checksums prior to restoring data.
4. Rotate all infrastructure keys, SSH keys, and cloud IAM credentials.

---

## 3. Communication Matrix & Escalation Protocol

| Role | Responsibility | Contact SLA |
| :--- | :--- | :---: |
| **Incident Commander** | Coordinates overall technical containment and recovery | Immediate (< 15 mins) |
| **Lead Security Architect** | Root cause analysis and code patch development | Immediate (< 30 mins) |
| **Campus IT Director** | Institutional coordination and operational approvals | < 1 hour |
| **Data Protection Officer (DPO)** | Regulatory reporting and privacy breach assessment | < 4 hours |
| **Campus Communications** | Student and staff public statements | < 12 hours |
