# Campus Connect — System Architecture

## 1. Purpose and architecture principles

Campus Connect collects voluntary network-performance readings linked to broad campus zones, validates them, aggregates them over time, and visualizes the results as a campus connectivity heatmap.

The architecture follows these principles:
1. **Evidence over claims:** show measured values, sample counts, time windows, and limitations.
2. **Zone-based location:** use a campus zone selected by the contributor; precise GPS is not required for the MVP.
3. **Offline-first collection:** save a reading locally before attempting upload.
4. **Separate measurements:** distinguish cellular service, active network transport, internet reachability, latency, and throughput.
5. **Privacy by design:** aggregate public views and minimize personal/device data.
6. **Incremental delivery:** manual measurement and heatmap first; optional monitoring later.

Campus Connect is not a jammer detector and must not infer the cause of an outage from a failed reading.

## 2. System context

```text
+-----------------------+        +---------------------------+
| Android application   |        | Responsive web dashboard |
| Kotlin / Compose      |        | React / TypeScript        |
| - zone selector       |        | - campus map / heatmap    |
| - manual diagnostics  |        | - filters / zone details  |
| - local Room queue    |        | - issue/admin screens     |
| - optional monitoring|        |                           |
+-----------+-----------+        +-------------+-------------+
            | HTTPS / JSON                     |
            +----------------+-----------------+
                             |
                  +----------v-----------+
                  | Backend REST API     |
                  | Node.js / Express    |
                  | TypeScript           |
                  | - auth and roles     |
                  | - validation         |
                  | - ingestion          |
                  | - analytics          |
                  | - reports/admin      |
                  +----------+-----------+
                             |
                  +----------v-----------+
                  | PostgreSQL           |
                  | - campus/zone data   |
                  | - readings/tests     |
                  | - issue reports      |
                  | - aggregate snapshots|
                  +----------------------+
```

Authentication can be supplied by a managed provider such as Supabase Auth or an equivalent OIDC-compatible service. The API must verify tokens server-side. The Android and web clients must never contain database service-role credentials.

## 3. Major components

### 3.1 Android application
**Recommended stack:** Kotlin, Jetpack Compose, MVVM, Coroutines/Flow, Room, Retrofit/OkHttp, WorkManager, Hilt (optional).

Responsibilities:
- Present onboarding, privacy information, campus zones, diagnostics, history, and settings.
- Allow a user to manually run a network test.
- Capture available Android network/cellular context subject to OS permissions and device support.
- Persist readings locally before network upload.
- Synchronize pending records reliably.
- Support explicit, time-limited monitoring sessions in a later phase.

Suggested feature modules:
- `feature/zones`
- `feature/diagnostics`
- `feature/history`
- `feature/monitoring`
- `feature/reports`
- `feature/settings`

Core modules:
- `core/database`
- `core/network`
- `core/permissions`
- `core/common`
- `core/designsystem`

### 3.2 Web dashboard
**Recommended stack:** React, TypeScript, responsive CSS/Tailwind, Leaflet or another map library, and a chart library.

Responsibilities:
- Display a campus map with configured zones.
- Display aggregated readings and heatmap status.
- Filter by metric, time window, and network type.
- Show zone detail, sample count, median/range, and freshness.
- Accept issue reports.
- Provide protected administration screens.

The map should use broad campus-zone polygons or labelled areas. Do not plot contributors' precise positions.

### 3.3 Backend API
**Recommended stack:** Node.js, Express, TypeScript, PostgreSQL driver/ORM, runtime schema validation, and structured logging.

Responsibilities:
- Verify authentication and role permissions.
- Validate campus, zone, measurement units, timestamps, and payload shape.
- Enforce rate limits and payload limits.
- Accept single and batch readings.
- Deduplicate by client-generated measurement ID.
- Serve aggregate analytics and map data.
- Manage issue-report workflow and campus-zone configuration.
- Apply retention and deletion policies.

Suggested modules:
`auth`, `campuses`, `zones`, `readings`, `connectivity-tests`, `analytics`, `issues`, `admin`, `audit`.

### 3.4 Database
PostgreSQL is the recommended shared source of truth. Use versioned migrations, foreign keys, constraints, indexes, and row-level access policies where supported. Keep raw measurements separate from precomputed aggregate summaries.

## 4. Measurement model

A reading is a time-stamped observation, not a guarantee of future performance.

