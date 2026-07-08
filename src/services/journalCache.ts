import { run, queryAll, queryFirst } from '../db/database';
import { JournalEntry } from './api';

const CACHE_PREFIX = 'journal_';

/**
 * Cache a journal entry locally for offline reading.
 */
export async function cacheJournalEntry(entry: JournalEntry): Promise<void> {
  try {
    await run(
      `INSERT OR REPLACE INTO user_data_cache (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [`${CACHE_PREFIX}entry_${entry.id}`, JSON.stringify(entry)],
    );
  } catch (e) {
    console.warn('Failed to cache journal entry:', e);
  }
}

/**
 * Cache a list of journal entries (from get-all response).
 */
export async function cacheJournalEntryList(
  entries: JournalEntry[],
  page: number,
  filters: string,
): Promise<void> {
  try {
    await run(
      `INSERT OR REPLACE INTO user_data_cache (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [`${CACHE_PREFIX}list_p${page}_${filters}`, JSON.stringify(entries)],
    );
  } catch (e) {
    console.warn('Failed to cache journal list:', e);
  }
}

/**
 * Get a cached journal entry for offline reading.
 */
export async function getCachedJournalEntry(
  id: number,
): Promise<JournalEntry | null> {
  try {
    const row = await queryFirst<{ value: string }>(
      `SELECT value FROM user_data_cache WHERE key = ?`,
      [`${CACHE_PREFIX}entry_${id}`],
    );
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

/**
 * Get cached journal entry list for offline reading.
 */
export async function getCachedJournalEntryList(
  page: number,
  filters: string,
): Promise<JournalEntry[] | null> {
  try {
    const row = await queryFirst<{ value: string }>(
      `SELECT value FROM user_data_cache WHERE key = ?`,
      [`${CACHE_PREFIX}list_p${page}_${filters}`],
    );
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
