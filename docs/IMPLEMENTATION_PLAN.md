# Campus Connect — Implementation Plan

**Status:** Build specification  
**Product type:** Campus connectivity insight platform  
**Primary clients:** Android app and responsive web dashboard  
**Backend:** REST API and PostgreSQL  
**Initial deployment:** Controlled pilot at one college campus

## 1. Product intent

Campus Connect turns voluntary, time-stamped network measurements associated with broad campus zones into understandable zone-level connectivity insights. The initial concept emphasizes measured download speed, latency, reliability over repeated readings, a campus-zone map/heatmap, filters, reading details, and issue reporting.

The purpose is to make scattered observations easier to understand—not to promise perfect internet, replace a telecom provider, or guarantee future performance.

The Android implementation adds the selected product direction: manual diagnostics first, with optional, explicitly consented, temporary automatic monitoring as a later capability.

**Important limitation:** Campus Connect is not a jammer detector. A weak signal, failed speed test, or loss of internet access does not establish the cause. The product must not label an area as a confirmed jammer zone.

## 2. Scope and release boundaries

### Release 1 — usable MVP
- Campus and broad-zone directory.
- Manual submission of a measured reading.
- Download speed (Mbps), latency (ms), selected network type, timestamp.
- Optional available cellular/network context from Android.
- Validation of units, timestamps, missing values, and implausible entries.
- Reading history for the submitting user.
- Zone aggregation using median/range and sample count.
- Campus map/heatmap with zone detail.
- Filters by metric, time range, and network type.
- Issue report/flag for repeatedly poor connectivity.
- Honest empty, stale, insufficient-sample, and demo-data states.
- Offline-first Android record creation and later upload.

### Release 2 — controlled extension
- Optional time-limited monitoring sessions.
- Session-based network/cellular state observations.
- Improved carrier and time-of-day comparisons where sample sizes allow.
- Admin moderation and data-quality review.
- Export of aggregate reports.

### Explicitly out of scope initially
- Precise student location tracking.
- Continuous hidden background collection.
- Guaranteed best-network recommendations.
- Confirming or locating radio interference.
- Telecom network control or radio transmission.
- Individual public user/device histories.

## 3. Users and permissions

| Role | Capabilities |
|---|---|
| Student/contributor | Select zone, run a manual test, view zone summaries, view own history, submit issue report, control monitoring consent |
| Campus viewer | View approved aggregate heatmap and reports |
| Campus administrator | Manage zones, moderate issue reports, view aggregate analytics |
| System administrator | Manage deployment, access policies, retention and audit settings |

All authorization must be enforced by the backend, not merely by hiding frontend controls.

## 4. Recommended repository structure

```text
campus-connect/
├── README.md
├── IMPLEMENTATION_PLAN.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_DOCUMENTATION.md
│   ├── PRIVACY_SECURITY.md
│   └── DEVELOPMENT_ROADMAP.md
├── android/
│   ├── app/
│   ├── core/
│   │   ├── common/
│   │   ├── database/
│   │   ├── network/
│   │   ├── permissions/
│   │   └── designsystem/
│   ├── feature/
│   │   ├── dashboard/
│   │   ├── zones/
│   │   ├── diagnostics/
│   │   ├── history/
│   │   ├── monitoring/
│   │   ├── reports/
│   │   └── settings/
│   ├── data/
│   └── domain/
├── web/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── services/
│       └── types/
├── backend/
│   └── src/
│       ├── modules/
│       ├── middleware/
│       ├── database/
│       ├── config/
│       └── server.ts
├── database/
│   ├── migrations/
│   └── seeds/
└── infra/
    ├── docker/
    └── deployment/
```

Keep Android, web, backend, and database migrations in one repository initially so Antigravity can reason across shared API contracts. Separate repositories only if the team later needs independent release ownership.

## 5. Implementation sequence

### Step 0 — Confirm project inputs
- Confirm official campus name and approved broad zones.
- Decide whether students authenticate or contribute anonymously.
- Select hosting, authentication provider, and database hosting.
- Confirm whether the first web dashboard is student-only or public.
- Agree on data retention and institutional approval.
- Decide whether download tests use a controlled endpoint or a reputable third-party provider after reviewing its terms.

**Exit criteria:** decisions recorded in `DECISIONS_AND_OPEN_QUESTIONS.md`; no invented campus geography or live data.

