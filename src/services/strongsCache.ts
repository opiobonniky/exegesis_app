import { run, queryFirst, queryAll } from '../db/database';
import { StrongsEntry, StrongsWordData } from './strongsService';

export async function cacheStrongsEntry(entry: StrongsEntry): Promise<void> {
  try {
    await run(
      `INSERT OR REPLACE INTO strongs_dictionary
       (strongs_id, original_word, transliteration, short_definition, full_definition,
        language, usage_count, part_of_speech, cross_references)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.strongsId,
        entry.originalWord,
        entry.transliteration,
        entry.shortDefinition,
        entry.fullDefinition,
        entry.language,
        entry.usageCount ?? null,
        entry.partOfSpeech,
        entry.crossReferences,
      ],
    );
  } catch (e) {
    console.warn('Failed to cache Strongs entry:', e);
  }
}

export async function getCachedStrongsEntry(
  strongsId: string,
): Promise<StrongsEntry | null> {
  try {
    const row = await queryFirst<any>(
      `SELECT * FROM strongs_dictionary WHERE strongs_id = ?`,
      [strongsId],
    );
    if (!row) return null;
    return {
      strongsId: row.strongs_id,
      originalWord: row.original_word,
      transliteration: row.transliteration,
      shortDefinition: row.short_definition,
      fullDefinition: row.full_definition,
      language: row.language,
      partOfSpeech: row.part_of_speech,
      usageCount: row.usage_count,
      crossReferences: row.cross_references,
      grammaticalCase: null,
      gender: null,
      number: null,
    };
  } catch {
    return null;
  }
}

export async function searchCachedStrongs(
  query: string,
  limit = 50,
): Promise<StrongsEntry[]> {
  try {
    const rows = await queryAll<any>(
      `SELECT * FROM strongs_fts
       WHERE strongs_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [query, limit],
    );
    return rows.map(mapRowToEntry);
  } catch {
    return [];
  }
}

function mapRowToEntry(row: any): StrongsEntry {
  return {
    strongsId: row.strongs_id,
    originalWord: row.original_word,
    transliteration: row.transliteration,
    shortDefinition: row.short_definition,
    fullDefinition: row.full_definition,
    language: row.language,
    partOfSpeech: row.part_of_speech,
    usageCount: row.usage_count,
    crossReferences: row.cross_references,
    grammaticalCase: null,
    gender: null,
    number: null,
  };
}

export async function cacheVerseWords(
  bookName: string,
  chapter: number,
  verseNumber: number | undefined,
  words: StrongsWordData[],
): Promise<void> {
  try {
    const key = `verse_words:${bookName}:${chapter}:${verseNumber ?? 'all'}`;
    await run(
      `INSERT OR REPLACE INTO user_data_cache (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [key, JSON.stringify(words)],
    );
  } catch (e) {
    console.warn('Failed to cache verse words:', e);
  }
}

export async function getCachedVerseWords(
  bookName: string,
  chapter: number,
  verseNumber: number | undefined,
): Promise<StrongsWordData[] | null> {
  try {
    const key = `verse_words:${bookName}:${chapter}:${verseNumber ?? 'all'}`;
    const row = await queryFirst<{ value: string }>(
      `SELECT value FROM user_data_cache WHERE key = ?`,
      [key],
    );
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
