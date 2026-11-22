# Project Specification — Campus Connect

## 1. Overview
Campus Connect is a campus connectivity intelligence platform. Students run manual diagnostics and may opt into temporary automatic monitoring. The system aggregates observations into zone-level analytics and a campus heatmap.

The platform documents what devices observe. It must not claim to detect, confirm, or locate jammers, infer a cause from a single failed test, or provide instructions for interfering with radio equipment.

## 2. Problem
Students may experience mobile-network problems in particular campus areas. Reports can be difficult to compare across devices, carriers, times, and locations. Campus Connect turns individual observations into structured, time-stamped, zone-based evidence.

## 3. Goals
1. Record connectivity observations by campus zone.
2. Support diagnostics when internet is unavailable.
3. Distinguish cellular service, mobile-data connectivity, and internet reachability.
4. Visualize aggregated conditions by zone.
5. Compare trends across time and carriers when sample sizes permit.
6. Let students report connectivity issues.
7. Provide optional, temporary, user-controlled monitoring.
8. Protect privacy through data minimization and aggregation.

## 4. Non-goals
- Detecting, confirming, locating, or attributing a jammer.
- Disabling, bypassing, or interfering with network equipment.
- Secret or permanent background monitoring.
- Collecting SMS, call logs, contacts, browsing history, phone numbers, IMEI, or IMSI.
- Publishing individual student histories.
- Guaranteeing that all Android devices expose identical cellular measurements.

## 5. User roles
**Student:** select zone, run diagnostics, view own history, submit issue reports, opt into and stop monitoring, request deletion.

**Campus administrator:** view aggregated analytics, review reports, manage approved campus zones, export aggregate reports.

**System administrator:** manage roles/configuration, monitor service health, review data-quality flags, manage retention and audit events.

## 6. Functional requirements
### FR-01 Campus and zone selection
Students select a configured campus zone. Manual selection is the MVP default; GPS is not required.

### FR-02 Manual diagnostics
Collect available values:
- Cellular service state
- Signal strength (when available)
- Network technology (when available)
- Carrier label (when available)
- Active network transport
- Internet reachability
- Latency, if endpoint is reachable
- Download throughput, only when a valid test can run
- Timestamp, app version, Android version

Fields must support null/unavailable. Never convert unavailable data to zero.

### FR-03 Offline persistence
Save diagnostics locally even without service. Queue pending records and upload later without duplication.

### FR-04 Optional monitoring
Require explicit opt-in, a visible active-session state, selected zone, stop control, and automatic expiry. No hidden or indefinite monitoring.

### FR-05 Heatmap
Show zone statuses: green (good), yellow (unstable), orange (poor), red (very poor), grey (insufficient data). Thresholds are configurable and documented.

### FR-06 Analytics
Show network availability, internet-test success rate, median signal, median latency, sample count, distinct device count, carrier comparisons, and trends where data quality permits.

### FR-07 Issue reports
Allow category, zone, optional description, and timestamp. Moderate reports and protect personal details.

### FR-08 Administration
Authorized administrators manage zones, review reports, and view aggregate analytics.

## 7. Non-functional requirements
Privacy by default; HTTPS; authentication and role-based authorization; server-side validation; rate limiting; reliable offline queue; accessible responsive UI; clear loading/error/empty/insufficient-data states; automated tests; maintainable code.

## 8. MVP
1. Welcome/privacy screen
2. Campus/zone selector
3. Manual diagnostic flow
4. Result screen
5. Local history
6. Backend upload and deduplication
7. Basic web dashboard and zone heatmap
8. Aggregated analytics
9. Issue reporting

Automatic monitoring is a later phase, not a blocker for the first MVP.

## 9. Example zones
Main Gate, Academic Building, Library, Computer Laboratory, Canteen, Administrative Office, Auditorium, Parking Area, Hostel, Sports Ground. These are examples only; replace with actual campus-approved zones.
