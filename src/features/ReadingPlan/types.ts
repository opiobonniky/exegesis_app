// src/screens/reading-plans/types.ts

export interface QuizQuestion {
  question: string;
  options: string[]; // Array of 4 answer options
  correctAnswer: number; // Index of the correct answer (0-3)
  explanation: string; // Explanation shown after answering
}

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  questionsEnabled: boolean;
  category?: 'intro' | 'whole-bible' | 'nt' | 'ot' | 'book' | 'topical';
  difficulty?: 'easy' | 'medium' | 'hard';
  getDailyAssignment: (day: number) => DailyAssignment | null;
}

export interface DailyAssignment {
  day: number;
  chapters: Array<{
    book: string;
    chapter: number;
  }>;
  questions?: string[]; // Open-ended reflection questions (fallback)
  quizQuestions?: QuizQuestion[]; // Multiple choice quiz questions
}

export interface UserPlanProgress {
  planId: string;
  startDate: string; // ISO date string
  completedDays: number[]; // Array of completed day numbers
  lastCompletedDate?: string; // ISO date string
  streak: number; // Current consecutive days streak
}
