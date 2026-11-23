import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
export declare function withTransaction<T>(callback: (client: PoolClient) => Promise<T>, rlsContext?: {
    userId?: string;
    role?: string;
}): Promise<T>;
