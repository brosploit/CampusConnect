# Campus Connect — Production Deployment & Hardening Plan

**Classification:** Institutional Engineering Standard  
**Target Environment:** College Campus Enterprise Deployment  
**Status:** Pre-Deployment Approval Stage (Pending Institutional Sign-Off)  

---

## 1. Multi-Environment Architecture & Separation

To ensure security, reliability, and isolation, Campus Connect operates across four strictly segregated environments. **Production credentials, tokens, and database instances are never reused in non-production environments.**

| Environment | Purpose | Ingress Domain | Database Engine | Secrets Store | Network Isolation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Local Dev** | Rapid feature prototyping | `localhost:3000` / `4000` | Local Docker PostgreSQL / Memory DB | Local `.env` (gitignored) | Isolated bridge |
| **Testing** | CI/CD automated test runner | Ephemeral runner | Ephemeral isolated PostgreSQL | GitHub Actions Secrets | Air-gapped CI runner |
| **Staging** | Pre-release security testing & QA | `staging.campusconnect.edu` | Isolated Staging RDS / Docker DB | Cloud Vault (Staging partition) | Staging VPC |
| **Production** | Live campus student & admin traffic | `dashboard.campusconnect.edu` | High-Availability Managed PostgreSQL | Cloud Vault / AWS Secrets Manager | Production VPC (Air-Gapped DB) |

---

## 2. Secrets Management & Rotation Strategy

### Architecture & Storage Rules
1. **Zero Secret Check-In:** No credentials, API secrets, or certificates are committed to source control. Enforced via `.gitignore`, pre-commit hooks, and CI/CD secret scanning (Gitleaks).
2. **Environment Isolation:** Secrets are namespaced per environment (`CAMPUSCONNECT_PROD_*` vs `CAMPUSCONNECT_STAGING_*`).
3. **No Private Secrets in Frontend:** The frontend is a static bundle. It contains zero private API keys, database credentials, or cookie signing secrets. `import.meta.env` exposes only non-sensitive configuration (`VITE_API_BASE_URL`).

### Credential Rotation Schedule
| Credential Type | Rotation Frequency | Rotation Mechanism | Impact on Active Sessions |
| :--- | :---: | :--- | :--- |
| **JWT Access Secret** | Every 90 days | Blue/Green key roll (accepts new & previous for 1h) | Automatic refresh on next request |
| **JWT Refresh Secret** | Every 90 days | Re-issue refresh tokens | Forces re-login upon refresh failure |
| **Cookie & CSRF Secret** | Every 180 days | Update server environment | Transparent to browser cookie store |
| **Runtime Database User** | Every 180 days | Zero-downtime DB user password rotation | None (connection pool handles reconnect) |
| **TLS/SSL Certificates** | Every 60 days | Let's Encrypt automated ACME certbot | None |

### Emergency Revocation Procedure
If any secret is suspected of exposure:
1. Update secret in cloud vault (AWS Secrets Manager / HashiCorp Vault).
2. Trigger rolling restart of backend container cluster:
   ```bash
   docker compose -f docker-compose.production.yml up -d --no-deps backend-api
   ```
3. Run emergency refresh token purge:
   ```sql
   UPDATE refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;
   ```

---

## 3. Infrastructure & Network Topology

```
Public Internet / Campus Wi-Fi
           │
           │ HTTPS (Port 443 - TLS 1.3 only)
           ▼
┌──────────────────────────────────────────────────────────┐
│  Reverse Proxy / Gateway (Nginx / Cloudflare WAF)       │
│  - HSTS (2 years + preload), CSP Level 3, Frameguard     │
│  - DDoS Rate-Limiting & Bot Mitigation                   │
└──────────────┬────────────────────────────┬──────────────┘
               │                            │
   Internal Proxy (Port 80)     Internal Proxy (Port 4000)
               ▼                            ▼
┌────────────────────────────┐ ┌────────────────────────────┐
│ Web Dashboard Container    │ │ Backend API Container      │
│ (Static Assets / Nginx)    │ │ (Node.js 22 - Non-Root)    │
│ - Read-Only Filesystem     │ │ - Memory & CPU Caps        │
│ - Security Headers         │ │ - Request Size Limit 100KB │
└────────────────────────────┘ └────────────┬───────────────┘
                                            │
               Internal Air-Gapped Network  │ (Port 5432 - No Public Access)
                                            ▼
                               ┌────────────────────────────┐
                               │ PostgreSQL Database Engine │
                               │ - Least-Privilege Roles    │
                               │ - Row-Level Security (RLS) │
                               │ - Encrypted Storage Volume │
                               └────────────────────────────┘
```

### Network Security & Firewall Rules
1. **Air-Gapped Database Network:** PostgreSQL port `5432` is not mapped to the host. It resides on the internal Docker network `database_net`, reachable exclusively by `backend-api`.
2. **Reverse Proxy Enforcement:** Direct connections to port `4000` (Node.js API) from external clients are blocked by firewall rules. All traffic must transit the Nginx reverse proxy.
3. **Database Role Privileges:**
   - `cc_migration_user`: Possesses DDL privileges (table creation, schema alteration). Used strictly during deployment migration steps.
   - `cc_api_user`: Possesses DML privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Prohibited from dropping tables or altering schemas.

---

## 4. Data Protection & Privacy Governance

1. **Encryption in Transit:** Strict TLS 1.2 and 1.3 with ECDHE ciphers enforced across all HTTP traffic. Cleartext HTTP (port 80) returns 301 redirects to HTTPS.
2. **Encryption at Rest:**
   - PostgreSQL storage volumes encrypted at the operating system / block storage layer (e.g. AWS EBS encryption / dm-crypt LUKS).
   - MFA TOTP seeds field-level encrypted using AES-256-GCM.
   - Mobile tokens encrypted using hardware-backed Android Keystore.
3. **Automated Encrypted Backups:**
   - Backups executed daily via [backup.sh](file:///d:/BroSploit/Code/CampusConnect/infra/backup/backup.sh).
   - Encrypted with AES-256 prior to storage.
   - Backups older than 30 days automatically purged.
   - Verified restore drill script [restore.sh](file:///d:/BroSploit/Code/CampusConnect/infra/backup/restore.sh) periodically executed against an isolated test database.
4. **Data Retention & Anonymization Schedule:**
   - Raw observation readings (`readings` table): Retained for 90 days, then pruned or aggregated.
   - Zone aggregates (`zone_aggregates` table): Retained for 2 years for historical campus connectivity trend analysis.
   - Inactive user accounts: Soft-deleted after 365 days of inactivity; tokens permanently revoked.
