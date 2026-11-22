# Campus Connect — Database Schema

**Database:** PostgreSQL  
**Schema status:** Proposed logical schema for implementation. Confirm exact campus data, authentication provider, retention, and hosting before production migrations.

## 1. Design rules

- Use UUID primary keys for application entities.
- Store timestamps as `TIMESTAMPTZ` in UTC.
- Store speed in Mbps and latency in milliseconds.
- Use `NULL` for unavailable/not-measured values; never coerce missing readings to zero.
- Preserve the original measurement time and server receipt time.
- Use a stable client-generated `reading_id` for idempotent ingestion.
- Keep raw readings separate from aggregate summaries.
- Do not store IMEI, IMSI, phone number, or precise location.
- Public-facing endpoints should read aggregates, not raw contributor records.

## 2. Entity relationship overview

```text
campuses 1---N buildings 1---N zones
                         zones 1---N readings
                         zones 1---N issue_reports
readings 1---0..N connectivity_tests
users 1---N readings
users 1---N monitoring_sessions
monitoring_sessions 1---N readings (optional session link)
zones 1---N zone_aggregates
```

## 3. Tables

### 3.1 `campuses`
| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `slug` | TEXT | UNIQUE, NOT NULL |
| `description` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now |

### 3.2 `buildings`
| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `campus_id` | UUID | FK → campuses, NOT NULL |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Unique constraint: `(campus_id, name)`.

### 3.3 `zones`
| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `building_id` | UUID | FK → buildings, NULL if campus-wide |
| `campus_id` | UUID | FK → campuses, NOT NULL |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `map_geometry` | JSONB | NULL; broad zone polygon/shape only |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Use an explicit campus relationship even for zones without a building. Validate that building and zone campus IDs agree.

### 3.4 `users`
Authentication identity is managed by the selected auth provider. This table stores only app-specific profile/role data.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK; equals auth subject ID |
| `display_name` | TEXT | NULL; optional |
| `role` | TEXT | NOT NULL; constrained to `student`, `campus_viewer`, `campus_admin`, `system_admin` |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `deleted_at` | TIMESTAMPTZ | NULL |

Do not duplicate password hashes if a managed auth provider is used.

### 3.5 `readings`
One row represents one submitted network measurement.

| Column | Type | Rules |
|---|---|---|
| `reading_id` | UUID | PK; client-generated idempotency ID |
| `user_id` | UUID | FK → users, NULL only for approved anonymous mode |
| `zone_id` | UUID | FK → zones, NOT NULL |
| `network_type` | TEXT | NOT NULL; `WIFI`, `MOBILE`, `OTHER`, `UNKNOWN` |
| `download_mbps` | NUMERIC(10,3) | NULL; non-negative |
| `latency_ms` | NUMERIC(10,2) | NULL; non-negative |
| `reliability_score` | NUMERIC(5,2) | NULL; only if defined by a documented multi-reading method |
| `measurement_source` | TEXT | NOT NULL; `APP_TEST`, `MANUAL`, `IMPORTED`, `DEMO` |
| `test_endpoint_id` | TEXT | NULL; endpoint identifier, not secret |
| `client_measured_at` | TIMESTAMPTZ | NOT NULL |
| `received_at` | TIMESTAMPTZ | NOT NULL, server default now |
| `app_version` | TEXT | NULL |
| `platform_version` | TEXT | NULL |
| `validation_status` | TEXT | NOT NULL; e.g. `ACCEPTED`, `FLAGGED`, `REJECTED` |
| `validation_notes` | TEXT | NULL; avoid personal information |

For authenticated submissions, verify the user from the token. Do not trust a client-supplied `user_id`.

### 3.6 `reading_network_context`
Optional Android-derived context kept separate so the core speed/latency record remains portable.

| Column | Type | Rules |
|---|---|---|
| `reading_id` | UUID | PK/FK → readings |
| `service_state` | TEXT | NULL |
| `signal_dbm` | INTEGER | NULL |
| `radio_technology` | TEXT | NULL |
| `carrier_label` | TEXT | NULL; optional and normalized |
| `active_transport` | TEXT | NULL |
| `internet_capability` | BOOLEAN | NULL |
| `internet_validated` | BOOLEAN | NULL |
| `data_freshness` | TEXT | NULL; e.g. `FRESH`, `CACHED`, `UNKNOWN` |
| `android_api_level` | INTEGER | NULL |

Avoid collecting raw cell identifiers. Confirm Android permission/API requirements for each field before implementation.

