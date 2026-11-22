# Campus Connect — Privacy and Security

## 1. Purpose

Campus Connect collects voluntary network-performance observations associated with broad campus zones. It helps students and campus teams understand patterns in measured connectivity. It does not monitor students' general phone activity and does not determine why a network problem occurred.

Privacy and security are product requirements, not optional deployment enhancements.

## 2. Data minimization

### Data needed for the core product
- Broad campus zone selected by the user.
- Measurement timestamp.
- Download speed and latency, when measured.
- Network type (Wi-Fi/mobile/other).
- Measurement source (app test, manual, imported, or demo).
- Optional app/platform version for troubleshooting.
- Optional Android network context where available and permitted.
- A random app-generated identifier only if needed for deduplication or privacy-safe contributor counting.

### Do not collect for the MVP
- IMEI, IMSI, SIM serial number, or phone number.
- SMS, contacts, call logs, call content, or browsing history.
- Precise GPS or continuous location history.
- Advertising ID or unrelated cross-app identifiers.
- Personal files, photos, or microphone/audio.
- Raw cell identifiers or sensitive radio-network identifiers.

If a future feature appears to require a new data field or permission, document the purpose, necessity, retention, user disclosure, and alternatives before implementation.

## 3. Location model

Use manual campus-zone selection for the MVP. The selected zone should be broad enough to avoid identifying a student's exact position. Do not require GPS for ordinary readings.

If precise or background location is ever proposed, treat it as a new product/privacy decision requiring a separate justification, consent flow, platform-policy review, and institutional approval. It is not part of this specification.

## 4. Monitoring consent

Automatic monitoring is optional and disabled by default.

Before a session starts, show:
- what observations will be collected,
- why they are collected,
- which campus zone is associated with the session,
- the maximum session duration,
- whether mobile data/battery may be used,
- how to stop immediately,
- where the privacy notice and deletion controls are located.

Requirements:
1. Explicit user action starts each session.
2. Show a clear active-session indicator and Stop control.
3. Enforce a server-side maximum duration.
4. Stop callbacks immediately when the user stops or the session expires.
5. Do not silently restart monitoring after process death, reboot, or app restart.
6. Do not collect continuously in the background by default.
7. Record the consent notice version and consent timestamp.

WorkManager may upload saved records later; it should not be misrepresented as a precise continuous monitoring scheduler.

## 5. Android permissions

Request the smallest permission set needed for the exact feature.

Likely baseline:
- `INTERNET` for API calls and tests.
- `ACCESS_NETWORK_STATE` for connectivity state.
- `READ_PHONE_STATE` only if selected Telephony APIs require it.

Some telephony/cell-information APIs have additional runtime permission requirements that vary by API and Android version. Verify the exact Android reference for every API before adding permissions. If permission is denied, continue with the measurements that remain available and clearly mark other fields unavailable.

Do not add background location, SMS, contacts, call-log, phone-number, or hardware-identifier permissions for the MVP.

## 6. Identity and account model

Choose authenticated or anonymous contribution mode before launch.

If accounts are used:
- Use a trusted identity provider.
- Verify tokens server-side.
- Store only the app-specific user profile and role.
- Do not trust a client-supplied user ID or role.
- Support account deletion and data export where applicable.

If anonymous contributions are chosen:
- Document abuse controls and limitations.
- Do not pretend anonymous data can be tied to a verified student.
- Use rate limits and validation to reduce spam.
- Explain what deletion can and cannot mean for de-identified aggregate data.

## 7. Data access and visibility

| Data | Student | Campus viewer | Campus admin | System admin |
|---|---|---|---|---|
| Own reading history | Own only | No | Only if explicitly authorized | Restricted support access |
| Other users' raw readings | No | No | No by default | Restricted, audited |
| Zone aggregates | Yes | Yes | Yes | Yes |
| Issue report details | Own report/status | No | Yes, scoped | As needed, audited |
| Account/security settings | Own | No | No | Authorized administration |

Public or general dashboard endpoints must return aggregate data only. Apply minimum sample thresholds so a small cohort cannot reveal an individual contributor's activity.

## 8. Secure data handling

- Use HTTPS/TLS for all deployed API traffic.
- Store secrets in environment/secret management, never in Git or client apps.
- Keep database credentials and service-role keys server-side.
- Use least-privilege database roles.
- Apply row-level security or equivalent authorization.
- Validate all input on the server.
- Rate-limit reading and report submission.
- Restrict upload size and batch size.
- Use parameterized queries or a safe ORM.
- Redact tokens, identifiers, and user content from logs.
- Encrypt backups and restrict backup access.
- Keep development, staging, and production data separate.

## 9. Retention and deletion

Before a live pilot, set explicit retention periods for:
- raw readings,
- optional network context,
- issue reports,
- monitoring session metadata,
- audit logs,
- aggregate summaries.

Define a deletion workflow for account-linked raw data. Explain whether previously generated aggregates are retained, recomputed, or anonymized after deletion. Do not promise complete removal from backups before the backup lifecycle is defined.

## 10. Threat model and mitigations

| Threat | Mitigation |
|---|---|
| Fake or manipulated readings | Range checks, timestamp checks, rate limits, anomaly flags, sample diversity |
| Duplicate uploads | Stable reading UUID and idempotent API |
| Unauthorized raw-data access | Server authorization, database policies, aggregate-only public API |
| Admin account misuse | Least privilege, MFA where available, audit log |
| Secret leakage | Server-side secrets, secret scanning, rotation |
| API abuse | Rate limits, payload limits, validation, monitoring |
| Re-identification from small groups | Minimum sample threshold, suppress small cohorts |
| Misleading heatmap | Show units, time window, sample count, freshness, limitations |
| Unwanted monitoring | Off by default, explicit consent, visible session, stop/expiry |

## 11. Responsible interpretation

A failed internet test can result from many factors, including congestion, server failure, DNS/routing issues, captive portals, device settings, or network coverage. A no-service observation does not prove radio interference. Campus Connect must describe observations neutrally and refer suspected radio interference to authorized professionals for investigation.

## 12. Launch checklist

- [ ] Campus/institution approval obtained where required.
- [ ] Privacy notice reviewed and published.
- [ ] Exact data fields and permissions documented.
- [ ] Monitoring consent and stop flow tested.
- [ ] Retention and deletion rules approved.
- [ ] Authentication and role checks tested.
- [ ] Database policies tested with different roles.
- [ ] Public endpoints confirmed aggregate-only.
- [ ] Logs and backups checked for sensitive data.
- [ ] Incident contact and response process documented.
