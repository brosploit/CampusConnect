# Campus Connect — Web Dashboard Security Architecture & Verification

## 1. Executive Summary & Security Objectives

The Campus Connect Web Dashboard is built using React 18, TypeScript, Tailwind CSS, and Vite. It serves as the institutional visualization and administration interface for campus connectivity. It is engineered with a strict security-first and privacy-first methodology:
- **Zero Local Credential Storage:** Authentication tokens and session secrets are never stored in browser `localStorage` or `sessionStorage`.
- **Server-Managed Cookie Sessions:** Access and refresh tokens are conveyed via `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- **Double-Submit Anti-CSRF Protection:** State-changing browser operations (`POST`, `PUT`, `PATCH`, `DELETE`) require synchronized `X-CSRF-Token` header verification.
- **Contextual Output Encoding & XSS Prevention:** Untrusted content is rendered exclusively through React text node interpolation and `<SafeText />`. Raw HTML and `dangerouslySetInnerHTML` are completely prohibited.
- **Multi-Tiered Access Control:** Role-aware interfaces for Students, Moderators, and Administrators. Client-side route hiding is backed by server-side object-level and function-level authorization.
- **K-Anonymity & Privacy Protection:** Campus zones with fewer than the configured minimum sample threshold (e.g., 5 independent observations) are masked as `INSUFFICIENT_DATA`, preventing re-identification via differential queries.
- **Neutral Diagnostic Reporting:** Diagnostic findings are strictly factual. The interface never speculates or claims mobile network jammer presence.

---

## 2. Threat Mitigation & Security Controls

| Threat Vector | Potential Attack | Campus Connect Web Security Control | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Cross-Site Scripting (XSS)** | Malicious student injects script tag into issue report or zone name to hijack administrator sessions. | React text node rendering; `<SafeText />` utility; Content Security Policy Level 3 (`script-src 'self'`). Zero `dangerouslySetInnerHTML` or `eval()`. | `src/test/xss_prevention.test.tsx` (tests `<script>`, `<img onerror>`, `javascript:` pseudo-protocols). |
| **Cross-Site Request Forgery (CSRF)** | Attacker lures authenticated administrator to malicious site that triggers state-changing actions using ambient cookies. | SameSite=Strict cookies + Double Submit CSRF token. `apiClient` automatically injects `X-CSRF-Token` header for state-changing HTTP methods. | `src/test/csrf_protection.test.ts` (verifies header attachment on POST/PATCH/DELETE and exclusion on GET). |
| **Token Theft via LocalStorage** | Compromised 3rd-party script or XSS reading `localStorage.getItem('token')`. | Tokens are stored exclusively in HttpOnly cookies unreachable by JavaScript. In-memory state holds only user profile metadata and CSRF token. | `src/test/credential_storage.test.ts` (asserts zero tokens in localStorage/sessionStorage). |
| **Broken Object-Level Authorisation (BOLA / IDOR)** | Student modifies issue ticket ID in URL or API request to view or edit other students' tickets. | Client prevents unauthorized UI interactions; backend verifies `issue.reporter_id == req.user.sub` or `req.user.role in ['moderator', 'admin']`. | `src/test/access_control.test.tsx` & backend `objectAuth.ts`. |
| **Broken Function-Level Authorisation (BFLA)** | Student navigates directly to `/admin` or `/moderator` routes. | `ProtectedRoute` inspects user role; renders HTTP 403 Access Denied screen instead of mounting administrative components. Server enforces RBAC on all admin endpoints. | `src/test/access_control.test.tsx` (verifies 403 rendering and navigation redirection). |
| **Re-Identification via Differential Querying** | Attacker queries sparse zone to infer movement or habits of a specific student. | K-anonymity minimum sample threshold (min 5 observations). Zones under threshold suppress latency and speed metrics as `INSUFFICIENT_DATA`. | `src/test/privacy_threshold.test.ts` (tests metric suppression on sparse zones). |
| **Sensitive Server Error Exposure** | Backend 500 error exposes database schema, PostgreSQL syntax errors, or stack traces. | `apiClient` sanitizes error responses. Raw SQL and stack trace keywords are intercepted and replaced with safe user-facing notices. | `src/test/error_sanitization.test.ts` (tests error redaction and masking). |

---

## 3. Production Security Headers & Hosting Configuration

Configured in `frontend/nginx.conf` and `frontend/index.html`:

```http
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' https://api.campusconnect.edu; font-src 'self'; object-src 'none'; media-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
```

### Content Security Policy Directives Explained
- `default-src 'none'`: Secure default deny for all resource types.
- `script-src 'self'`: Disallows external scripts, CDNs, inline scripts, and `eval()`.
- `style-src 'self' 'unsafe-inline'`: Allows application stylesheets and Tailwind utilities.
- `img-src 'self' data: https://*.tile.openstreetmap.org`: Restricts images to local assets and trusted OpenStreetMap campus map tiles.
- `connect-src 'self' https://api.campusconnect.edu`: Restricts XMLHttpRequest and Fetch to the production API origin.
- `frame-ancestors 'none'`: Prevents clickjacking by blocking embedding in `<frame>`, `<iframe>`, `<embed>`, or `<object>`.
- `base-uri 'self'` and `form-action 'self'`: Prevents base-tag hijacking and form-action redirections.

