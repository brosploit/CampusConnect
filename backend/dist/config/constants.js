"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventType = exports.ZoneQualityStatus = exports.IssueReportStatus = exports.MonitoringSessionStatus = exports.ValidationStatus = exports.MeasurementSource = exports.NetworkType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "student";
    UserRole["MODERATOR"] = "moderator";
    UserRole["ADMINISTRATOR"] = "administrator";
})(UserRole || (exports.UserRole = UserRole = {}));
var NetworkType;
(function (NetworkType) {
    NetworkType["WIFI"] = "WIFI";
    NetworkType["MOBILE"] = "MOBILE";
    NetworkType["OTHER"] = "OTHER";
    NetworkType["UNKNOWN"] = "UNKNOWN";
})(NetworkType || (exports.NetworkType = NetworkType = {}));
var MeasurementSource;
(function (MeasurementSource) {
    MeasurementSource["APP_TEST"] = "APP_TEST";
    MeasurementSource["MANUAL"] = "MANUAL";
    MeasurementSource["IMPORTED"] = "IMPORTED";
    MeasurementSource["DEMO"] = "DEMO";
})(MeasurementSource || (exports.MeasurementSource = MeasurementSource = {}));
var ValidationStatus;
(function (ValidationStatus) {
    ValidationStatus["ACCEPTED"] = "ACCEPTED";
    ValidationStatus["FLAGGED"] = "FLAGGED";
    ValidationStatus["REJECTED"] = "REJECTED";
})(ValidationStatus || (exports.ValidationStatus = ValidationStatus = {}));
var MonitoringSessionStatus;
(function (MonitoringSessionStatus) {
    MonitoringSessionStatus["ACTIVE"] = "ACTIVE";
    MonitoringSessionStatus["STOPPED"] = "STOPPED";
    MonitoringSessionStatus["EXPIRED"] = "EXPIRED";
})(MonitoringSessionStatus || (exports.MonitoringSessionStatus = MonitoringSessionStatus = {}));
var IssueReportStatus;
(function (IssueReportStatus) {
    IssueReportStatus["NEW"] = "NEW";
    IssueReportStatus["REVIEWING"] = "REVIEWING";
    IssueReportStatus["RESOLVED"] = "RESOLVED";
    IssueReportStatus["DISMISSED"] = "DISMISSED";
})(IssueReportStatus || (exports.IssueReportStatus = IssueReportStatus = {}));
var ZoneQualityStatus;
(function (ZoneQualityStatus) {
    ZoneQualityStatus["GOOD"] = "GOOD";
    ZoneQualityStatus["UNSTABLE"] = "UNSTABLE";
    ZoneQualityStatus["POOR"] = "POOR";
    ZoneQualityStatus["VERY_POOR"] = "VERY_POOR";
    ZoneQualityStatus["INSUFFICIENT_DATA"] = "INSUFFICIENT_DATA";
})(ZoneQualityStatus || (exports.ZoneQualityStatus = ZoneQualityStatus = {}));
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["AUTH_REGISTER"] = "AUTH_REGISTER";
    AuditEventType["AUTH_LOGIN_SUCCESS"] = "AUTH_LOGIN_SUCCESS";
    AuditEventType["AUTH_LOGIN_FAILURE"] = "AUTH_LOGIN_FAILURE";
    AuditEventType["AUTH_LOGOUT"] = "AUTH_LOGOUT";
    AuditEventType["AUTH_REFRESH_TOKEN"] = "AUTH_REFRESH_TOKEN";
    AuditEventType["AUTH_PASSWORD_RESET_REQUEST"] = "AUTH_PASSWORD_RESET_REQUEST";
    AuditEventType["AUTH_PASSWORD_RESET_SUCCESS"] = "AUTH_PASSWORD_RESET_SUCCESS";
    AuditEventType["AUTH_MFA_ENABLED"] = "AUTH_MFA_ENABLED";
    AuditEventType["AUTH_MFA_CHALLENGE_FAILED"] = "AUTH_MFA_CHALLENGE_FAILED";
    AuditEventType["USER_ACCOUNT_SUSPENDED"] = "USER_ACCOUNT_SUSPENDED";
    AuditEventType["USER_ROLE_CHANGED"] = "USER_ROLE_CHANGED";
    AuditEventType["USER_DELETED"] = "USER_DELETED";
    AuditEventType["READING_SUBMITTED"] = "READING_SUBMITTED";
    AuditEventType["READING_BATCH_SUBMITTED"] = "READING_BATCH_SUBMITTED";
    AuditEventType["MONITORING_SESSION_STARTED"] = "MONITORING_SESSION_STARTED";
    AuditEventType["MONITORING_SESSION_STOPPED"] = "MONITORING_SESSION_STOPPED";
    AuditEventType["ISSUE_REPORT_CREATED"] = "ISSUE_REPORT_CREATED";
    AuditEventType["ADMIN_ISSUE_UPDATED"] = "ADMIN_ISSUE_UPDATED";
    AuditEventType["ADMIN_ZONE_CREATED"] = "ADMIN_ZONE_CREATED";
    AuditEventType["ADMIN_ZONE_UPDATED"] = "ADMIN_ZONE_UPDATED";
    AuditEventType["AUTHZ_FAILURE"] = "AUTHZ_FAILURE";
    AuditEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
