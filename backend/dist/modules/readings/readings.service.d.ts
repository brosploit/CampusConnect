import { ValidationStatus } from '../../config/constants';
export declare class ReadingsService {
    /**
     * Ingests a single diagnostic reading with idempotency and zone validation
     */
    static submitReading(params: {
        userId: string;
        reading: any;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        accepted: boolean;
        readingId: string;
        duplicate: boolean;
        receivedAt: Date;
        validationStatus: ValidationStatus;
    }>;
    /**
     * Ingests a batch of offline-synced diagnostic readings
     */
    static submitBatch(params: {
        userId: string;
        readings: any[];
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        accepted: string[];
        duplicates: string[];
        rejected: Array<{
            readingId: string;
            reason: string;
        }>;
    }>;
}
