# Campus Connect Backend API

Production-ready, security-hardened REST API built with Node.js, Express, TypeScript, and PostgreSQL.

## Quickstart

### Prerequisites
- Node.js >= 20
- npm >= 10
- PostgreSQL >= 14 (Optional for local development; in-memory repository is active in test mode)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure appropriate secrets:
```bash
cp .env.example .env
```

### 3. Run Database Migrations (PostgreSQL)
```bash
npm run migrate
```

### 4. Run Automated Security Test Suite
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Build for Production
```bash
npm run build
npm start
```

## Security Documentation
See `docs/BACKEND_SECURITY.md` and `docs/SECURITY_ARCHITECTURE.md` for full threat modeling, standards mapping, and verification evidence.
