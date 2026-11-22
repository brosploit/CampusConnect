# Decisions and Open Questions — Campus Connect

## Current decisions
- Product name: Campus Connect
- Product: campus connectivity intelligence platform
- Initial target: one college campus
- Diagnostic approach: manual + optional automatic monitoring
- Initial location method: manual campus-zone selection
- Android: Kotlin + Jetpack Compose
- Web: React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Public analytics: aggregated only
- No jammer-detection claims

## Confirm before implementation
1. Exact college name and approved campus zones.
2. Student accounts vs anonymous contributions.
3. Expected carriers and Android device types.
4. Whether administrators need dashboard access.
5. Hosting provider and budget.
6. Authentication provider.
7. Data retention duration.
8. Institutional approval and privacy notice requirements.
9. Dashboard access: public, student-only, or admin-only.
10. Whether speed tests are MVP scope or deferred.

## Safe defaults
If undecided, use local development, clearly labelled demo campus data, restricted dashboard access, manual zone selection, monitoring disabled by default, no GPS/hardware identifiers, and minimum sample thresholds before publishing analytics.
