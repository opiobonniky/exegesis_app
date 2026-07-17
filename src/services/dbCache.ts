import { run, queryFirst } from '../db/database';

export async function setCache(key: string, value: any, contentType = 'json'): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO app_cache (cache_key, content_type, value, updated_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [key, contentType, JSON.stringify(value)],
  );
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const row = await queryFirst<{ value: string }>(
    'SELECT value FROM app_cache WHERE cache_key = ?',
    [key],
  );
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

export async function deleteCache(key: string): Promise<void> {
  await run('DELETE FROM app_cache WHERE cache_key = ?', [key]);
}

export async function clearCacheByType(contentType: string): Promise<void> {
  await run('DELETE FROM app_cache WHERE content_type = ?', [contentType]);
}

// ── Daily Content Cache ──────────────────────────────────────────────────

export async function setDailyContent(
  contentType: string,
  dateKey: string,
  value: any,
): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO daily_content_cache (content_type, date_key, value, updated_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [contentType, dateKey, JSON.stringify(value)],
  );
}

export async function getDailyContent<T = any>(
  contentType: string,
  dateKey: string,
): Promise<T | null> {
  const row = await queryFirst<{ value: string }>(
    'SELECT value FROM daily_content_cache WHERE content_type = ? AND date_key = ?',
    [contentType, dateKey],
  );
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

// ── Reading Plan Cache ──────────────────────────────────────────────────

export async function setPlanCache(
  cacheKey: string,
  value: any,
  planId?: string,
  contentType = 'plan_list',
): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO reading_plan_cache (cache_key, plan_id, value, content_type, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [cacheKey, planId ?? null, JSON.stringify(value), contentType],
  );
}

export async function getPlanCache<T = any>(cacheKey: string): Promise<T | null> {
  const row = await queryFirst<{ value: string }>(
    'SELECT value FROM reading_plan_cache WHERE cache_key = ?',
    [cacheKey],
  );
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

// ── Trivia Cache ─────────────────────────────────────────────────────────

export interface TriviaCachedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | null;
  explanation: string | null;
  bookName: string | null;
  chapter: number | null;
  verseNumber: number | null;
  category: string | null;
  difficulty: string | null;
  answeredOnline: boolean;
}

export async function upsertTriviaQuestion(q: {
  id: number;
  question: string;
  options: string[];
  correctAnswer?: number | null;
  explanation?: string | null;
  bookName?: string | null;
  chapter?: number | null;
  verseNumber?: number | null;
  category?: string | null;
  difficulty?: string | null;
  answeredOnline?: boolean;
}): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO trivia_questions
     (id, question, options_json, correct_answer, explanation,
      book_name, chapter, verse_number, category, difficulty,
      fetched_at, answered_online)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    [
      q.id,
      q.question,
      JSON.stringify(q.options),
      q.correctAnswer ?? null,
      q.explanation ?? null,
      q.bookName ?? null,
      q.chapter ?? null,
      q.verseNumber ?? null,
      q.category ?? null,
      q.difficulty ?? null,
      q.answeredOnline ? 1 : 0,
    ],
  );
}

export async function updateTriviaAnswer(
  questionId: number,
  correctAnswer: number,
): Promise<void> {
  await run(
    `UPDATE trivia_questions SET correct_answer = ?, answered_online = 1 WHERE id = ?`,
    [correctAnswer, questionId],
  );
}

export async function getTriviaQuestion(id: number): Promise<TriviaCachedQuestion | null> {
  const row = await queryFirst<any>(
    'SELECT * FROM trivia_questions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  return rowToTriviaCached(row);
}

export async function getRandomCachedQuestion(
  excludeIds: number[],
  difficulty?: string | null,
): Promise<TriviaCachedQuestion | null> {
  const excludePlaceholders = excludeIds.length > 0
    ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})`
    : '';
  const diffFilter = difficulty ? 'AND difficulty = ?' : '';
  const sql = `SELECT * FROM trivia_questions
    WHERE correct_answer IS NOT NULL ${excludePlaceholders} ${diffFilter}
    ORDER BY RANDOM() LIMIT 1`;
  const params: any[] = [...excludeIds];
  if (difficulty) params.push(difficulty);
  const row = await queryFirst<any>(sql, params);
  if (!row) return null;
  return rowToTriviaCached(row);
}

function rowToTriviaCached(row: any): TriviaCachedQuestion {
  return {
    id: row.id,
    question: row.question,
    options: JSON.parse(row.options_json || '[]'),
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    bookName: row.book_name,
    chapter: row.chapter,
    verseNumber: row.verse_number,
    category: row.category,
    difficulty: row.difficulty,
    answeredOnline: !!row.answered_online,
  };
}

export async function getCachedTriviaStats(): Promise<{
  totalAnswered: number;
  correct: number;
  incorrect: number;
  percentage: number;
} | null> {
  const row = await queryFirst<{ value: string }>(
    "SELECT value FROM app_cache WHERE cache_key = 'trivia_stats'",
  );
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function saveCachedTriviaStats(stats: any): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO app_cache (cache_key, content_type, value, updated_at)
     VALUES ('trivia_stats', 'trivia_stats', ?, datetime('now'))`,
    [JSON.stringify(stats)],
  );
}
