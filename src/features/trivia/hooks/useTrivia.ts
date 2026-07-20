import { useState, useCallback, useRef, useEffect } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  getRandomQuestion,
  submitTriviaAnswer,
  getTriviaStats,
  getAnsweredQuestionIds,
  TriviaQuestionResponse,
  TriviaAnswerResult,
  TriviaStats,
} from '../services/triviaApi';
import {
  preFetchTriviaQuestions,
  getCachedRandomQuestion,
  getCachedCount,
  ensureCacheFresh,
  saveCachedStats,
} from '../services/triviaCache';

export type TriviaPhase = 'plan' | 'playing' | 'answered' | 'finished';
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
    phase: 'plan',
    question: null,
    selectedAnswer: null,
    result: null,
    score: { correct: 0, total: 0 },
    stats: null,
    loading: false,
    error: null,
    questionIdsSeen: [],
    difficulty: null,
    totalCount: 0,
    streak: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const answeredIdsRef = useRef<number[]>([]);

  const update = useCallback((partial: Partial<TriviaState>) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    preFetchTriviaQuestions();
    getAnsweredQuestionIds().then(ids => {
      answeredIdsRef.current = ids;
      update({ questionIdsSeen: ids });
    }).catch(() => {});
  }, [update]);

  /** Fetch a random question — try cache first for instant response, API fallback */
  const fetchQuestion = useCallback(async () => {
    const seen = stateRef.current.questionIdsSeen;
    const diff = stateRef.current.difficulty;

    // Try cache first (instant — no loading flash)
    const cachedQ = await getCachedRandomQuestion(seen, diff);
    if (cachedQ) {
      // Fire background API fetch to keep totalCount accurate + refill cache
      getRandomQuestion(seen, diff).then(apiQ => {
        if (apiQ?.totalRemaining !== undefined) {
          const answeredSoFar = stateRef.current.score.total;
          update({ totalCount: answeredSoFar + 1 + apiQ.totalRemaining });
        }
      }).catch(() => {});
      ensureCacheFresh(diff);

      update({
        question: cachedQ,
        loading: false,
        error: null,
        selectedAnswer: null,
        result: null,
        phase: 'playing',
        totalCount: Math.max(stateRef.current.totalCount, seen.length + 1),
        questionIdsSeen: [...seen, cachedQ.id],
      });
      return;
    }

    // Cache miss — fetch from API with loading indicator
    update({ loading: true, error: null, selectedAnswer: null, result: null, phase: 'playing' });
    try {
      const question = await getRandomQuestion(seen, diff);
      if (!question) {
        update({ loading: false, phase: 'finished', question: null });
        return;
      }
      const answeredSoFar = stateRef.current.score.total;
      const totalCount = answeredSoFar + 1 + (question.totalRemaining || 0);
      update({
        question,
        loading: false,
        totalCount,
        questionIdsSeen: [...seen, question.id],
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

      // Update local stats instantly so the plan screen reflects latest performance
      const prevStats = stateRef.current.stats;
      if (prevStats) {
        const newStats = {
          totalAnswered: prevStats.totalAnswered + 1,
          correct: prevStats.correct + (result.isCorrect ? 1 : 0),
          incorrect: prevStats.incorrect + (result.isCorrect ? 0 : 1),
          percentage: Math.round(
            ((prevStats.correct + (result.isCorrect ? 1 : 0)) /
              (prevStats.totalAnswered + 1)) *
              100,
          ),
        };
        saveCachedStats(newStats);
        update({ stats: newStats });
      }

      // On the 10th answer submission, pre-fetch next batch in background
      if (newScore.total === 10) {
        ensureCacheFresh(stateRef.current.difficulty);
      }

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

  /** Start a new quiz from the plan screen */
  const startQuiz = useCallback(() => {
    fetchQuestion();
  }, [fetchQuestion]);

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
    update({ difficulty, questionIdsSeen: [...answeredIdsRef.current] });
  }, [update]);

  /** Reset the game — return to plan screen */
  const reset = useCallback(() => {
    setState({
      phase: 'plan',
      question: null,
      selectedAnswer: null,
      result: null,
      score: { correct: 0, total: 0 },
      stats: stateRef.current.stats,
      loading: false,
      error: null,
      questionIdsSeen: [...answeredIdsRef.current],
      difficulty: stateRef.current.difficulty,
      totalCount: 0,
      streak: 0,
    });
  }, []);

  return {
    ...state,
    fetchQuestion,
    answer,
    nextQuestion,
    fetchStats,
    reset,
    setDifficulty,
    startQuiz,
  };
}
