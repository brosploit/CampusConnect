export type UserRole = 'student' | 'moderator' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  mfaEnabled: boolean;
  isVerified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
}

export interface Campus {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export type ZoneStatus = 'EXCELLENT' | 'GOOD' | 'UNSTABLE' | 'POOR' | 'VERY_POOR' | 'INSUFFICIENT_DATA';

export interface Zone {
  id: string;
  campusId: string;
  name: string;
  building: string;
  floorLevel: string | null;
  zoneType: 'INDOOR' | 'OUTDOOR' | 'LECTURE_HALL' | 'LAB' | 'LIBRARY' | 'DORMITORY';
  minimumSampleThreshold: number;
}

export interface ZoneAggregate {
  zoneId: string;
  zoneName: string;
  building: string;
  zoneType: string;
  status: ZoneStatus;
  sampleCount: number;
  avgLatencyMs: number | null;
  avgDownloadMbps: number | null;
  avgSignalDbm: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  dataFreshness: string;
  lastObservedAt: string | null;
  hasSufficientData: boolean;
  neutralDiagnosticFinding: string;
}

export type IssueCategory =
  | 'CELLULAR_DEAD_ZONE'
  | 'WIFI_DISCONNECT'
  | 'CAPTIVE_PORTAL_FAILURE'
  | 'HIGH_LATENCY'
  | 'SPEED_DEGRADATION'
  | 'OTHER';

export type IssueStatus = 'NEW' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface IssueReport {
  id: string;
  reporterId: string;
  reporterDisplayName?: string;
  zoneId: string;
  zoneName?: string;
  category: IssueCategory;
  description: string;
  status: IssueStatus;
  moderatorNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminMetrics {
  totalObservations: number;
  activeZonesCount: number;
  activeIssuesCount: number;
  dataQualityWarningsCount: number;
  averageCampusLatencyMs: number;
  privacyComplianceScore: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}