### Step 1 — Repository and local development
- Create Android, web, backend, and database folders.
- Add `.gitignore`, `.env.example`, lint/format configuration, and README setup steps.
- Add local PostgreSQL and backend development configuration.
- Add CI checks for formatting, static analysis, and tests.
- Define shared API schemas before implementing both clients.

**Exit criteria:** all applications start locally; secrets are not committed; CI runs.

### Step 2 — Database and backend foundation
- Create migrations for campuses, buildings, zones, readings, tests, issue reports, and aggregate snapshots.
- Add health endpoint, structured logging, request IDs, authentication verification, role middleware, validation, and rate limits.
- Add zone-list and zone-detail endpoints.
- Add diagnostic ingestion with idempotency.

**Exit criteria:** valid test reading is persisted; invalid and duplicate submissions are handled predictably.

### Step 3 — Android manual diagnostic MVP
- Build Compose navigation and privacy/onboarding screen.
- Implement zone selection.
- Implement a manual test flow for download speed and latency.
- Record selected network type and timestamp.
- Add optional Android network/cellular context only where permitted and supported.
- Save the reading locally before attempting upload.
- Show the measurement source, units, time, and unavailable values clearly.

**Exit criteria:** user can create and retain a reading even when offline; no fabricated values.

### Step 4 — Offline synchronization
- Implement Room-backed pending queue.
- Upload queued readings when network constraints are met.
- Use unique measurement IDs and server idempotency.
- Add retry/backoff, permanent-failure state, and user-visible sync status.
- Preserve local records until server acknowledgement and retention policy allows cleanup.

**Exit criteria:** reconnecting does not lose or duplicate readings.

### Step 5 — Web heatmap and analytics
- Build responsive campus overview and zone map.
- Add one selected metric at a time, time filters, and network-type filters.
- Show sample count, last-updated time, median/range, and insufficient-data state.
- Clearly distinguish measured readings from demo/seed data.
- Add issue report submission and admin moderation.

**Exit criteria:** a viewer can select a zone and understand the metric, sample count, period, and data quality.

### Step 6 — Optional monitoring
- Monitoring is off by default.
- Explain what will be collected, why, and for how long.
- Require explicit start; show persistent in-app active state and stop control.
- Use permitted callbacks while the session is active.
- Apply a maximum session duration and automatic expiry.
- Store observations locally and upload later.
- Assess foreground-service requirements before supporting screen-off continuous monitoring.

**Exit criteria:** monitoring can be started, stopped, expired, and audited; no hidden or indefinite collection.

### Step 7 — Pilot and release readiness
- Test multiple phone models, Android versions, SIM configurations, carriers, and campus zones.
- Validate speed-test consistency and endpoint health.
- Check sample diversity and repeated-submission bias.
- Conduct privacy/security review and campus approval.
- Test backup/restore, rate limiting, access control, deletion, and incident response.
- Start with a small voluntary pilot before expanding.

**Exit criteria:** pilot report documents known limitations, data quality, operational readiness, and approval to proceed.

## 6. Core data flow

```text
Student chooses campus zone
          |
          v
Manual diagnostic / optional opted-in session
          |
          v
Validate measurement locally
          |
          v
Save to Room immediately
          |
    Internet available?
       /       \
     Yes        No
      |          |
      v          v
  Upload API   Pending queue
      |          |
      v          | when network returns
Server validation <----+
      |
      v
PostgreSQL raw records
      |
      v
Aggregation job / query
      |
      v
Zone heatmap and dashboard
```

## 7. Quality gates

- Every measurement has a unique ID and timestamp.
- Every speed/latency field has an explicit unit.
- Missing data is `null`/not measured, never zero by default.
- Every zone summary exposes sample count and time window.
- A zone with too few or stale readings is labelled insufficient/stale.
- Demo data is visibly labelled and never mixed silently with live data.
- Raw records are not exposed in public endpoints.
- Server validates every client-supplied field.
- Monitoring is opt-in, time-limited, and stoppable.
- No UI copy claims to detect or confirm jamming.

## 8. Definition of done

A feature is done only when its UI, API contract, database migration, validation, permission handling, error states, automated tests, and documentation are complete. A screen backed only by hard-coded sample values is a prototype, not a completed production feature.
