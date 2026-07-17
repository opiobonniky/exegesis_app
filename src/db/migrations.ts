import type { DB } from '@op-engineering/op-sqlite';
import { SCHEMA_SQL, FTS_SQL, SCHEMA_VERSION, V2_SQL } from './schema';

interface Migration {
  version: number;
  description: string;
  up: (db: DB) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema: translations, books, verses, offline queue, strongs dictionary',
    up: async (db: DB) => {
      await db.execute(SCHEMA_SQL);
      try {
        await db.execute(FTS_SQL);
        console.log('[migrations] FTS5 virtual tables created');
      } catch {
        console.warn('[migrations] FTS5 not available — full-text search disabled');
      }
    },
  },
  {
    version: 2,
    description: 'Add typed cache tables: app_cache, trivia_questions, daily_content_cache, reading_plan_cache',
    up: async (db: DB) => {
      await db.execute(V2_SQL);
    },
  },
];

export async function runMigrations(db: DB): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const result = await db.execute(
    'SELECT version FROM schema_version ORDER BY version ASC',
  );
  const rows = (result.rows ?? []) as { version: number }[];
  const applied = new Set(rows.map(r => r.version));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    console.log(`[migrations] Applying v${migration.version}: ${migration.description}`);

    try {
      await db.execute('BEGIN TRANSACTION');

      await migration.up(db);

      await db.execute(
        "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, datetime('now'))",
        [migration.version],
      );

      await db.execute('COMMIT');
      console.log(`[migrations] v${migration.version} applied successfully`);
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error(`[migrations] v${migration.version} FAILED:`, error);
      throw error;
    }
  }

  console.log(`[migrations] All migrations applied. Current version: ${SCHEMA_VERSION}`);
}