Core fields:
- `reading_id`: unique idempotency identifier.
- `zone_id`: broad campus zone selected by the user.
- `download_mbps`: measured or clearly labelled imported/sample throughput.
- `latency_ms`: measured round-trip delay.
- `network_type`: Wi-Fi, mobile, or other selected/observed transport.
- `created_at`: measurement time.
- Optional Android context: service state, signal value, radio/network technology, carrier label, Android/app version, and data freshness.

Do not assume that signal bars equal throughput. Do not treat a missing value as zero. Keep Wi-Fi and cellular readings distinguishable.

## 5. Collection and processing flow

1. User selects a campus zone.
2. App explains the measurement and obtains any required permissions.
3. App runs the selected measurement or records an explicitly labelled manual/imported value.
4. App validates units, range, timestamp, and selected network type.
5. App writes the record to Room.
6. If online, app sends the record to the API; otherwise it remains pending.
7. Backend validates the authenticated user, zone, payload, and idempotency key.
8. Backend persists the reading and related test metadata.
9. Analytics query or aggregation job calculates median/range and sample count by zone, metric, network type, and time window.
10. Web dashboard renders the aggregates and freshness/data-quality information.

## 6. Android connectivity observations

Use `ConnectivityManager` and `NetworkCallback` for network changes and `NetworkCapabilities` to inspect transport/capabilities. `NET_CAPABILITY_INTERNET` means the network is configured for internet use; `NET_CAPABILITY_VALIDATED` indicates Android has validated public internet access at that time. Neither is a guarantee that every endpoint will work.

Use Telephony APIs only where supported and permitted. Values can be unavailable or stale depending on Android version, device, SIM, carrier, and permission. Store availability/freshness metadata rather than fabricating a reading.

Callbacks must be unregistered when no longer needed. Keep callback work lightweight and move longer processing off the connectivity callback thread.

## 7. Offline synchronization

- Room is the local source for unsent readings.
- Assign each reading a stable UUID before upload.
- Track states such as `PENDING`, `UPLOADING`, `UPLOADED`, and `FAILED`.
- Upload through WorkManager when network constraints are met.
- Use exponential backoff for retryable failures.
- Treat duplicate IDs as idempotent success.
- Do not delete local data until the server acknowledges receipt and retention rules permit cleanup.

WorkManager is appropriate for deferrable upload/sync work. It is not a precise real-time scheduler for continuous radio monitoring. A periodic WorkManager interval has a 15-minute minimum and execution can be delayed by constraints and system optimization.

## 8. Optional monitoring architecture

Monitoring is a later, opt-in feature:
1. User reads an explanation and starts a session.
2. Backend creates a session with selected zone, consent version, start time, and maximum duration.
3. App registers the necessary network/telephony callbacks while the session is active.
4. App stores observations locally and periodically batches them.
5. User can stop immediately; the app unregisters callbacks and closes the session.
6. Sessions expire automatically if the app is terminated or the stop request is not received.

Do not silently restart monitoring after reboot or app restart. If screen-off continuous collection is later required, separately assess Android foreground-service types, notification requirements, Play policy, battery impact, and current OS restrictions before implementing it.

## 9. Analytics and aggregation

Aggregate by zone, time window, metric, and network type. Use medians/ranges rather than allowing one extreme reading to dominate. Expose:
- sample count,
- distinct contributor/device count where privacy-safe,
- median and range,
- time window,
- last updated time,
- data freshness,
- status/insufficient-data label.

Do not publish a confident zone status if sample volume is too small or stale. Thresholds should be calibrated using pilot data and documented.

## 10. Reliability, observability, and failure handling

Handle:
- no internet at submission time,
- backend outage,
- duplicate uploads,
- malformed or implausible values,
- unknown/deactivated zones,
- no SIM or unsupported telephony APIs,
- permission denial,
- captive portal,
- stale signal values,
- app process termination during a session.

Backend observability should include request IDs, structured logs with sensitive fields redacted, health checks, error-rate monitoring, and audit events for administrative actions.

## 11. Deployment topology

Development: local Android emulator/device, local web server, local API, local PostgreSQL.

Pilot/production: HTTPS reverse proxy or managed hosting, API service, managed PostgreSQL with backups, static web hosting, authentication provider, monitoring/alerts, and documented restore procedure.

Keep development, staging, and production credentials and databases separate.
