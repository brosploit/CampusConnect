import { UserRole, NetworkType, MeasurementSource, ValidationStatus, MonitoringSessionStatus, IssueReportStatus, AuditEventType } from '../config/constants';
export interface CampusRecord {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    created_at: Date;
}
export interface BuildingRecord {
    id: string;
    campus_id: string;
    name: string;
    description: string | null;
    created_at: Date;
}
export interface ZoneRecord {
    id: string;
    campus_id: string;
    building_id: string | null;
    name: string;
    description: string | null;
    map_geometry: any | null;
    is_active: boolean;
    created_at: Date;
}
export interface UserRecord {
    id: string;
    email: string;
    password_hash: string;
    display_name: string | null;
    role: UserRole;
    is_verified: boolean;
    is_suspended: boolean;
    mfa_enabled: boolean;
    mfa_secret: string | null;
    tokens_revoked_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}
export interface RefreshTokenRecord {
    id: string;
    user_id: string;
    token_hash: string;
    family_id: string;
    expires_at: Date;
    revoked_at: Date | null;
    created_at: Date;
}
export interface PasswordResetRecord {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
}
export interface ReadingRecord {
    reading_id: string;
    user_id: string | null;
    zone_id: string;
    network_type: NetworkType;
    download_mbps: number | null;
    latency_ms: number | null;
    measurement_source: MeasurementSource;
    client_measured_at: Date;
    received_at: Date;
    app_version: string | null;
    platform_version: string | null;
    validation_status: ValidationStatus;
    validation_notes: string | null;
}
export interface ReadingNetworkContextRecord {
    reading_id: string;
    service_state: string | null;
    signal_dbm: number | null;
    radio_technology: string | null;
    carrier_label: string | null;
    active_transport: string | null;
    internet_capability: boolean | null;
    internet_validated: boolean | null;
    data_freshness: string | null;
}
export interface MonitoringSessionRecord {
    id: string;
    user_id: string;
    zone_id: string;
    consent_version: string;
    consent_at: Date;
    started_at: Date;
    ended_at: Date | null;
    expires_at: Date;
    status: MonitoringSessionStatus;
}
export interface IssueReportRecord {
    id: string;
    user_id: string;
    zone_id: string;
    category: string;
    description: string | null;
    created_at: Date;
    status: IssueReportStatus;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    admin_notes: string | null;
}
export interface ZoneAggregateRecord {
    id: string;
    zone_id: string;
    metric: string;
    network_type: string;
    window_start: Date;
    window_end: Date;
    sample_count: number;
    distinct_devices: number | null;
    median_value: number | null;
    minimum_value: number | null;
    maximum_value: number | null;
    status_label: string;
    calculated_at: Date;
}
export interface AuditLogRecord {
    id: string;
    event_type: AuditEventType;
    actor_id: string | null;
    actor_role: string | null;
    ip_address: string | null;
    user_agent: string | null;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, any> | null;
    created_at: Date;
}
