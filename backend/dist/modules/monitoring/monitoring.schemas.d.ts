import { z } from 'zod';
export declare const StartMonitoringSchema: z.ZodObject<{
    zoneId: z.ZodString;
    consentVersion: z.ZodString;
    requestedDurationMinutes: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    zoneId: string;
    consentVersion: string;
    requestedDurationMinutes: number;
}, {
    zoneId: string;
    consentVersion: string;
    requestedDurationMinutes?: number | undefined;
}>;
export declare const SessionIdParamSchema: z.ZodObject<{
    sessionId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    sessionId: string;
}, {
    sessionId: string;
}>;
