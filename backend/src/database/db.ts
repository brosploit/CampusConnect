import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';

// Primary runtime connection pool (least privilege)
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Helper for executing parameterized queries with safe error wrapping
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (error: any) {
    // Redact query text and internal details from production logs
    if (env.NODE_ENV !== 'production') {
      console.error('Database query error:', { text, error: error.message });
    }
    throw error;
  }
}

// Transaction helper with Row-Level Security context setting
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  rlsContext?: { userId?: string; role?: string }
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (rlsContext) {
      if (rlsContext.userId) {
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [rlsContext.userId]);
      }
      if (rlsContext.role) {
        await client.query("SELECT set_config('app.current_user_role', $1, true)", [rlsContext.role]);
      }
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
