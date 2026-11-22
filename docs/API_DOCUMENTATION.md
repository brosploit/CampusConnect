# Campus Connect — REST API Documentation

**Base path:** `/api/v1`  
**Format:** JSON  
**Transport:** HTTPS in staging/production  
**Authentication:** Bearer access token for protected endpoints

This is the proposed API contract. Implementations should publish a matching OpenAPI 3 specification and generate or validate client types from it.

## 1. Conventions

### Headers
```http
Authorization: Bearer <access-token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <optional-client-request-id>
```

For endpoints that accept a single reading, `readingId` is the idempotency key. A repeated request with the same ID and same payload returns the existing accepted result rather than creating a duplicate.

### Timestamp format
Use ISO 8601 timestamps with timezone, stored as UTC by the server.

### Units
- Download/upload speed: Mbps.
- Latency: milliseconds.
- Signal strength: dBm when available.

### Null values
Use JSON `null` for values not measured or unavailable. Do not send zero to represent unknown.

## 2. Endpoint summary

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API health |
| GET | `/campuses` | Public or configured | List available campuses |
| GET | `/campuses/{campusId}/zones` | Public or configured | List campus zones |
| GET | `/zones/{zoneId}` | Public or configured | Zone details |
| POST | `/readings` | Student | Submit one reading |
| POST | `/readings/batch` | Student | Submit queued readings |
| GET | `/readings/mine` | Student | View own history |
| GET | `/campuses/{campusId}/heatmap` | Viewer | Aggregate heatmap |
| GET | `/zones/{zoneId}/analytics` | Viewer | Aggregate zone metrics |
| POST | `/monitoring/sessions` | Student | Start opted-in session |
| POST | `/monitoring/sessions/{sessionId}/stop` | Session owner | Stop session |
| POST | `/issues` | Student | Submit issue report |
| GET | `/admin/issues` | Campus admin | List reports |
| PATCH | `/admin/issues/{issueId}` | Campus admin | Update report status |
| POST | `/admin/zones` | Campus admin | Create zone |
| PATCH | `/admin/zones/{zoneId}` | Campus admin | Update zone |

## 3. Health

### `GET /health`
Response:
```json
{
  "status": "ok",
  "service": "campus-connect-api",
  "timestamp": "2026-11-22T12:00:00Z"
}
```
Do not expose secrets, database credentials, or internal infrastructure details.

## 4. Campus and zone endpoints

### `GET /campuses`
Returns active campuses available to the caller.

### `GET /campuses/{campusId}/zones`
Optional query: `active=true|false`.

Response:
```json
{
  "campusId": "uuid",
  "zones": [
    {
      "id": "zone-uuid",
      "name": "Library",
      "buildingName": "Library Building",
      "isActive": true
    }
  ]
}
```

### `GET /zones/{zoneId}`
Returns the approved zone description and broad map geometry if the caller is allowed to see it. Do not return contributor coordinates.

## 5. Submit a reading

### `POST /readings`
Role: authenticated student/contributor.

Request:
```json
{
  "readingId": "7d72c41e-9c7a-4a35-9c0f-9d19b7d5a1d2",
  "zoneId": "zone-uuid",
  "networkType": "MOBILE",
  "downloadMbps": 18.42,
  "latencyMs": 74.5,
  "measurementSource": "APP_TEST",
  "clientMeasuredAt": "2026-11-22T10:30:00Z",
  "appVersion": "1.0.0",
  "platformVersion": "Android 15",
  "networkContext": {
    "serviceState": "IN_SERVICE",
    "signalDbm": -103,
    "radioTechnology": "LTE",
    "carrierLabel": "Carrier label",
    "activeTransport": "CELLULAR",
    "internetCapability": true,
    "internetValidated": true,
    "dataFreshness": "FRESH"
  }
}
```

`downloadMbps`, `latencyMs`, and `networkContext` fields may be null or omitted when not measured. `userId` is deliberately omitted: derive identity from the verified access token.

Response:
```json
{
  "accepted": true,
  "readingId": "7d72c41e-9c7a-4a35-9c0f-9d19b7d5a1d2",
  "duplicate": false,
  "receivedAt": "2026-11-22T10:30:05Z",
  "validationStatus": "ACCEPTED"
}
```

Validation:
- Zone exists, is active, and belongs to the selected campus.
- Network type is an allowed enum.
- Units and numeric ranges are valid.
- Timestamp is within the configured acceptance window.
- Request size and submission rate are within limits.
- A duplicate `readingId` is idempotent.
- Suspicious but structurally valid data may be stored as `FLAGGED` for moderation instead of being silently treated as normal.

## 6. Batch upload

