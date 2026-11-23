"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const env_1 = require("../config/env");
async function runMigrations() {
    const migrationUrl = env_1.env.DATABASE_MIGRATION_URL || env_1.env.DATABASE_URL;
    console.log('Running database migrations with connection URL...');
    const migrationPool = new pg_1.Pool({ connectionString: migrationUrl });
    const client = await migrationPool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        const migrationsDir = path_1.default.join(__dirname, 'migrations');
        if (!fs_1.default.existsSync(migrationsDir)) {
            console.warn('Migrations directory not found:', migrationsDir);
            return;
        }
        const files = fs_1.default.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
        for (const file of files) {
            const existing = await client.query('SELECT migration_name FROM schema_migrations WHERE migration_name = $1', [file]);
            if (existing.rows.length === 0) {
                console.log(`Applying migration: ${file}`);
                const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf8');
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`Successfully applied: ${file}`);
            }
            else {
                console.log(`Migration already applied: ${file}`);
            }
        }
        console.log('All migrations completed successfully.');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        throw error;
    }
    finally {
        client.release();
        await migrationPool.end();
    }
}
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
