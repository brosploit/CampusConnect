"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const env_1 = require("../config/env");
// Primary runtime connection pool (least privilege)
exports.pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
// Helper for executing parameterized queries with safe error wrapping
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        return res.rows;
    }
    catch (error) {
        // Redact query text and internal details from production logs
        if (env_1.env.NODE_ENV !== 'production') {
            console.error('Database query error:', { text, error: error.message });
        }
        throw error;
    }
}
// Transaction helper with Row-Level Security context setting
async function withTransaction(callback, rlsContext) {
    const client = await exports.pool.connect();
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
