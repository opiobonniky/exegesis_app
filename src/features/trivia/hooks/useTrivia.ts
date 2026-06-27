import { useState, useCallback, useRef } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  getRandomQuestion,
  submitTriviaAnswer,
  getTriviaStats,
  TriviaQuestionResponse,
  TriviaAnswerResult,
  TriviaStats,
} from '../services/triviaApi';

export type TriviaPhase = 'playing' | 'answered' | 'finished';
export type DifficultyFilter = 'easy' | 'medium' | 'hard' | null;

export interface TriviaState {
  phase: TriviaPhase;
  question: TriviaQuestionResponse | null;
  selectedAnswer: number | null;
  result: TriviaAnswerResult | null;
  score: { correct: number; total: number };
  stats: TriviaStats | null;
  loading: boolean;
  error: string | null;
  questionIdsSeen: number[];
  difficulty: DifficultyFilter;
  totalCount: number;
  streak: number;
}

export function useTrivia() {
  const [state, setState] = useState<TriviaState>({
    phase: 'playing',
    question: null,
    selectedAnswer: null,
    result: null,
    score: { correct: 0, total: 0 },
    stats: null,
    loading: true,
    error: null,
    questionIdsSeen: [],
    difficulty: null,
    totalCount: 0,
    streak: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((partial: Partial<TriviaState>) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      stateRef.current = next;
      return next;
    });
  }, []);

  /** Fetch a random question, excluding ones already seen, filtered by difficulty */
  const fetchQuestion = useCallback(async () => {
    update({ loading: true, error: null, selectedAnswer: null, result: null, phase: 'playing' });
    try {
      const question = await getRandomQuestion(
        stateRef.current.questionIdsSeen,
        stateRef.current.difficulty,
      );
      if (!question) {
        // No more questions available — show final score
        update({ loading: false, phase: 'finished', question: null });
        return;
      }
      const answeredSoFar = stateRef.current.score.total;
      const totalCount = answeredSoFar + 1 + (question.totalRemaining || 0);
      update({
        question,
        loading: false,
        totalCount,
        questionIdsSeen: [...stateRef.current.questionIdsSeen, question.id],
      });
    } catch (e: any) {
      update({ loading: false, error: e?.message || 'Failed to load question' });
    }
  }, [update]);

  /** Submit the user's selected answer */
  const answer = useCallback(async (selectedAnswer: number) => {
    const q = stateRef.current.question;
    if (!q) return;

    update({ selectedAnswer, loading: true, error: null });
    try {
      const result = await submitTriviaAnswer(q.id, selectedAnswer);

      // Play haptic feedback
      try {
        ReactNativeHapticFeedback.trigger(
          result.isCorrect ? 'notificationSuccess' : 'notificationError',
          { enableVibrateFallback: true, ignoreAndroidSystemSettings: false },
        );
      } catch {
        // Haptic not supported — silently continue
      }

      const newScore = {
        correct: stateRef.current.score.correct + (result.isCorrect ? 1 : 0),
        total: stateRef.current.score.total + 1,
      };
      const newStreak = result.isCorrect ? stateRef.current.streak + 1 : 0;
      update({
        result,
        score: newScore,
        streak: newStreak,
        loading: false,
        phase: 'answered',
      });
    } catch (e: any) {
      update({ loading: false, error: e?.message || 'Failed to submit answer' });
    }
  }, [update]);

  /** Move to the next question */
  const nextQuestion = useCallback(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  /** Fetch trivia stats */
  const fetchStats = useCallback(async () => {
    try {
      const stats = await getTriviaStats();
      update({ stats });
    } catch {
      // stats are non-critical
    }
  }, [update]);

  /** Set difficulty filter and refetch */
  const setDifficulty = useCallback((difficulty: DifficultyFilter) => {
    update({ difficulty, questionIdsSeen: [] });
  }, [update]);

  /** Reset the game */
  const reset = useCallback(() => {
    setState({
      phase: 'playing',
      question: null,
      selectedAnswer: null,
      result: null,
      score: { correct: 0, total: 0 },
      stats: null,
      loading: true,
      error: null,
      questionIdsSeen: [],
      difficulty: stateRef.current.difficulty,
      totalCount: 0,
      streak: 0,
    });
    // fetchQuestion will be called by the component after reset
  }, []);

  return {
    ...state,
    fetchQuestion,
    answer,
    nextQuestion,
    fetchStats,
    reset,
    setDifficulty,
  };
}
