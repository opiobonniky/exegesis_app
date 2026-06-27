import { sendPostRequest } from '../../../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TriviaQuestionResponse {
  id: number;
  question: string;
  optionsJson: string;     // JSON array of strings
  explanation: string | null;
  bookName: string | null;
  chapter: number | null;
  verseNumber: number | null;
  category: string | null;
  difficulty: string | null;
  totalRemaining?: number;
}

export interface TriviaAnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  correctAnswerText: string;
  explanation: string | null;
}

export interface TriviaStats {
  totalAnswered: number;
  correct: number;
  incorrect: number;
  percentage: number;
}

// ── API Functions ────────────────────────────────────────────────────────────────

export const getRandomQuestion = async (
  excludeIds?: number[],
  difficulty?: string | null,
): Promise<TriviaQuestionResponse | null> => {
  const res = await sendPostRequest<TriviaQuestionResponse>('trivia', 'random', {
    excludeIds: excludeIds || [],
    ...(difficulty ? { difficulty } : {}),
  });
  return res.returnData ?? null;
};

export const submitTriviaAnswer = async (
  questionId: number,
  selectedAnswer: number,
): Promise<TriviaAnswerResult> => {
  const res = await sendPostRequest<TriviaAnswerResult>('trivia', 'submit', {
    questionId,
    selectedAnswer,
  });
  if (!res.returnData) throw new Error('No response data');
  return res.returnData;
};

export const getTriviaStats = async (): Promise<TriviaStats> => {
  const res = await sendPostRequest<TriviaStats>('trivia', 'stats', {});
  if (!res.returnData) {
    return { totalAnswered: 0, correct: 0, incorrect: 0, percentage: 0 };
  }
  return res.returnData;
};

/** Parse the JSON `optionsJson` field into a string array */
export const parseOptions = (optionsJson: string): string[] => {
  try {
    const parsed = JSON.parse(optionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
