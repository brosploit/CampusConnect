# Testing Plan — Campus Connect

## Android unit tests
Diagnostic validation, null handling, zone selection, upload states, retry policy, session expiry, metric formatting.

## Android integration/device tests
Room persistence, offline queue, API failures, duplicate upload, permission denial, no SIM, dual SIM, cellular/no service, Wi-Fi only, airplane mode, captive portal, stale/null signal, process death during upload, monitoring stop.

## Backend tests
Authentication/authorization, zone validity, payload validation, idempotent ingestion, rate limits, batch limits, aggregation, minimum sample threshold, admin access, deletion/retention.

## Web tests
Responsive layouts, map, empty/insufficient-data states, filters, route protection, report moderation, accessibility and contrast.

## End-to-end acceptance
1. Student selects zone and completes diagnostic.
2. Result is saved locally before upload.
3. No-service result is retained.
4. Pending data uploads when connectivity returns.
5. Repeated measurement ID does not duplicate.
6. Dashboard shows aggregates only.
7. Sparse zone shows insufficient data.
8. Student can start/stop opt-in monitoring.
9. Permission denial does not crash app.
10. Student data is not visible to other students.

## Pilot
Test multiple devices/carriers/zones/times. Check test endpoint health, participant information, sampling bias, battery use, and interpretation before publishing conclusions.
