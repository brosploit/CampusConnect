import { z } from 'zod';
import { NetworkType, MeasurementSource } from '../../config/constants';
export declare const NetworkContextSchema: z.ZodObject<{
    serviceState: z.ZodOptional<z.ZodNullable<z.ZodEnum<["IN_SERVICE", "OUT_OF_SERVICE", "EMERGENCY_ONLY", "POWER_OFF"]>>>;
    signalDbm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    radioTechnology: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    carrierLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    activeTransport: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    internetCapability: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    internetValidated: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    dataFreshness: z.ZodOptional<z.ZodNullable<z.ZodEnum<["FRESH", "CACHED", "UNKNOWN"]>>>;
}, "strict", z.ZodTypeAny, {
    serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
    signalDbm?: number | null | undefined;
    radioTechnology?: string | null | undefined;
    carrierLabel?: string | null | undefined;
    activeTransport?: string | null | undefined;
    internetCapability?: boolean | null | undefined;
    internetValidated?: boolean | null | undefined;
    dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
}, {
    serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
    signalDbm?: number | null | undefined;
    radioTechnology?: string | null | undefined;
    carrierLabel?: string | null | undefined;
    activeTransport?: string | null | undefined;
    internetCapability?: boolean | null | undefined;
    internetValidated?: boolean | null | undefined;
    dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
}>;
export declare const SingleReadingSchema: z.ZodObject<{
    readingId: z.ZodString;
    zoneId: z.ZodString;
    networkType: z.ZodEnum<[NetworkType.WIFI, NetworkType.MOBILE, NetworkType.OTHER, NetworkType.UNKNOWN]>;
    downloadMbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    measurementSource: z.ZodEnum<[MeasurementSource.APP_TEST, MeasurementSource.MANUAL, MeasurementSource.IMPORTED, MeasurementSource.DEMO]>;
    clientMeasuredAt: z.ZodEffects<z.ZodString, string, string>;
    appVersion: z.ZodOptional<z.ZodString>;
    platformVersion: z.ZodOptional<z.ZodString>;
    networkContext: z.ZodOptional<z.ZodObject<{
        serviceState: z.ZodOptional<z.ZodNullable<z.ZodEnum<["IN_SERVICE", "OUT_OF_SERVICE", "EMERGENCY_ONLY", "POWER_OFF"]>>>;
        signalDbm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        radioTechnology: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        carrierLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        activeTransport: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        internetCapability: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        internetValidated: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        dataFreshness: z.ZodOptional<z.ZodNullable<z.ZodEnum<["FRESH", "CACHED", "UNKNOWN"]>>>;
    }, "strict", z.ZodTypeAny, {
        serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
        signalDbm?: number | null | undefined;
        radioTechnology?: string | null | undefined;
        carrierLabel?: string | null | undefined;
        activeTransport?: string | null | undefined;
        internetCapability?: boolean | null | undefined;
        internetValidated?: boolean | null | undefined;
        dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
    }, {
        serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
        signalDbm?: number | null | undefined;
        radioTechnology?: string | null | undefined;
        carrierLabel?: string | null | undefined;
        activeTransport?: string | null | undefined;
        internetCapability?: boolean | null | undefined;
        internetValidated?: boolean | null | undefined;
        dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    zoneId: string;
    networkType: NetworkType;
    readingId: string;
    measurementSource: MeasurementSource;
    clientMeasuredAt: string;
    downloadMbps?: number | null | undefined;
    latencyMs?: number | null | undefined;
    appVersion?: string | undefined;
    platformVersion?: string | undefined;
    networkContext?: {
        serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
        signalDbm?: number | null | undefined;
        radioTechnology?: string | null | undefined;
        carrierLabel?: string | null | undefined;
        activeTransport?: string | null | undefined;
        internetCapability?: boolean | null | undefined;
        internetValidated?: boolean | null | undefined;
        dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
    } | undefined;
}, {
    zoneId: string;
    networkType: NetworkType;
    readingId: string;
    measurementSource: MeasurementSource;
    clientMeasuredAt: string;
    downloadMbps?: number | null | undefined;
    latencyMs?: number | null | undefined;
    appVersion?: string | undefined;
    platformVersion?: string | undefined;
    networkContext?: {
        serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
        signalDbm?: number | null | undefined;
        radioTechnology?: string | null | undefined;
        carrierLabel?: string | null | undefined;
        activeTransport?: string | null | undefined;
        internetCapability?: boolean | null | undefined;
        internetValidated?: boolean | null | undefined;
        dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
    } | undefined;
}>;
export declare const BatchReadingSchema: z.ZodObject<{
    readings: z.ZodArray<z.ZodObject<{
        readingId: z.ZodString;
        zoneId: z.ZodString;
        networkType: z.ZodEnum<[NetworkType.WIFI, NetworkType.MOBILE, NetworkType.OTHER, NetworkType.UNKNOWN]>;
        downloadMbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        measurementSource: z.ZodEnum<[MeasurementSource.APP_TEST, MeasurementSource.MANUAL, MeasurementSource.IMPORTED, MeasurementSource.DEMO]>;
        clientMeasuredAt: z.ZodEffects<z.ZodString, string, string>;
        appVersion: z.ZodOptional<z.ZodString>;
        platformVersion: z.ZodOptional<z.ZodString>;
        networkContext: z.ZodOptional<z.ZodObject<{
            serviceState: z.ZodOptional<z.ZodNullable<z.ZodEnum<["IN_SERVICE", "OUT_OF_SERVICE", "EMERGENCY_ONLY", "POWER_OFF"]>>>;
            signalDbm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            radioTechnology: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            carrierLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            activeTransport: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            internetCapability: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            internetValidated: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            dataFreshness: z.ZodOptional<z.ZodNullable<z.ZodEnum<["FRESH", "CACHED", "UNKNOWN"]>>>;
        }, "strict", z.ZodTypeAny, {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        }, {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        zoneId: string;
        networkType: NetworkType;
        readingId: string;
        measurementSource: MeasurementSource;
        clientMeasuredAt: string;
        downloadMbps?: number | null | undefined;
        latencyMs?: number | null | undefined;
        appVersion?: string | undefined;
        platformVersion?: string | undefined;
        networkContext?: {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        } | undefined;
    }, {
        zoneId: string;
        networkType: NetworkType;
        readingId: string;
        measurementSource: MeasurementSource;
        clientMeasuredAt: string;
        downloadMbps?: number | null | undefined;
        latencyMs?: number | null | undefined;
        appVersion?: string | undefined;
        platformVersion?: string | undefined;
        networkContext?: {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        } | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    readings: {
        zoneId: string;
        networkType: NetworkType;
        readingId: string;
        measurementSource: MeasurementSource;
        clientMeasuredAt: string;
        downloadMbps?: number | null | undefined;
        latencyMs?: number | null | undefined;
        appVersion?: string | undefined;
        platformVersion?: string | undefined;
        networkContext?: {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        } | undefined;
    }[];
}, {
    readings: {
        zoneId: string;
        networkType: NetworkType;
        readingId: string;
        measurementSource: MeasurementSource;
        clientMeasuredAt: string;
        downloadMbps?: number | null | undefined;
        latencyMs?: number | null | undefined;
        appVersion?: string | undefined;
        platformVersion?: string | undefined;
        networkContext?: {
            serviceState?: "IN_SERVICE" | "OUT_OF_SERVICE" | "EMERGENCY_ONLY" | "POWER_OFF" | null | undefined;
            signalDbm?: number | null | undefined;
            radioTechnology?: string | null | undefined;
            carrierLabel?: string | null | undefined;
            activeTransport?: string | null | undefined;
            internetCapability?: boolean | null | undefined;
            internetValidated?: boolean | null | undefined;
            dataFreshness?: "UNKNOWN" | "FRESH" | "CACHED" | null | undefined;
        } | undefined;
    }[];
}>;
export declare const ListMineReadingsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    zoneId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    zoneId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
