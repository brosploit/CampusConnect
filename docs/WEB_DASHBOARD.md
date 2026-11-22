# Web Dashboard — Campus Connect

## Purpose
Show aggregated campus insights and provide admin tools. Never expose individual student histories or sensitive device identifiers.

## Stack
React, TypeScript, Tailwind CSS, React Router or equivalent, Leaflet or equivalent map library, Recharts or equivalent chart library, typed API client.

## Screens
1. Public/student overview: campus summary, zone heatmap, updated timestamp, sample size/confidence.
2. Admin dashboard: observations, reporting zones, availability trend, internet test success, issue queue, data-quality warnings.
3. Zone details: building, status, sample count, distinct devices, signal/latency distributions, trends, carrier comparison only when sample thresholds permit.
4. Reports: category, zone, date, review status, admin notes, resolution.
5. Campus management: buildings, zones, map boundaries, active state, sample thresholds.

## Heatmap
Statuses: GOOD, UNSTABLE, POOR, VERY_POOR, INSUFFICIENT_DATA. Thresholds are configurable and documented. Show sample count and time window. Sparse or stale data must not receive a confident status.

## UX
Responsive, accessible contrast, text labels in addition to color, loading/empty/error/stale states, useful filters, and clear distinction between cellular service and internet reachability. Never label an area as a confirmed jammer zone.
