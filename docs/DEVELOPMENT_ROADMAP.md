# Campus Connect — Development Roadmap

This roadmap translates the campus connectivity heatmap concept into an incremental product. Dates are intentionally not fixed; estimate each phase after confirming team size, device availability, hosting, and campus approvals.

## Phase 0 — Product confirmation

**Objective:** Agree on what the first campus release actually measures.

Tasks:
- Confirm campus name, buildings, and broad zones.
- Confirm student, viewer, and administrator roles.
- Decide account-based or anonymous contributions.
- Choose the measurement endpoint/provider and verify terms.
- Decide whether the first dashboard is private or public.
- Confirm privacy notice, data retention, and institutional approvals.
- Finalize API fields and measurement units.

**Deliverables:** approved scope, zone list, decision log, measurement definitions.

**Exit criteria:** no unresolved decision blocks a safe MVP.

## Phase 1 — Foundation and architecture

**Objective:** Create a reproducible development environment.

Tasks:
- Create repository and project folders.
- Set up Android Kotlin/Compose project.
- Set up React/TypeScript web project.
- Set up Node/Express/TypeScript backend.
- Configure PostgreSQL and migrations.
- Add `.env.example`, linting, formatting, CI, and test commands.
- Implement API health endpoint and typed contracts.

**Deliverables:** runnable project skeleton, database connection, CI checks.

**Exit criteria:** each project starts locally and secrets are not committed.

## Phase 2 — Campus zones and manual reading capture

**Objective:** Make the core user journey work.

Tasks:
- Create campus/building/zone seed data from confirmed campus information.
- Implement zone selector.
- Implement manual speed/latency test flow.
- Capture network type and timestamp.
- Add optional supported Android connectivity context.
- Validate units and missing values.
- Save readings locally in Room.
- Build a result screen and personal history.

**Deliverables:** Android manual diagnostic flow and local history.

**Exit criteria:** a student can create a correctly labelled reading; offline readings survive app restart.

## Phase 3 — Backend ingestion and synchronization

**Objective:** Safely receive readings from Android.

Tasks:
- Implement authentication and authorization.
- Implement `POST /readings` and `POST /readings/batch`.
- Add server-side schema/range/timestamp/zone validation.
- Add idempotent reading IDs.
- Implement WorkManager-based deferred uploads.
- Add retry/backoff and sync status.
- Add structured logs and request IDs.

**Deliverables:** working offline-to-online synchronization.

**Exit criteria:** reconnecting uploads pending readings without loss or duplication.

## Phase 4 — Aggregation and heatmap

**Objective:** Turn readings into understandable campus insights.

Tasks:
- Calculate median/range and sample count per zone.
- Group by metric, network type, and time window.
- Add minimum sample thresholds.
- Build campus map and zone detail panel.
- Add metric/time/network filters.
- Show freshness, sample size, and data-quality labels.
- Clearly label demo/imported data.

**Deliverables:** responsive web dashboard and aggregate APIs.

**Exit criteria:** viewer can inspect a zone and understand what the data represents and how much data supports it.

## Phase 5 — Issue reporting and administration

**Objective:** Make recurring problems actionable without overclaiming.

Tasks:
- Add issue-report form and categories.
- Add report status workflow.
- Add protected campus admin screens.
- Add audit events for administrative changes.
- Add zone management and deactivate obsolete zones.
- Add aggregate report export if needed.

**Deliverables:** issue workflow and admin tools.

**Exit criteria:** reports can be reviewed and resolved by authorized users; student raw histories remain private.

## Phase 6 — Optional session-based monitoring

**Objective:** Collect a limited sequence of observations only when a user chooses it.

Tasks:
- Write monitoring-specific consent explanation.
- Add start/stop session controls.
- Add server-side session expiry.
- Register permitted network/telephony callbacks during the active session.
- Save observations locally.
- Batch upload after connectivity returns.
- Test process death, permission revocation, battery impact, and stop behavior.
- Review current Android foreground-service and platform policies before any screen-off continuous mode.

**Deliverables:** optional, visible, time-limited monitoring.

**Exit criteria:** no hidden monitoring; sessions stop on user action or expiry; data is uploaded safely.

## Phase 7 — Pilot, hardening, and release

**Objective:** Confirm the system works in real campus conditions.

Tasks:
- Pilot with a small voluntary group across selected zones.
- Test multiple devices, Android versions, SIMs, carriers, and network types.
- Check test endpoint reliability and measurement consistency.
- Evaluate sample bias and repeated submissions.
- Run security and privacy review.
- Test backup/restore and deletion workflows.
- Document limitations and support contacts.
- Gather student/campus IT feedback.

**Deliverables:** pilot findings, prioritized fixes, release-readiness decision.

**Exit criteria:** campus stakeholders approve expansion based on documented evidence.

## Suggested MVP milestone breakdown

| Milestone | Outcome |
|---|---|
| M1 | App, web, API, and database run locally |
| M2 | Campus zones are selectable |
| M3 | Manual reading can be recorded and saved offline |
| M4 | Backend accepts and deduplicates readings |
| M5 | Dashboard displays aggregate zone metrics |
| M6 | Filters, sample count, freshness, and issue reporting work |
| M7 | Pilot validation and privacy/security review complete |

## Release priorities

**Must have:** zone selection, measured/manual reading with source label, speed/latency units, timestamp, validation, offline save/upload, aggregate median/range/sample count, map/heatmap, honest empty states.

**Should have:** account history, issue reporting, admin moderation, export, richer data-quality indicators.

**Later:** optional monitoring, advanced time-of-day comparisons, carrier comparisons, anomaly flags.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Too few readings | Start with a small pilot; show sample count and insufficient-data state |
| Different device/test-server results | Record context; use consistent endpoint and documented methodology |
| Fake or duplicate data | Validate, rate-limit, deduplicate, flag outliers |
| No internet during submission | Local database and deferred upload |
| Misleading heatmap | Use median/range and disclose time window and limitations |
| Privacy concerns | Broad manual zones, minimum collection, aggregate-only views |
| Android API restrictions | Test on physical devices and handle unavailable values |
| Scope becomes too large | Finish manual diagnostics and heatmap before monitoring |

## Definition of MVP success

The MVP is successful when voluntary contributors can submit honest readings tied to broad campus zones, the system retains readings during connectivity loss, the backend validates and aggregates them, and a viewer can inspect zone-level patterns with sample counts and limitations clearly visible.
