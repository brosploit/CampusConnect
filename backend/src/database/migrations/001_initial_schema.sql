-- Migration: 001_initial_schema.sql
-- Description: Core tables for Campus Connect with constraints, foreign keys, and indexes.

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Campuses
CREATE TABLE IF NOT EXISTS campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Buildings
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_building_campus_name UNIQUE (campus_id, name)
);

-- 3. Zones
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    map_geometry JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zone_campus_name UNIQUE (campus_id, name)
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('student', 'moderator', 'administrator')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT,
    tokens_revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. Refresh Tokens (Hashed token for rotation & revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    family_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Password Reset Tokens (Single-use, short-lived, hashed)
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Readings
CREATE TABLE IF NOT EXISTS readings (
    reading_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    network_type TEXT NOT NULL CHECK (network_type IN ('WIFI', 'MOBILE', 'OTHER', 'UNKNOWN')),
    download_mbps NUMERIC(10,3) CHECK (download_mbps IS NULL OR download_mbps >= 0),
    latency_ms NUMERIC(10,2) CHECK (latency_ms IS NULL OR latency_ms >= 0),
    measurement_source TEXT NOT NULL CHECK (measurement_source IN ('APP_TEST', 'MANUAL', 'IMPORTED', 'DEMO')),
    client_measured_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_version TEXT,
    platform_version TEXT,
    validation_status TEXT NOT NULL DEFAULT 'ACCEPTED' CHECK (validation_status IN ('ACCEPTED', 'FLAGGED', 'REJECTED')),
    validation_notes TEXT
);

-- 8. Reading Network Context
CREATE TABLE IF NOT EXISTS reading_network_context (
    reading_id UUID PRIMARY KEY REFERENCES readings(reading_id) ON DELETE CASCADE,
    service_state TEXT,
    signal_dbm INTEGER CHECK (signal_dbm IS NULL OR (signal_dbm >= -150 AND signal_dbm <= 0)),
    radio_technology TEXT,
    carrier_label TEXT,
    active_transport TEXT,
    internet_capability BOOLEAN,
    internet_validated BOOLEAN,
    data_freshness TEXT
);

-- 9. Monitoring Sessions
CREATE TABLE IF NOT EXISTS monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    consent_version TEXT NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STOPPED', 'EXPIRED')),
    CONSTRAINT chk_monitoring_duration CHECK (expires_at > started_at)
);

-- 10. Issue Reports
CREATE TABLE IF NOT EXISTS issue_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- 11. Zone Aggregates (Rebuildable aggregate snapshots)
CREATE TABLE IF NOT EXISTS zone_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    network_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL CHECK (sample_count >= 0),
    distinct_devices INTEGER CHECK (distinct_devices IS NULL OR distinct_devices >= 0),
    median_value NUMERIC(12,3),
    minimum_value NUMERIC(12,3),
    maximum_value NUMERIC(12,3),
    status_label TEXT NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zone_aggregate_window UNIQUE (zone_id, metric, network_type, window_start, window_end)
);

-- 12. Security Audit Logs (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and query isolation
CREATE INDEX IF NOT EXISTS idx_zones_campus_active ON zones (campus_id, is_active);
CREATE INDEX IF NOT EXISTS idx_readings_zone_time ON readings (zone_id, client_measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_user_time ON readings (user_id, client_measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_received_at ON readings (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_user_active ON monitoring_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_zone_status ON issue_reports (zone_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aggregates_zone_window ON zone_aggregates (zone_id, window_end DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_time ON audit_logs (event_type, created_at DESC);
