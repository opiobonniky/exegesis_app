import { sendPostRequest } from '../../../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TriviaQuestionResponse {
  id: number;
  question: string;
  optionsJson: string; // JSON array of strings
  correctAnswer?: number;
  explanation: string | null;
  bookName: string | null;
  chapter: number | null;
  verseNumber: number | null;
  category: string | null;
  difficulty: string | null;
  isActive?: boolean;
  createdOn?: string;
  updatedOn?: string;
  totalRemaining?: number;
}

export interface TriviaQuestionListResponse {
  data: TriviaQuestionResponse[];
  total: number;
  hasNext: boolean;
}

export interface SaveTriviaQuestionPayload {
  id?: number;
  question: string;
  optionsJson: string;
  correctAnswer: number;
  explanation?: string | null;
  bookName?: string | null;
  chapter?: number | null;
  verseNumber?: number | null;
  category?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
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

// ── Admin Analytics Types ──────────────────────────────────────────────────────

export interface TriviaAdminOverview {
  totalParticipants: number;
  totalAnswers: number;
  averageScore: number;
  dailyActiveParticipants: number;
  todayAnswers: number;
  difficultyBreakdown: Record<string, { total: number; correct: number }>;
}

export interface TriviaUserPerformance {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  totalAnswered: number;
  correct: number;
  incorrect: number;
  percentage: number;
  lastAnsweredDate: string | null;
}

export interface TriviaUserPerformanceListResponse {
  data: TriviaUserPerformance[];
  total: number;
  hasNext: boolean;
}

export interface TriviaUserPerformanceDetail {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    createdOn: string;
  };
  stats: {
    totalAnswered: number;
    correct: number;
    incorrect: number;
    percentage: number;
  };
  answers: Array<{
    id: number;
    questionId: number;
    selectedAnswer: number;
    isCorrect: boolean;
    answeredOn: string;
    question: string;
    difficulty: string | null;
    category: string | null;
  }>;
}

export interface TriviaQuestionPerformance {
  questionId: number;
  question: string;
  difficulty: string | null;
  category: string | null;
  timesAnswered: number;
  timesCorrect: number;
  timesIncorrect: number;
  percentage: number;
}

export interface TriviaQuestionPerformanceResponse {
  data: TriviaQuestionPerformance[];
  total: number;
  hasNext: boolean;
}

// ── API Functions ────────────────────────────────────────────────────────────────

export const getRandomQuestion = async (
  excludeIds?: number[],
  difficulty?: string | null,
): Promise<TriviaQuestionResponse | null> => {
  const res = await sendPostRequest<TriviaQuestionResponse>(
    'trivia',
    'random',
    {
      excludeIds: excludeIds || [],
      ...(difficulty ? { difficulty } : {}),
    },
  );
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

export const getAllTriviaQuestions = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  difficulty?: string | null;
  category?: string | null;
  isActive?: boolean;
}): Promise<TriviaQuestionListResponse> => {
  const res = await sendPostRequest<TriviaQuestionListResponse>(
    'trivia',
    'get-all',
    {
      page: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params?.category ? { category: params.category } : {}),
      ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
    },
  );

  return res.returnData ?? { data: [], total: 0, hasNext: false };
};

export const saveTriviaQuestion = async (
  payload: SaveTriviaQuestionPayload,
): Promise<TriviaQuestionResponse> => {
  const endpoint = payload.id ? 'update' : 'create';
  const res = await sendPostRequest<TriviaQuestionResponse>(
    'trivia',
    endpoint,
    payload,
  );

  if (!res.returnData) {
    throw new Error(res.returnMessage || 'Failed to save trivia question');
  }
  return res.returnData;
};

export const deleteTriviaQuestion = async (id: number): Promise<void> => {
  const res = await sendPostRequest('trivia', 'delete', { id });
  if (res.returnCode !== 200) {
    throw new Error(res.returnMessage || 'Failed to delete trivia question');
  }
};

// ── Admin Analytics API ────────────────────────────────────────────────────────

export const getTriviaAdminOverview =
  async (): Promise<TriviaAdminOverview> => {
    const res = await sendPostRequest<TriviaAdminOverview>(
      'trivia',
      'admin/overview',
      {},
    );
    if (!res.returnData) {
      return {
        totalParticipants: 0,
        totalAnswers: 0,
        averageScore: 0,
        dailyActiveParticipants: 0,
        todayAnswers: 0,
        difficultyBreakdown: {},
      };
    }
    return res.returnData;
  };

export const getTriviaUserPerformanceList = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<TriviaUserPerformanceListResponse> => {
  const res = await sendPostRequest<TriviaUserPerformanceListResponse>(
    'trivia',
    'admin/user-performance',
    {
      page: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params?.sortOrder ? { sortOrder: params.sortOrder } : {}),
    },
  );
  return res.returnData ?? { data: [], total: 0, hasNext: false };
};

export const getTriviaUserPerformanceDetail = async (
  userId: string,
): Promise<TriviaUserPerformanceDetail | null> => {
  const res = await sendPostRequest<TriviaUserPerformanceDetail>(
    'trivia',
    'admin/user-performance-detail',
    { userId },
  );
  return res.returnData ?? null;
};

export const getTriviaQuestionPerformance = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  difficulty?: string | null;
  category?: string | null;
  sortBy?: string;
  sortOrder?: string;
}): Promise<TriviaQuestionPerformanceResponse> => {
  const res = await sendPostRequest<TriviaQuestionPerformanceResponse>(
    'trivia',
    'admin/question-performance',
    {
      page: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params?.category ? { category: params.category } : {}),
      ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params?.sortOrder ? { sortOrder: params.sortOrder } : {}),
    },
  );
  return res.returnData ?? { data: [], total: 0, hasNext: false };
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
