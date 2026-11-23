import { z } from 'zod';
export declare const ListZonesQuerySchema: z.ZodObject<{
    active: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
}, "strict", z.ZodTypeAny, {
    active?: "true" | "false" | undefined;
}, {
    active?: "true" | "false" | undefined;
}>;
export declare const ZoneIdParamSchema: z.ZodObject<{
    zoneId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    zoneId: string;
}, {
    zoneId: string;
}>;
export declare const CampusIdParamSchema: z.ZodObject<{
    campusId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    campusId: string;
}, {
    campusId: string;
}>;
export declare const HeatmapQuerySchema: z.ZodObject<{
    metric: z.ZodDefault<z.ZodEnum<["download", "latency", "reliability"]>>;
    networkType: z.ZodOptional<z.ZodEnum<["WIFI", "MOBILE", "OTHER", "UNKNOWN"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    bucket: z.ZodDefault<z.ZodEnum<["hour", "day", "week"]>>;
}, "strict", z.ZodTypeAny, {
    metric: "download" | "latency" | "reliability";
    bucket: "week" | "day" | "hour";
    networkType?: "WIFI" | "MOBILE" | "OTHER" | "UNKNOWN" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    metric?: "download" | "latency" | "reliability" | undefined;
    networkType?: "WIFI" | "MOBILE" | "OTHER" | "UNKNOWN" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    bucket?: "week" | "day" | "hour" | undefined;
}>;
export declare const ZoneAnalyticsQuerySchema: z.ZodObject<{
    metric: z.ZodDefault<z.ZodEnum<["download", "latency", "reliability"]>>;
    networkType: z.ZodOptional<z.ZodEnum<["WIFI", "MOBILE", "OTHER", "UNKNOWN"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    metric: "download" | "latency" | "reliability";
    networkType?: "WIFI" | "MOBILE" | "OTHER" | "UNKNOWN" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    metric?: "download" | "latency" | "reliability" | undefined;
    networkType?: "WIFI" | "MOBILE" | "OTHER" | "UNKNOWN" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
