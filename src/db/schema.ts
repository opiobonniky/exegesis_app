/**
 * schema.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full SQL schema for the offline SQLite database (exegesis.db).
 *
 * Managed by `migrations.ts` — applied incrementally via the schema_version table.
 * Do NOT import this file directly; use `database.ts` → `migrations.ts`.
 *
 * ⚠️  Schema version history:
 *   v1 — Verse storage, translations, books, offline queue, strongs dict
 *   FTS5 virtual tables attempted separately; failure is non-fatal
 *   v2 — Typed cache tables: app_cache, trivia_questions, daily_content_cache, reading_plan_cache
 */

export const SCHEMA_VERSION = 2;

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

-- ─── Schema Version Tracking ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * FTS5 virtual tables and triggers.
 * Created separately because FTS5 may not be available in all SQLite builds.
 * The migration handles failure gracefully.
 */
export const FTS_SQL = `
-- Verse text FTS
CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
  translation_id UNINDEXED,
  book_id UNINDEXED,
  chapter UNINDEXED,
  verse UNINDEXED,
  text,
  tokenize='porter unicode61'
);

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

-- Strong's dictionary FTS
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
`;

export const V2_SQL = `
-- ─── App Cache (typed key-value, replaces AsyncStorage caches) ──────────

CREATE TABLE IF NOT EXISTS app_cache (
  cache_key       TEXT PRIMARY KEY,
  content_type    TEXT NOT NULL DEFAULT 'json',
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_cache_type
  ON app_cache(content_type, updated_at);

-- ─── Trivia Questions (offline cache) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS trivia_questions (
  id              INTEGER PRIMARY KEY,
  question        TEXT NOT NULL,
  options_json    TEXT NOT NULL,
  correct_answer  INTEGER,
  explanation     TEXT,
  book_name       TEXT,
  chapter         INTEGER,
  verse_number    INTEGER,
  category        TEXT,
  difficulty      TEXT,
  fetched_at      TEXT NOT NULL DEFAULT (datetime('now')),
  answered_online INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_trivia_difficulty
  ON trivia_questions(difficulty);

-- ─── Daily Content Cache ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_content_cache (
  content_type    TEXT NOT NULL,
  date_key        TEXT NOT NULL,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (content_type, date_key)
);

-- ─── Reading Plans Cache ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reading_plan_cache (
  cache_key       TEXT PRIMARY KEY,
  plan_id         TEXT,
  value           TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'plan_list',
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rp_cache_plan
  ON reading_plan_cache(plan_id);
`;
