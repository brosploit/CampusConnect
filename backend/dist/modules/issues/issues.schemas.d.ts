import { z } from 'zod';
import { IssueReportStatus } from '../../config/constants';
export declare const CreateIssueSchema: z.ZodObject<{
    zoneId: z.ZodString;
    category: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    category: string;
    zoneId: string;
    description?: string | undefined;
}, {
    category: string;
    zoneId: string;
    description?: string | undefined;
}>;
export declare const IssueIdParamSchema: z.ZodObject<{
    issueId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    issueId: string;
}, {
    issueId: string;
}>;
export declare const ListIssuesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<[IssueReportStatus.NEW, IssueReportStatus.REVIEWING, IssueReportStatus.RESOLVED, IssueReportStatus.DISMISSED]>>;
    zoneId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: IssueReportStatus | undefined;
    zoneId?: string | undefined;
}, {
    status?: IssueReportStatus | undefined;
    zoneId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const UpdateIssueSchema: z.ZodObject<{
    status: z.ZodEnum<[IssueReportStatus.NEW, IssueReportStatus.REVIEWING, IssueReportStatus.RESOLVED, IssueReportStatus.DISMISSED]>;
    adminNotes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: IssueReportStatus;
    adminNotes?: string | undefined;
}, {
    status: IssueReportStatus;
    adminNotes?: string | undefined;
}>;
