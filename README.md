# Campus Connect
## Campus Connectivity Intelligence Platform

Campus Connect documents, analyzes, and visualizes mobile-network connectivity conditions across college campus zones.

**Product:** Android app + web dashboard + backend  
**Diagnostic model:** Manual diagnostics + optional, consent-based automatic monitoring  
**Initial scope:** One college campus

> Campus Connect is not a jammer detector. It records observed connectivity conditions and highlights patterns. A failed connection or no-service reading does not prove radio interference or identify its cause. Suspected interference must be investigated by authorized professionals.

## Documentation
- `docs/PROJECT_SPECIFICATION.md` — product requirements and scope
- `docs/ARCHITECTURE.md` — system architecture
- `docs/ANDROID_IMPLEMENTATION.md` — Android app, APIs, permissions, offline behavior
- `docs/WEB_DASHBOARD.md` — dashboard requirements
- `docs/DATABASE_SCHEMA.md` — proposed PostgreSQL schema
- `docs/API_DOCUMENTATION.md` — REST API contract
- `docs/PRIVACY_SECURITY.md` — consent, privacy, security
- `docs/ANALYTICS.md` — metrics and interpretation
- `docs/TESTING.md` — test strategy and acceptance criteria
- `docs/DEPLOYMENT.md` — deployment guidance
- `docs/DEVELOPMENT_ROADMAP.md` — implementation phases
- `docs/ANTIGRAVITY_PROMPT.md` — Google Antigravity master prompt
- `docs/DECISIONS_AND_OPEN_QUESTIONS.md` — decisions to confirm

## Recommended stack
| Component | Technology |
|---|---|
| Android | Kotlin, Jetpack Compose, MVVM |
| Local storage | Room |
| Deferred upload | WorkManager |
| Cellular/network observations | Android Telephony APIs, ConnectivityManager |
| Web | React, TypeScript, Tailwind CSS |
| Maps/charts | Leaflet, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Authentication | Supabase Auth or equivalent |

Build incrementally. Get manual diagnostics and offline persistence working before optional monitoring.