---

## 4. Role-Aware Access Control Architecture

| Feature / View | Student Role | Moderator Role | Administrator Role | Enforcement Level |
| :--- | :---: | :---: | :---: | :--- |
| **Campus Overview (`/`)** | Read Aggregates | Read Aggregates | Read Aggregates | Public / Role-aware |
| **Zone Details (`/zones/:id`)** | Read Aggregates (if $\ge 5$ samples) | Read Aggregates | Read Aggregates | K-Anonymity Guard |
| **Submit Trouble Ticket (`/report`)** | Create Own Ticket | Create Own Ticket | Create Own Ticket | Authenticated Session |
| **Moderator Triage Queue (`/moderator`)** | **DENIED (403)** | Read & Update Status | Read & Update Status | Client Guard + Backend RBAC |
| **Admin Console (`/admin`)** | **DENIED (403)** | **DENIED (403)** | Full Control & Threshold Config | Client Guard + Backend RBAC |
| **Privacy Threshold Adjustment** | **DENIED** | **DENIED** | Configure per-zone thresholds | Admin RBAC Only |

---

## 5. Security Test Suite Matrix

The frontend security test suite is located in `frontend/src/test/`:

1. `xss_prevention.test.tsx`:
   - Verifies that `<script>`, `<img onerror>`, and `javascript:` pseudo-protocols render as harmless text nodes without DOM script creation or attribute evaluation.
2. `csrf_protection.test.ts`:
   - Verifies that `X-CSRF-Token` is attached to all `POST`, `PUT`, `PATCH`, and `DELETE` requests.
   - Verifies that `GET` requests omit the CSRF token.
   - Verifies that `credentials: 'include'` is set on every call.
3. `access_control.test.tsx`:
   - Verifies redirection to `/login` for unauthenticated visitors.
   - Verifies that students receive an explicit `HTTP 403 Access Denied` UI when attempting to access `/admin` or `/moderator`.
   - Verifies that administrators successfully render protected administrative components.
4. `privacy_threshold.test.ts`:
   - Verifies that campus zones with fewer than the minimum sample threshold (5 observations) suppress metrics and output `INSUFFICIENT_DATA`.
5. `credential_storage.test.ts`:
   - Verifies that `localStorage` and `sessionStorage` remain strictly free of tokens, credentials, or session cookies.
6. `error_sanitization.test.ts`:
   - Verifies that raw PostgreSQL syntax errors and server stack traces are sanitized into generic user-friendly messages.
