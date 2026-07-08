/**
 * schema.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full SQL schema for the offline SQLite database (exegesis.db).
 *
 * Managed by `migrations.ts` — applied incrementally via the schema_version table.
 * Do NOT import this file directly; use `database.ts` → `migrations.ts`.
 *
 * ⚠️  Schema version history:
 *   v1 — Verse storage, translations, books, FTS5, offline queue, strongs dict
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
-- ────────────────────────────────────────────────────────────────────────────
-- Version 1 — Verse Storage, Translations, Books, FTS5
-- ────────────────────────────────────────────────────────────────────────────

-- Translations metadata
CREATE TABLE IF NOT EXISTS translations (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  abbreviation    TEXT NOT NULL,
  description     TEXT,
  year            INTEGER,
  is_local        INTEGER NOT NULL DEFAULT 1,
  is_cached       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Books metadata (standard 66-book canon)
CREATE TABLE IF NOT EXISTS books (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  testament       TEXT NOT NULL,
  chapter_count   INTEGER NOT NULL,
  verse_count     INTEGER NOT NULL DEFAULT 0
);

-- Verse text — the core table
CREATE TABLE IF NOT EXISTS verses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id  TEXT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
  book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter         INTEGER NOT NULL,
  verse           INTEGER NOT NULL,
  text            TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(translation_id, book_id, chapter, verse)
);

-- FTS5 virtual table for full-text search across all cached translations
CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
  translation_id UNINDEXED,
  book_id UNINDEXED,
  chapter UNINDEXED,
  verse UNINDEXED,
  text,
  tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
  INSERT INTO verses_fts(translation_id, book_id, chapter, verse, text)
  VALUES (new.translation_id, new.book_id, new.chapter, new.verse, new.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, translation_id, book_id, chapter, verse, text)
  VALUES ('delete', old.translation_id, old.book_id, old.chapter, old.verse, old.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, translation_id, book_id, chapter, verse, text)
  VALUES ('delete', old.translation_id, old.book_id, old.chapter, old.verse, old.text);
  INSERT INTO verses_fts(translation_id, book_id, chapter, verse, text)
  VALUES (new.translation_id, new.book_id, new.chapter, new.verse, new.text);
END;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_verses_lookup
  ON verses(translation_id, book_id, chapter, verse);
CREATE INDEX IF NOT EXISTS idx_verses_chapter
  ON verses(translation_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_verses_translation
  ON verses(translation_id);

-- User data cache (synced from backend when online)
CREATE TABLE IF NOT EXISTS user_data_cache (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Offline Mutation Queue ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offline_queue (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  payload         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status
  ON offline_queue(status, created_at);

-- ─── Strong's Dictionary ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS strongs_dictionary (
  strongs_id      TEXT PRIMARY KEY,
  original_word   TEXT,
  transliteration TEXT,
  pronunciation   TEXT,
  short_definition TEXT NOT NULL,
  full_definition  TEXT,
  language        TEXT NOT NULL DEFAULT 'greek',
  usage_count     INTEGER,
  part_of_speech  TEXT,
  cross_references TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS strongs_fts USING fts5(
  strongs_id UNINDEXED,
  original_word,
  transliteration,
  short_definition,
  full_definition,
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS strongs_ai AFTER INSERT ON strongs_dictionary BEGIN
  INSERT INTO strongs_fts(strongs_id, original_word, transliteration, short_definition, full_definition)
  VALUES (new.strongs_id, new.original_word, new.transliteration, new.short_definition, new.full_definition);
END;

-- ─── Schema Version Tracking ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
