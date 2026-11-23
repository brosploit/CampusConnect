import { z } from 'zod';
import { IssueReportStatus } from '../../config/constants';

export const CreateIssueSchema = z
  .object({
    zoneId: z.string().uuid('Invalid zone ID format'),
    category: z.string().min(1).max(64).regex(/^[\w\s\.\-]+$/),
    description: z.string().max(500, 'Description cannot exceed 500 characters').trim().optional(),
  })
  .strict();

export const IssueIdParamSchema = z
  .object({
    issueId: z.string().uuid('Invalid issue ID format'),
  })
  .strict();

export const ListIssuesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum([
      IssueReportStatus.NEW,
      IssueReportStatus.REVIEWING,
      IssueReportStatus.RESOLVED,
      IssueReportStatus.DISMISSED,
    ]).optional(),
    zoneId: z.string().uuid().optional(),
  })
  .strict();

export const UpdateIssueSchema = z
  .object({
    status: z.enum([
      IssueReportStatus.NEW,
      IssueReportStatus.REVIEWING,
      IssueReportStatus.RESOLVED,
      IssueReportStatus.DISMISSED,
    ]),
    adminNotes: z.string().max(500).trim().optional(),
  })
  .strict();