### 3.7 `monitoring_sessions`
| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users, NOT NULL |
| `zone_id` | UUID | FK → zones, NOT NULL |
| `consent_version` | TEXT | NOT NULL |
| `consent_at` | TIMESTAMPTZ | NOT NULL |
| `started_at` | TIMESTAMPTZ | NOT NULL |
| `ended_at` | TIMESTAMPTZ | NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `status` | TEXT | `ACTIVE`, `STOPPED`, `EXPIRED` |

A session must have a maximum duration. The API must reject invalid or excessive durations.

### 3.8 `connectivity_tests`
Optional detailed test metadata, one-to-many if a reading contains separate test attempts.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `reading_id` | UUID | FK → readings, NOT NULL |
| `test_kind` | TEXT | `LATENCY`, `DOWNLOAD`, `UPLOAD` |
| `status` | TEXT | `SUCCESS`, `FAILED`, `SKIPPED` |
| `value` | NUMERIC(12,3) | NULL |
| `unit` | TEXT | NOT NULL |
| `endpoint_id` | TEXT | NULL |
| `started_at` | TIMESTAMPTZ | NOT NULL |
| `completed_at` | TIMESTAMPTZ | NULL |
| `failure_code` | TEXT | NULL |

### 3.9 `issue_reports`
| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users, NULL only if anonymous reports are approved |
| `zone_id` | UUID | FK → zones, NOT NULL |
| `category` | TEXT | NOT NULL |
| `description` | TEXT | NULL; length-limited |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `status` | TEXT | `NEW`, `REVIEWING`, `RESOLVED`, `DISMISSED` |
| `reviewed_by` | UUID | FK → users, NULL |
| `reviewed_at` | TIMESTAMPTZ | NULL |
| `admin_notes` | TEXT | NULL; access restricted |

### 3.10 `zone_aggregates`
Derived snapshots for dashboard performance. These rows are rebuildable from eligible raw readings.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `zone_id` | UUID | FK → zones, NOT NULL |
| `metric` | TEXT | NOT NULL |
| `network_type` | TEXT | NOT NULL |
| `window_start` | TIMESTAMPTZ | NOT NULL |
| `window_end` | TIMESTAMPTZ | NOT NULL |
| `sample_count` | INTEGER | NOT NULL |
| `distinct_contributor_count` | INTEGER | NULL; privacy-safe count |
| `median_value` | NUMERIC(12,3) | NULL |
| `minimum_value` | NUMERIC(12,3) | NULL |
| `maximum_value` | NUMERIC(12,3) | NULL |
| `status_label` | TEXT | NOT NULL |
| `calculated_at` | TIMESTAMPTZ | NOT NULL |

Unique constraint: `(zone_id, metric, network_type, window_start, window_end)`.

## 4. Indexes

Recommended initial indexes:
```sql
CREATE INDEX idx_zones_campus_active ON zones (campus_id, is_active);
CREATE INDEX idx_readings_zone_time ON readings (zone_id, client_measured_at DESC);
CREATE INDEX idx_readings_network_time ON readings (network_type, client_measured_at DESC);
CREATE INDEX idx_readings_received_at ON readings (received_at DESC);
CREATE INDEX idx_tests_reading ON connectivity_tests (reading_id);
CREATE INDEX idx_issues_zone_status ON issue_reports (zone_id, status, created_at DESC);
CREATE INDEX idx_aggregates_zone_window ON zone_aggregates (zone_id, window_end DESC);
```
The primary key on `reading_id` already enforces uniqueness and supports idempotency.

## 5. Validation and integrity

- Reject negative speed/latency values.
- Enforce reasonable payload sizes and timestamp bounds.
- Do not reject all unusual readings automatically; mark suspicious values for review.
- Ensure a zone is active and belongs to the selected campus.
- Ensure `window_end > window_start`.
- Ensure session readings reference a valid session owned by the authenticated user.
- Treat `reliability_score` as optional until its formula is defined; never infer reliability from one measurement.
- Keep demo/imported data visibly separated from live app measurements.

## 6. Privacy, retention, and access

- Public/student dashboard queries use aggregate tables or aggregate views only.
- Raw readings are restricted to authorized backend/admin workflows.
- Apply database row-level security or equivalent access policies.
- Avoid hardware identifiers and precise GPS.
- Define raw-reading, issue-report, audit-log, and aggregate retention periods before pilot.
- Provide a deletion/anonymization workflow for user-linked data.
- Do not expose small cohorts that could identify a contributor.

## 7. Migration order

1. campuses
2. buildings
3. zones
4. users/profile mapping
5. readings
6. reading_network_context
7. connectivity_tests
8. monitoring_sessions
9. issue_reports
10. zone_aggregates
11. indexes, constraints, and access policies

Use reversible migrations where practical and test migrations against an empty database and a staging copy.