### `POST /readings/batch`
Use for Android offline synchronization. Limit batch size (initial proposal: 50 readings; make configurable).

Request:
```json
{
  "readings": [
    {
      "readingId": "uuid",
      "zoneId": "zone-uuid",
      "networkType": "WIFI",
      "downloadMbps": 42.1,
      "latencyMs": 21,
      "measurementSource": "APP_TEST",
      "clientMeasuredAt": "2026-11-22T10:30:00Z"
    }
  ]
}
```

Response:
```json
{
  "accepted": ["uuid"],
  "duplicates": [],
  "rejected": [
    {
      "readingId": "another-uuid",
      "code": "INVALID_ZONE",
      "message": "The selected zone is not available."
    }
  ]
}
```
Return per-record results so the client can retain retryable failures and mark permanent failures for user review.

## 7. Own history

### `GET /readings/mine`
Query parameters: `page`, `pageSize`, `from`, `to`, `zoneId`.

Returns only records belonging to the authenticated user. Enforce pagination and a maximum page size.

## 8. Heatmap and analytics

### `GET /campuses/{campusId}/heatmap`
Query parameters:
- `metric=download|latency|reliability`
- `networkType=WIFI|MOBILE|OTHER`
- `from`, `to`
- `bucket=hour|day|week`

Response:
```json
{
  "campusId": "campus-uuid",
  "metric": "download",
  "unit": "Mbps",
  "window": {
    "from": "2026-11-21T00:00:00Z",
    "to": "2026-11-22T00:00:00Z"
  },
  "zones": [
    {
      "zoneId": "zone-uuid",
      "zoneName": "Library",
      "sampleCount": 28,
      "median": 24.8,
      "minimum": 4.2,
      "maximum": 61.1,
      "status": "GOOD",
      "lastUpdatedAt": "2026-11-22T11:50:00Z",
      "dataQuality": "SUFFICIENT"
    }
  ]
}
```

### `GET /zones/{zoneId}/analytics`
Returns aggregate metrics and time-series buckets for the zone. Include sample counts and freshness. Do not return raw contributor/device records.

Status values should include `GOOD`, `UNSTABLE`, `POOR`, and `INSUFFICIENT_DATA`. Thresholds must be documented and configurable; do not hard-code arbitrary values as scientific truth.

## 9. Monitoring sessions

### `POST /monitoring/sessions`
Request:
```json
{
  "zoneId": "zone-uuid",
  "consentVersion": "monitoring-v1",
  "requestedDurationMinutes": 20
}
```
The server enforces a maximum allowed duration and records the authenticated owner.

Response:
```json
{
  "sessionId": "session-uuid",
  "status": "ACTIVE",
  "startedAt": "2026-11-22T10:30:00Z",
  "expiresAt": "2026-11-22T10:50:00Z"
}
```

### `POST /monitoring/sessions/{sessionId}/stop`
Only the owner or an authorized administrator can stop a session. The server sets `endedAt` and status `STOPPED`. Expiry processing marks abandoned sessions `EXPIRED`.

Monitoring readings are uploaded through the batch endpoint with a valid session reference. The app must also stop local callbacks immediately when the user presses Stop.

## 10. Issue reports

### `POST /issues`
Request:
```json
{
  "zoneId": "zone-uuid",
  "category": "REPEATED_POOR_CONNECTIVITY",
  "description": "Mobile data has been unreliable in this zone."
}
```
Apply text length limits and moderation. Warn users not to include personal or sensitive information.

### `GET /admin/issues`
Campus-admin role only. Supports pagination and status filters.

### `PATCH /admin/issues/{issueId}`
Request:
```json
{
  "status": "REVIEWING",
  "adminNotes": "Under review by campus IT."
}
```
Record the administrator and timestamp in an audit event.

## 11. Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted reading is invalid.",
    "requestId": "request-uuid",
    "details": [
      {
        "field": "downloadMbps",
        "reason": "Must be a non-negative number."
      }
    ]
  }
}
```

Expected HTTP codes:
- `400` malformed request
- `401` missing/invalid authentication
- `403` authenticated but not authorized
- `404` resource not found
- `409` conflicting state
- `422` validation failure (if adopted consistently)
- `429` rate limit exceeded
- `500` unexpected server error

Never return stack traces or secrets to clients.

## 12. API security and implementation requirements

- Verify access tokens on the server.
- Enforce role and campus scope on every protected operation.
- Use runtime request/response validation.
- Rate-limit submissions and issue reports.
- Restrict request size and batch size.
- Use idempotent reading IDs.
- Redact sensitive fields from logs.
- Paginate list endpoints.
- Add OpenAPI documentation and integration tests.
- Do not expose raw readings through public heatmap endpoints.
