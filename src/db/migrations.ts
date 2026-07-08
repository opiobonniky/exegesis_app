/**
 * migrations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Version-based SQLite migration runner.
 *
 * Run on every app launch via `database.ts`.  Applies migrations in order
 * and tracks applied versions in the `schema_version` table.
 *
 * Usage:
 *   import { runMigrations } from './migrations';
 *   const db = await openDatabaseAsync('exegesis.db');
 *   await runMigrations(db);
 */

import type { SQLiteDatabase } from '@op-engineering/op-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

// ── Migration registry ──────────────────────────────────────────────────────
// Each migration is a function that receives the database and returns a promise.
// Keyed by version number (1, 2, 3, ...).
//
// To add a new migration:
//   1. Bump SCHEMA_VERSION in schema.ts
//   2. Add the new SQL to SCHEMA_SQL
//   3. Add a migration function here (e.g., `migration2`)
//   4. Register it in `MIGRATIONS`

interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema: translations, books, verses, FTS5, offline queue, strongs dictionary',
    up: async (db: SQLiteDatabase) => {
      // Execute the full schema SQL atomically
      // Individual CREATE IF NOT EXISTS statements are idempotent
      await db.executeAsync(SCHEMA_SQL);
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

/**
 * Apply any pending migrations.
 * Safe to call on every app launch — only unapplied versions run.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure the schema_version table exists (created by v1, but needed to track v1 itself)
  await db.executeAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Fetch already-applied versions
  const rows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version ASC',
  );
  const applied = new Set(rows.map(r => r.version));

  // Apply each pending migration in order
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    console.log(`[migrations] Applying v${migration.version}: ${migration.description}`);

    try {
      await db.executeAsync('BEGIN TRANSACTION');

      await migration.up(db);

      await db.executeAsync(
        'INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, datetime(\'now\'))',
        [migration.version],
      );

      await db.executeAsync('COMMIT');
      console.log(`[migrations] v${migration.version} applied successfully`);
    } catch (error) {
      await db.executeAsync('ROLLBACK');
      console.error(`[migrations] v${migration.version} FAILED:`, error);
      throw error;
    }
  }

  console.log(`[migrations] All migrations applied. Current version: ${SCHEMA_VERSION}`);
}
