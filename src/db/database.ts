import { open, type DB } from '@op-engineering/op-sqlite';
import { runMigrations } from './migrations';

let db: DB | null = null;
let initPromise: Promise<DB> | null = null;

const DB_NAME = 'exegesis.db';

export async function getDb(): Promise<DB> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const database = await open({ name: DB_NAME });

      await database.execute('PRAGMA journal_mode = WAL;');
      await database.execute('PRAGMA foreign_keys = ON;');
      await database.execute('PRAGMA cache_size = -8000;');
      await database.execute('PRAGMA synchronous = NORMAL;');

      await runMigrations(database);

      db = database;
      console.log('[db] Database initialized successfully');
      return database;
    } catch (error) {
      initPromise = null;
      console.error('[db] Failed to initialize database:', error);
      throw error;
    }
  })();

  return initPromise;
}

export async function run(
  sql: string,
  params?: any[],
): Promise<{ rowsAffected: number; insertId?: number }> {
  const database = await getDb();
  const result = await database.execute(sql, params);
  return {
    rowsAffected: result.rowsAffected ?? 0,
    insertId: result.insertId,
  };
}

export async function queryAll<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const database = await getDb();
  const result = await database.execute(sql, params);
  return (result.rows ?? []) as T[];
}

export async function queryFirst<T = any>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const database = await getDb();
  const result = await database.execute(sql, params);
  const rows = result.rows ?? [];
  return (rows[0] as T) ?? null;
}

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

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    initPromise = null;
  }
}
