import { sendPostRequest } from '../../../services/api';
import {
  upsertTriviaQuestion,
  getRandomCachedQuestion,
  getCachedTriviaStats,
  saveCachedTriviaStats,
  type TriviaCachedQuestion,
} from '../../../services/dbCache';
import { TriviaQuestionResponse, TriviaAnswerResult, parseOptions } from './triviaApi';

const MAX_CACHED = 15;
const REFILL_THRESHOLD = 5;

export async function getCachedCount(difficulty?: string | null): Promise<number> {
  const { queryFirst } = await import('../../../db/database');
  const diffFilter = difficulty ? 'AND difficulty = ?' : '';
  const params: any[] = [];
  if (difficulty) params.push(difficulty);
  const row = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) AS count FROM trivia_questions WHERE correct_answer IS NOT NULL ${diffFilter}`,
    params,
  );
  return row?.count ?? 0;
}

export async function refillCache(difficulty?: string | null): Promise<void> {
  try {
    const existing = await getCachedCount(difficulty);
    if (existing >= MAX_CACHED) return;
    const needed = MAX_CACHED - existing;
    const res = await sendPostRequest<{ data: TriviaQuestionResponse[] }>(
      'trivia', 'get-all', { page: 0, pageSize: needed, isActive: true },
    );
    if (res.returnCode === 200 && res.returnData?.data) {
      for (const q of res.returnData.data) {
        await upsertTriviaQuestion(toCachedQuestion(q));
      }
    }
  } catch {
    // silent — pre-fetch is best-effort
  }
}

export async function preFetchTriviaQuestions(): Promise<void> {
  return refillCache();
}

export async function ensureCacheFresh(difficulty?: string | null): Promise<void> {
  const count = await getCachedCount(difficulty);
  if (count <= REFILL_THRESHOLD) {
    refillCache(difficulty);
  }
}

function toCachedQuestion(q: TriviaQuestionResponse): TriviaCachedQuestion {
  return {
    id: q.id,
    question: q.question,
    options: parseOptions(q.optionsJson),
    correctAnswer: q.correctAnswer ?? null,
    explanation: q.explanation || null,
    bookName: q.bookName || null,
    chapter: q.chapter ?? null,
    verseNumber: q.verseNumber ?? null,
    category: q.category || null,
    difficulty: q.difficulty || null,
    answeredOnline: false,
  };
}

export async function cacheTriviaQuestions(questions: TriviaQuestionResponse[]): Promise<void> {
  for (const q of questions) {
    await upsertTriviaQuestion(toCachedQuestion(q));
  }
}

export async function loadAllCachedQuestions(): Promise<TriviaCachedQuestion[]> {
  const { queryAll } = await import('../../../db/database');
  const rows = await queryAll<any>(
    'SELECT * FROM trivia_questions ORDER BY fetched_at DESC LIMIT ?',
    [MAX_CACHED],
  );
  return rows.map(rowToCached);
}

function rowToCached(row: any): TriviaCachedQuestion {
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

/**
 * Return a random cached question for display.
 * The correctAnswer is intentionally omitted to prevent leaking.
 */
export async function getCachedRandomQuestion(
  excludeIds: number[],
  difficulty?: string | null,
): Promise<TriviaQuestionResponse | null> {
  const cached = await getRandomCachedQuestion(excludeIds, difficulty);
  if (!cached || cached.correctAnswer === null) return null;
  return {
    id: cached.id,
    question: cached.question,
    optionsJson: JSON.stringify(cached.options),
    correctAnswer: undefined,
    explanation: cached.explanation || null,
    bookName: cached.bookName || null,
    chapter: cached.chapter ?? null,
    verseNumber: cached.verseNumber ?? null,
    category: cached.category || null,
    difficulty: cached.difficulty || null,
  };
}

/**
 * Verify an answer offline using the cached question's stored answer.
 * Only call when the question was previously answered online or
 * the correctAnswer is known.
 */
export function buildOfflineAnswerResult(
  question: TriviaCachedQuestion,
  selectedAnswer: number,
): TriviaAnswerResult {
  return {
    isCorrect: selectedAnswer === question.correctAnswer,
    correctAnswer: question.correctAnswer ?? 0,
    correctAnswerText: '',
    explanation: question.explanation || null,
  };
}

export { getCachedTriviaStats as getCachedStats, saveCachedTriviaStats as saveCachedStats };
