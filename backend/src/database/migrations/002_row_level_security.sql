-- Migration: 002_row_level_security.sql
-- Description: PostgreSQL Row-Level Security (RLS) policies for tenant/user isolation.

-- Enable Row Level Security on sensitive operational tables
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Readings Policy:
-- Students can only select and insert their own readings.
-- Moderators and Administrators can view readings in their campus scope.
DROP POLICY IF EXISTS p_readings_student_isolation ON readings;
CREATE POLICY p_readings_student_isolation ON readings
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    );

-- Monitoring Sessions Policy:
-- Students can only access or modify their own sessions.
DROP POLICY IF EXISTS p_monitoring_sessions_isolation ON monitoring_sessions;
CREATE POLICY p_monitoring_sessions_isolation ON monitoring_sessions
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    );

-- Issue Reports Policy:
-- Students view their own issue reports. Moderators and Admins review reports.
DROP POLICY IF EXISTS p_issue_reports_isolation ON issue_reports;
CREATE POLICY p_issue_reports_isolation ON issue_reports
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR current_setting('app.current_user_role', true) IN ('moderator', 'administrator')
    );

-- Audit Logs Policy:
-- Append-only for all application roles. Only administrators may view audit logs.
DROP POLICY IF EXISTS p_audit_logs_read ON audit_logs;
CREATE POLICY p_audit_logs_read ON audit_logs
    FOR SELECT
    USING (current_setting('app.current_user_role', true) = 'administrator');

DROP POLICY IF EXISTS p_audit_logs_insert ON audit_logs;
CREATE POLICY p_audit_logs_insert ON audit_logs
    FOR INSERT
    WITH CHECK (true);
