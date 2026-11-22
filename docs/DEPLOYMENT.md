# Deployment Guide — Campus Connect

## Environments
Keep local development, staging/pilot, and production separate. Do not use production student data in development or automated tests.

## Configuration
Create `.env.example` with safe placeholders only. Example backend variables:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=
AUTH_ISSUER_URL=
AUTH_AUDIENCE=
AUTH_PUBLIC_KEY=
CORS_ORIGINS=http://localhost:5173
```
Use the auth provider's recommended server-side verification. Never commit `.env` or service-role secrets.

## Database
Apply versioned migrations, configure indexes/constraints/access policies, seed only confirmed campus data, configure backups, and test restores.

## Backend
Run tests, configure HTTPS/CORS/rate limits/request limits, structured redacted logs, and health checks.

## Web
Build production assets, configure API base URL and SPA routing, protect admin routes with server authorization.

## Android
Configure application ID/signing and production API endpoint. Review permissions/privacy disclosures. Test release builds on physical devices. Never embed private backend credentials.

## Pilot
Begin with a small informed group and limited zones. Review data quality, battery use, permissions, upload reliability, and uncertainty presentation before expansion.
