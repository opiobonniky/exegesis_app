/**
 * database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite database singleton for the offline Exegesis database (exegesis.db).
 *
 * Usage:
 *   import { getDb } from './database';
 *   const db = await getDb();
 *   const rows = await db.getAllAsync('SELECT * FROM verses WHERE ...');
 *
 * Internals:
 *   - Opens the database on first call (lazy init)
 *   - WAL journal mode for concurrent read performance
 *   - Runs pending migrations
 *   - Exposes a convenience `execute` wrapper for raw SQL
 */

import {
  open,
  type SQLiteDatabase,
} from '@op-engineering/op-sqlite';
import { runMigrations } from './migrations';

// ── Singleton ────────────────────────────────────────────────────────────────

let db: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

const DB_NAME = 'exegesis.db';

/**
 * Get the database singleton.
 * Lazily opens the database and runs migrations on first call.
 * Subsequent calls return the cached instance.
 */
export async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;

  // Deduplicate concurrent init calls
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const database = await open({
        name: DB_NAME,
        // location is optional — defaults to the app's document directory
      });

      // Set performance pragmas
      await database.executeAsync('PRAGMA journal_mode = WAL;');
      await database.executeAsync('PRAGMA foreign_keys = ON;');
      await database.executeAsync('PRAGMA cache_size = -8000;');       // ~8 MB cache
      await database.executeAsync('PRAGMA synchronous = NORMAL;');     // balance safety & speed

      // Run migrations
      await runMigrations(database);

      db = database;
      console.log('[db] Database initialized successfully');
      return database;
    } catch (error) {
      initPromise = null; // Reset so retry works
      console.error('[db] Failed to initialize database:', error);
      throw error;
    }
  })();

  return initPromise;
}

// ── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Execute a raw SQL string (no parameters).
 * Useful for PRAGMA statements or multi-statement strings.
 */
export async function executeSql(sql: string): Promise<void> {
  const database = await getDb();
  await database.executeAsync(sql);
}

/**
 * Run a single SQL statement with optional parameters.
 * Returns the result metadata (rowsAffected, insertId, etc.).
 */
export async function run(
  sql: string,
  params?: any[],
): Promise<{ rowsAffected: number; insertId?: number }> {
  const database = await getDb();
  const result = await database.runAsync(sql, params);
  return {
    rowsAffected: result.changes,
    insertId: result.lastInsertRowId ?? undefined,
  };
}

/**
 * Fetch all rows matching the query.
 */
export async function queryAll<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const database = await getDb();
  return database.getAllAsync<T>(sql, params);
}

/**
 * Fetch the first row matching the query, or null.
 */
export async function queryFirst<T = any>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<T>(sql, params);
  return row ?? null;
}

/**
 * Execute multiple statements inside a transaction.
 * The callback receives the database instance.
 */
export async function transaction<T>(
  fn: (db: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const database = await getDb();
  return database.withTransactionAsync<T>(() => fn(database));
}

// ── Database info ────────────────────────────────────────────────────────────

/**
 * Check if the database has been seeded with verse data.
 * Returns true if any verses exist in the verses table.
 */
export async function isSeeded(): Promise<boolean> {
  try {
    const row = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) AS count FROM verses',
    );
    return (row?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current schema version from the database.
 */
export async function getSchemaVersion(): Promise<number> {
  try {
    const row = await queryFirst<{ version: number }>(
      'SELECT MAX(version) AS version FROM schema_version',
    );
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Close the database connection.
 * Useful for testing or cleanup.
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    initPromise = null;
  }
}
