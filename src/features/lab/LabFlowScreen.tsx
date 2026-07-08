import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Share,
  Vibration,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import { ttsService } from '../../services/ttsService';
import ActionHeader from '../../reusable/ActionHeader';
import { showToast } from '../../helpers/Toash.helper';
import BookSelectorScreen from '../bible/components/BookSelectorScreen';
import ChapterSelectorScreen from '../bible/components/ChapterSelectorScreen';
import {
  StrongsWordData,
} from '../../services/strongsService';
import { bibleTTS } from '../../utilits/bibleTTS';
import StrongsWordModal from './components/StrongsWordModal';
import PassageSelectionStep from './components/PassageSelectionStep';
import LookStage from './components/LookStage';
import ListenStage from './components/ListenStage';
import LearnStage from './components/LearnStage';
import AbideStage from './components/AbideStage';
import CompletedStage from './components/CompletedStage';
import { useStrongsWordModal } from './hooks/useStrongsWordModal';
import { LOOK_PROMPTS, STAGE_ORDER } from './constants';
import { PassageSubStage } from './types';
import { useLabBooks } from './hooks/useLabBooks';
import { useLabPassageData } from './hooks/useLabPassageData';
import { useLabLookStrongs } from './hooks/useLabLookStrongs';
import { useLabLearnData } from './hooks/useLabLearnData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Component ────────────────────────────────────────────────────────────────
export default function LabFlowScreen() {
  const navigation = useNavigation<any>();
  const navRoute = useRoute<any>();
  const routeParams = navRoute.params || {};


  console.log('LabFlowScreen routeParams:', routeParams);


  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const translationId = app?.bibleVersionId || 'Berean';
  const { books, booksLoading } = useLabBooks(translationId);
  const hasInitialPassage = Boolean(
    routeParams.bookName && routeParams.chapter && routeParams.verseStart,
  );

  const requestedInitialStage = routeParams.stage || 'passage';
  const initialStage =
    requestedInitialStage !== 'passage' && !hasInitialPassage
      ? 'passage'
      : requestedInitialStage;

  // ── Swipeable carousel ──────────────────────────────────────────────────
  const carouselRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // ── Learn stage tab row ref (horizontal scroll with programmatic auto-scroll) ─
  const tabRowRef = useRef<ScrollView |any>(null);
  const tabPositions = useRef<Record<string, number>>({});
  const [tabScrollX, setTabScrollX] = useState(0);
  const [tabContentWidth, setTabContentWidth] = useState(0);
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const isTabScrollable = tabContentWidth > tabContainerWidth;
  const showRightChevron = isTabScrollable && tabScrollX < tabContentWidth - tabContainerWidth - 10;
  const showLeftChevron = isTabScrollable && tabScrollX > 10;
  const [pageIndex, setPageIndex] = useState(() => {
    const idx = STAGE_ORDER.indexOf(
      initialStage as (typeof STAGE_ORDER)[number],
    );
    return idx >= 0 ? idx : 0;
  });

  // ── State: session & stage ─────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(
    routeParams.sessionId || null,
  );
  const [stage, setStage] = useState<string>(initialStage);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // ── Passage selection ─────────────────────────────────────────────────────
  const [passageRef, setPassageRef] = useState(routeParams.passageRef || '');
  const [bookName, setBookName] = useState(routeParams.bookName || '');
  const [chapter, setChapter] = useState(routeParams.chapter?.toString() || '');
  const [verseStart, setVerseStart] = useState(
    routeParams.verseStart?.toString() || '',
  );
  const [verseEnd, setVerseEnd] = useState(
    routeParams.verseEnd?.toString() || '',
  );

  // ── Book/chapter selection flow ─────────────────────────────────────────
  const [subStage, setSubStage] = useState<PassageSubStage>(
    routeParams.bookName && routeParams.chapter
      ? 'verse'
      : routeParams.bookName
        ? 'chapter'
        : 'book',
  );
  const [maxChapters, setMaxChapters] = useState(0);
  const {
    availableVerses,
    availableVersesLoading,
    passageVerses,
    passageVersesLoading,
    setAvailableVerses,
    setPassageVerses,
  } = useLabPassageData({
    translationId,
    bookName,
    chapter,
    verseStart,
    verseEnd,
    stage,
  });

  useEffect(() => {
    if (!bookName || books.length === 0) return;
    const found = books.find(b => b.name === bookName);
    if (found) setMaxChapters(found.chapters);
  }, [bookName, books]);

  useEffect(() => {
    if (routeParams.sessionId) return;

    if (!routeParams.bookName) {
      setStage('passage');
      setPageIndex(0);
      setSubStage('book');
      setBookName('');
      setChapter('');
      setVerseStart('');
      setVerseEnd('');
      setPassageVerses([]);
      setAvailableVerses([]);
      return;
    }

    setBookName(routeParams.bookName);

    if (!routeParams.chapter) {
      setStage('passage');
      setPageIndex(0);
      setSubStage('chapter');
      setChapter('');
      setVerseStart('');
      setVerseEnd('');
      setPassageVerses([]);
      setAvailableVerses([]);
      return;
    }

    setChapter(routeParams.chapter.toString());

    if (!routeParams.verseStart) {
      setStage('passage');
      setPageIndex(0);
      setSubStage('verse');
      setVerseStart('');
      setVerseEnd('');
      setPassageVerses([]);
      return;
    }

    setVerseStart(routeParams.verseStart.toString());
    setVerseEnd(routeParams.verseEnd?.toString() || '');
  }, [
    routeParams.bookName,
    routeParams.chapter,
    routeParams.sessionId,
    routeParams.verseEnd,
    routeParams.verseStart,
    setAvailableVerses,
    setPassageVerses,
  ]);

  // ── Look stage ────────────────────────────────────────────────────────────
  const [lookNotes, setLookNotes] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);

  // ── Listen stage ──────────────────────────────────────────────────────────
  const [selectedDuration, setSelectedDuration] = useState<number>(180);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerComplete, setTimerComplete] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerPendingRef = useRef(false);
  const timerRunningRef = useRef(false);
  const timerCompleteRef = useRef(false);
  const timerElapsedRef = useRef(0);
  const repeatCountRef = useRef(0);
  const singlePassageDurationRef = useRef(0);
  const playLoopActiveRef = useRef(false);
  const durationManuallySetRef = useRef(false);
  const currentPlayOffsetBaseRef = useRef(0); // chars from fullPrepared start to current speak() text-start
  const lastKnownCharOffsetRef = useRef(0);    // latest verseCharOffset from onProgress
  const savedCharPositionRef = useRef(0);      // absolute position saved when stopping
  const animatedValue = useRef(new Animated.Value(1)).current;

  // ── Learn stage ───────────────────────────────────────────────────────────
  const [learnNotes, setLearnNotes] = useState('');
  const [learnTab, setLearnTab] = useState<
    'exegesis' | 'language' | 'history' | 'prologue'
  >(routeParams.learnTab || 'exegesis');
  const [verseWords, setVerseWords] = useState<StrongsWordData[]>([]);
  const {
    learnDataLoading,
    verseResources,
    setVerseResources,
    bookPrologue,
    setBookPrologue,
  } = useLabLearnData({
    stage,
    bookName,
    chapter,
    verseStart,
    translationId,
    setVerseWords,
  });
  const {
    selectedWord: selectedStrongsWord,
    selectedEntry: selectedStrongsEntry,
    loading: strongsEntryLoading,
    visible: showStrongsModal,
    openWord: handleStrongsWordPress,
    close: closeStrongsModal,
    clearSelection: clearStrongsSelection,
  } = useStrongsWordModal();

  // ── TTS audio state ──────────────────────────────────────────────────────
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsPaused, setIsTtsPaused] = useState(false);
  const [audioStarting, setAudioStarting] = useState(false);

  // Subscribe to bibleTTS state changes
  useEffect(() => {
    const unsub = bibleTTS.subscribe(state => {
      setIsTtsPlaying(state.isPlaying);
      setIsTtsPaused(state.isPaused);
      if (state.isPlaying || state.isPaused) {
        setAudioStarting(false);
      }
      if (state.isPlaying && timerPendingRef.current) {
        timerPendingRef.current = false;
        setTimerRunning(true);
        setTimerPaused(false);
      }
    });
    return unsub;
  }, []);

  // ── Abide stage ───────────────────────────────────────────────────────────
  const [reflection, setReflection] = useState('');
  const [prayer, setPrayer] = useState('');
  const [appText, setAppText] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);

  // Sync refs with state for use in async callbacks
  useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);
  useEffect(() => { timerCompleteRef.current = timerComplete; }, [timerComplete]);
  useEffect(() => { timerElapsedRef.current = timerElapsed; }, [timerElapsed]);
  useEffect(() => { repeatCountRef.current = repeatCount; }, [repeatCount]);

  // Reset timer and progress state when a new passage is loaded
  useEffect(() => {
    // When the passage reference changes (book/chapter/verse range), clear any lingering timer state
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerElapsed(0);
    setTimerComplete(false);
    setRepeatCount(0);
    timerPendingRef.current = false;
    timerRunningRef.current = false;
    timerCompleteRef.current = false;
    timerElapsedRef.current = 0;
    repeatCountRef.current = 0;
    savedCharPositionRef.current = 0;
    playLoopActiveRef.current = false;
  }, [bookName, chapter, verseStart, verseEnd]);

  // Tick timer every second when running (not paused, not complete)
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      timerRef.current = setInterval(() => {
        setTimerElapsed(prev => {
          const next = prev + 1;
          timerElapsedRef.current = next;
          if (next >= selectedDuration) {
            setTimerComplete(true);
            setTimerRunning(false);
            clearInterval(timerRef.current!);
            timerRef.current = null;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning, timerPaused, selectedDuration]);

  // Stop audio when timer completes and cancel play loop
  useEffect(() => {
    if (timerComplete) {
      playLoopActiveRef.current = false;
      if (isTtsPlaying) {
        bibleTTS.stop().catch(() => {});
      }
    }
  }, [timerComplete, isTtsPlaying]);

  // Animated circle pulse
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.92,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animatedValue, timerRunning, timerPaused]);

  // ── Sync pageIndex → stage (when swiping) ─────────────────────────────
  useEffect(() => {
    if (stage === 'passage') return;
    const newStage = STAGE_ORDER[pageIndex];
    if (newStage && newStage !== stage) {
      setStage(newStage);
    }
  }, [pageIndex, stage]);

  // ── Pause TTS + reset timer display when swiping away from Listen ───
  const prevPageRef = useRef(pageIndex);
  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = pageIndex;
    const prevStage = STAGE_ORDER[prev];
    const currentStage = STAGE_ORDER[pageIndex];
    if (prevStage !== currentStage) {
      if (prevStage === 'listen' && isTtsPlaying) {
        savedCharPositionRef.current =
          currentPlayOffsetBaseRef.current + lastKnownCharOffsetRef.current;
        bibleTTS.stop().catch(() => {});
        setTimerRunning(false);
        setTimerPaused(false);
        playLoopActiveRef.current = false;
      }
    }
  }, [pageIndex, isTtsPlaying]);

  // ── Scroll carousel to follow stage changes from Continue buttons ──────
  const goToStage = useCallback((newStage: string, animated = true) => {
    const idx = STAGE_ORDER.indexOf(newStage as (typeof STAGE_ORDER)[number]);
    if (idx < 0) return;
    setStage(newStage);
    setPageIndex(idx);
    carouselRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated });
  }, []);

  // ── Auto-scroll Learn stage tab row when the active tab changes ──────
  useEffect(() => {
    const xOffset = tabPositions.current[learnTab];
    if (xOffset !== undefined && tabRowRef.current) {
      tabRowRef.current.scrollTo({ x: Math.max(0, xOffset - 16), animated: true });
    }
  }, [learnTab]);

  // ── Sync carousel to the correct page on mount (resuming a study) ────
  useEffect(() => {
    if (pageIndex > 0 && carouselRef.current) {
      // Use requestAnimationFrame to ensure the carousel is laid out before scrolling
      const raf = requestAnimationFrame(() => {
        carouselRef.current?.scrollTo({
          x: pageIndex * SCREEN_WIDTH,
          animated: false,
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pageIndex]);

  // ── Show resume toast when navigating back to an in-progress study ──
  useEffect(() => {
    if (routeParams.sessionId && routeParams.stage && routeParams.stage !== 'passage') {
      const stageLabelMap: Record<string, string> = {
        look: 'Look',
        listen: 'Listen',
        learn: 'Learn',
        abide: 'Abide',
      };
      const label = stageLabelMap[routeParams.stage] || routeParams.stage;
      showToast('info', `Resumed at ${label} stage`);
    }
  }, [routeParams.sessionId, routeParams.stage]);

  // ── Book/chapter selection handlers ─────────────────────────────────────
  const handleSelectBook = useCallback(
    (selectedBook: string) => {
      setBookName(selectedBook);
      const found = books.find(b => b.name === selectedBook);
      if (found) setMaxChapters(found.chapters);
      setChapter('');
      setVerseStart('');
      setVerseEnd('');
      setPassageRef('');
      setSessionId(null);
      setPassageVerses([]);
      setAvailableVerses([]);
      setSubStage('chapter');
    },
    [books, setAvailableVerses, setPassageVerses, setPassageRef],
  );

const handleSelectChapter = useCallback((ch: number) => {
      setChapter(String(ch));
      setVerseStart('');
      setVerseEnd('');
      setPassageRef('');
      setSessionId(null);
      setPassageVerses([]);
      setAvailableVerses([]);
      setSubStage('verse');
    }, [setAvailableVerses, setPassageVerses, setPassageRef]);

const handleSelectVerse = useCallback(
      (verseNumber: number) => {
        // If a range is already set (verseEnd defined) treat any new tap as a fresh single selection.
        if (verseEnd) {
          setVerseStart(String(verseNumber));
          setVerseEnd('');
          setPassageRef('');
          return;
        }

        const currentStart = verseStart ? Number(verseStart) : undefined;
        const currentEnd = verseEnd ? Number(verseEnd) : undefined;
 
        if (!currentStart || currentEnd) {
          setVerseStart(String(verseNumber));
          setVerseEnd('');
          setPassageRef('');
          return;
        }
 
        if (verseNumber <= currentStart) {
          setVerseStart(String(verseNumber));
          setVerseEnd('');
          setPassageRef('');
          return;
        }
 
        setVerseEnd(String(verseNumber));
        setPassageRef('');
      },
      [verseEnd, verseStart, setPassageRef],
    );

  const isVerseSelected = useCallback(
    (verseNumber: number) => {
      const currentStart = verseStart ? Number(verseStart) : undefined;
      const currentEnd = verseEnd ? Number(verseEnd) : currentStart;
      return Boolean(
        currentStart &&
          currentEnd &&
          verseNumber >= currentStart &&
          verseNumber <= currentEnd,
      );
    },
    [verseEnd, verseStart],
  );

const handleBackToBooks = useCallback(() => {
      setPassageRef('');
      setSessionId(null);
      setSubStage('book');
    }, [setPassageRef]);

const handleChangePassage = useCallback(
      (nextSubStage: 'book' | 'chapter' | 'verse') => {
        bibleTTS.stop().catch(() => {});
        setStage('passage');
        setPageIndex(0);
        setSubStage(nextSubStage);
        setSessionId(null);
        setPassageRef('');
        setPassageVerses([]);
        setVerseWords([]);
        setVerseResources(null);
        setBookPrologue(null);
        setLookNotes('');
        setLearnNotes('');
        setTimerRunning(false);
        setTimerPaused(false);
        setTimerElapsed(0);
        setTimerComplete(false);
        singlePassageDurationRef.current = 0;
        savedCharPositionRef.current = 0;
        durationManuallySetRef.current = false;

        if (nextSubStage === 'book') {
          setBookName('');
          setChapter('');
          setVerseStart('');
          setVerseEnd('');
          setAvailableVerses([]);
        } else if (nextSubStage === 'chapter') {
          setChapter('');
          setVerseStart('');
          setVerseEnd('');
          setAvailableVerses([]);
        } else {
          setVerseStart('');
          setVerseEnd('');
        }
      },
      [
        setAvailableVerses,
        setBookPrologue,
        setPassageVerses,
        setVerseResources,
      ],
    );

  // ── API calls ────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!bookName || !chapter) {
      showToast('error', 'Please select a book and chapter');
      return;
    }

    if (!verseStart) {
      showToast('error', 'Please select a starting verse');
      return;
    }

    const parsedVerseStart = verseStart ? Number(verseStart) : undefined;
    const parsedVerseEnd = verseEnd ? Number(verseEnd) : parsedVerseStart;
    const invalidVerseStart =
      parsedVerseStart !== undefined &&
      (!Number.isInteger(parsedVerseStart) || parsedVerseStart < 1);
    const invalidVerseEnd =
      parsedVerseEnd !== undefined &&
      (!Number.isInteger(parsedVerseEnd) || parsedVerseEnd < 1);

    if (invalidVerseStart || invalidVerseEnd) {
      showToast('error', 'Please enter valid verse numbers');
      return;
    }

    if (verseEnd && !verseStart) {
      showToast('error', 'Please enter a starting verse');
      return;
    }

    if (parsedVerseStart && parsedVerseEnd && parsedVerseEnd < parsedVerseStart) {
      showToast('error', 'Verse end must be after verse start');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPostRequest('exegesis', 'start', {
        bookName,
        chapter: parseInt(chapter, 10),
        verseStart: parsedVerseStart,
        verseEnd: parsedVerseEnd,
      });
      if (res.returnCode === 200 && res.returnData) {
        setSessionId(res.returnData.id);
        setPassageRef(res.returnData.passageRef);
        goToStage('look');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  }, [bookName, chapter, verseStart, verseEnd, goToStage]);

  const saveLook = useCallback(async () => {
    setSaving(true);
    try {
      if (!sessionId) {
        goToStage('listen');
        return;
      }
      await sendPostRequest('exegesis', `${sessionId}/look`, {
        notes: lookNotes,
      });
      goToStage('listen');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
      goToStage('listen');
    } finally {
      setSaving(false);
    }
  }, [sessionId, lookNotes, goToStage]);

  const saveListen = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await sendPostRequest('exegesis', `${sessionId}/listen`, {
        duration: selectedDuration,
      });
      goToStage('learn');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sessionId, selectedDuration, goToStage]);

  const saveLearn = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await sendPostRequest('exegesis', `${sessionId}/learn`, {
        notes: learnNotes,
      });
      goToStage('abide');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sessionId, learnNotes, goToStage]);

  const saveAbide = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      // Extract studied Strong's words from the Learn stage
      const strongsWords = verseWords
        .filter(w => w.strongsId)
        .map(w => ({
          strongsId: w.strongsId,
          surfaceText: w.surfaceText,
          lemma: w.lemma || '',
        }));

      // Save abide progress to session before navigating
      await sendPostRequest('exegesis', `${sessionId}/progress`, {
        abideReflection: reflection,
        abidePrayer: prayer,
        abideApplication: appText,
        abideTags: tags,
        isPublic: isPublic,
      });

      // Navigate to JournalEntry with pre-filled data
      navigation.navigate(route.ledgerEntry, {
        reflection,
        prayers: prayer,
        application: appText,
        tags,
        isPublic,
        strongsWords:
          strongsWords.length > 0 ? JSON.stringify(strongsWords) : undefined,
        bookName,
        chapter: chapter ? parseInt(chapter, 10) : undefined,
        verseStart: verseStart ? parseInt(verseStart, 10) : undefined,
        verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
        passageRef,
        source: 'exegesis-lab',
        returnTo: route.legacyLedger,
        sessionId, // Pass session ID so JournalEntry can update it
      });
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to navigate');
    } finally {
      setSaving(false);
    }
  }, [
    sessionId,
    reflection,
    prayer,
    appText,
    tags,
    isPublic,
    verseWords,
    bookName,
    chapter,
    verseStart,
    verseEnd,
    passageRef,
    navigation,
  ]);

  // ── Save progress (without advancing stage) ──────────────────────────
  const saveCurrentProgress = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!sessionId) {
      showToast('error', 'No active session to save');
      return;
    }
    setSavingProgress(true);
    try {
      const body: any = {};
      switch (stage) {
        case 'look':
          body.lookNotes = lookNotes;
          break;
        case 'listen':
          body.listenDuration = selectedDuration;
          body.listenElapsed = timerElapsed;
          body.listenRepeatCount = repeatCount;
          if (timerComplete) body.listenCompleted = true;
          break;
        case 'learn':
          body.learnNotes = learnNotes;
          break;
        case 'abide':
          body.abideReflection = reflection;
          body.abidePrayer = prayer;
          body.abideApplication = appText;
          body.abideTags = tags;
          body.isPublic = isPublic;
          break;
        default:
          setSavingProgress(false);
          return;
      }
      await sendPostRequest('exegesis', `${sessionId}/progress`, body);
      if (!silent) showToast('success', 'Progress saved!');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save progress');
    } finally {
      setSavingProgress(false);
    }
  }, [
    sessionId,
    stage,
    lookNotes,
    selectedDuration,
    timerElapsed,
    timerComplete,
    repeatCount,
    learnNotes,
    reflection,
    prayer,
    appText,
    tags,
    isPublic,
  ]);

  // ── TTS passage playback for Listen stage ─────────────────────────────
  const speakPassageWithPreferredVoice = useCallback(async (skipChars = 0) => {
    if (!passageVerses.length) return;
    const firstNum = passageVerses[0].verseNumber;
    const lastNum = passageVerses[passageVerses.length - 1].verseNumber;
    const rangeStr =
      firstNum === lastNum
        ? `verse ${firstNum}`
        : `verses ${firstNum} to ${lastNum}`;
    const prefixRaw = `${bookName}, chapter ${chapter}, ${rangeStr}. `;
    const fullRaw = prefixRaw + passageVerses.map(v => v.text).join(' ');
    const fullPrepared = bibleTTS.prepareText(fullRaw);
    const prefixLen = bibleTTS.prepareText(prefixRaw).length;

    // Skip already-heard content when resuming mid-passage.
    // Keep at least 20 % so the user hears a meaningful chunk before the next full loop.
    const minRemaining = Math.max(10, Math.floor(fullPrepared.length * 0.2));
    const safeSkip = Math.min(skipChars, fullPrepared.length - minRemaining);
    const trimmed = safeSkip > 0 ? fullPrepared.slice(safeSkip) : fullPrepared;
    const actualPrefixLen = safeSkip > 0 ? 0 : prefixLen;
    currentPlayOffsetBaseRef.current = safeSkip + actualPrefixLen;
    lastKnownCharOffsetRef.current = 0;

    await bibleTTS.init();
    bibleTTS.setEdgeEnabled(await ttsService.isEnabled());
    await bibleTTS.stop();
    await bibleTTS.speak(trimmed, actualPrefixLen, 0, (verseCharOffset: number) => {
      lastKnownCharOffsetRef.current = verseCharOffset;
    }, true);
  }, [bookName, chapter, passageVerses]);

  const scheduleNextPlay = useCallback(() => {
    if (!playLoopActiveRef.current) return;
    // Measure passage duration on first completed loop
    if (repeatCountRef.current === 0 && singlePassageDurationRef.current === 0) {
      singlePassageDurationRef.current = timerElapsedRef.current;
    }
    speakPassageWithPreferredVoice()
      .then(() => {
        if (playLoopActiveRef.current) {
          setRepeatCount(c => c + 1);
          scheduleNextPlay();
        }
      })
      .catch(() => {});
  }, [speakPassageWithPreferredVoice]);

  const handleReplayPassageAudio = useCallback(async () => {
    if (!passageVerses.length) {
      showToast('error', 'No passage selected to replay');
      return;
    }

    setAudioStarting(true);
    setRepeatCount(0);
    setTimerElapsed(0);
    setTimerRunning(true);
    setTimerPaused(false);
    setTimerComplete(false);
    savedCharPositionRef.current = 0;
    timerPendingRef.current = true;
    playLoopActiveRef.current = true;
    try {
      await speakPassageWithPreferredVoice();
      if (playLoopActiveRef.current) scheduleNextPlay();
    } catch (error: any) {
      showToast('error', error?.message || 'Audio could not start');
    } finally {
      setAudioStarting(false);
    }
  }, [passageVerses.length, speakPassageWithPreferredVoice, scheduleNextPlay]);

  const handleBeginListenTimer = useCallback(() => {
    if (passageVerses.length > 0 && !isTtsPlaying) {
      setAudioStarting(true);
      setRepeatCount(0);
      setTimerElapsed(0);
      setTimerRunning(true);
      setTimerPaused(false);
      setTimerComplete(false);
      savedCharPositionRef.current = 0;
      timerPendingRef.current = true;
      playLoopActiveRef.current = true;
      speakPassageWithPreferredVoice()
        .then(() => {
          if (playLoopActiveRef.current) scheduleNextPlay();
        })
        .catch((error: any) => {
          showToast('error', error?.message || 'Audio could not start');
        })
        .finally(() => setAudioStarting(false));
    }
  }, [isTtsPlaying, passageVerses.length, speakPassageWithPreferredVoice, scheduleNextPlay]);

  const handleToggleListenTimer = useCallback(() => {
    if (timerRunning && !timerPaused) {
      setTimerPaused(true);
      bibleTTS.pause().catch(() => {});
    } else if (timerPaused) {
      setTimerPaused(false);
      if (isTtsPaused) {
        playLoopActiveRef.current = true;
        bibleTTS.resume().catch(() => {});
      }
    }
  }, [timerPaused, timerRunning, isTtsPaused]);

  // ── Duration selection (tracks manual vs. auto-restore) ────────────
  const handleSetSelectedDuration = useCallback((value: number) => {
    durationManuallySetRef.current = true;
    setSelectedDuration(value);
  }, []);

  const handleResumeListenTimer = useCallback(() => {
    if (passageVerses.length === 0 || isTtsPlaying) return;

    // Estimate which verse the user was on when they left and build text
    // from that verse onward for a natural mid-passage resume.
    const verses = passageVerses;
    const vCount = verses.length;

    // Measure or estimate total passage duration (seconds)
    const firstNum = verses[0].verseNumber;
    const lastNum = verses[vCount - 1].verseNumber;
    const rangeStr =
      firstNum === lastNum
        ? `verse ${firstNum}`
        : `verses ${firstNum} to ${lastNum}`;
    const prefixRaw = `${bookName}, chapter ${chapter}, ${rangeStr}. `;
    const fullRaw = prefixRaw + verses.map(v => v.text).join(' ');
    const totalChars = bibleTTS.prepareText(fullRaw).length;

    const spd =
      singlePassageDurationRef.current ||
      Math.max(5, totalChars / 13);
    const timeInCurrentLoop = Math.max(
      0,
      timerElapsedRef.current - repeatCountRef.current * spd,
    );

    // Determine resume verse (0-based index into verses[])
    let resumeVerseIdx = 0;
    if (timeInCurrentLoop > 2 && vCount > 1) {
      const secPerVerse = spd / vCount;
      resumeVerseIdx = Math.min(
        vCount - 1,
        Math.floor(timeInCurrentLoop / secPerVerse),
      );
    }

    // Build text from resume verse onward.
    // Include a brief "verse N" intro only when we're mid-passage.
    let resumeText: string;
    if (resumeVerseIdx === 0) {
      // Near the beginning — play from the top with the announcement.
      resumeText = fullRaw;
    } else {
      // Mid-passage — introduce the starting verse, then read from there.
      const startV = verses[resumeVerseIdx].verseNumber;
      const remainingText = verses
        .slice(resumeVerseIdx)
        .map(v => v.text)
        .join(' ');
      resumeText = `${bookName}, chapter ${chapter}, verse ${startV}. ${remainingText}`;
    }

    const prepared = bibleTTS.prepareText(resumeText);

    currentPlayOffsetBaseRef.current = 0;
    lastKnownCharOffsetRef.current = 0;

    const doResume = async () => {
      setAudioStarting(true);
      try {
        await bibleTTS.init();
        bibleTTS.setEdgeEnabled(await ttsService.isEnabled());
        await bibleTTS.stop();
        await bibleTTS.speak(prepared, 0, 0, undefined, true);
        if (playLoopActiveRef.current) scheduleNextPlay();
      } catch (error: any) {
        showToast('error', error?.message || 'Audio could not start');
      } finally {
        setAudioStarting(false);
      }
    };

    playLoopActiveRef.current = true;
    timerPendingRef.current = true;
    setTimerRunning(true);
    setTimerPaused(false);
    doResume();
  }, [
    isTtsPlaying,
    passageVerses,
    bookName,
    chapter,
    scheduleNextPlay,
  ]);

  const handleResetListenTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playLoopActiveRef.current = false;
    setRepeatCount(0);
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerElapsed(0);
    savedCharPositionRef.current = 0;
    durationManuallySetRef.current = false;
    bibleTTS.stop().catch(() => {});
  }, []);

  // Cleanup TTS when leaving the screen
  useEffect(() => {
    return () => {
      bibleTTS.stop().catch(() => {});
    };
  }, []);

  // ── Load session data on resume ────────────────────────────────────
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await sendPostRequest('exegesis', sessionId, {});
      if (res.returnCode === 200 && res.returnData) {
        const data = res.returnData;
        // Restore saved notes
        if (data.lookNotes) setLookNotes(data.lookNotes);
        if (data.learnNotes) setLearnNotes(data.learnNotes);
        // Restore abide fields if resuming from Abide
        if (data.abideReflection) setReflection(data.abideReflection);
        if (data.abidePrayer) setPrayer(data.abidePrayer);
        if (data.abideApplication) setAppText(data.abideApplication);
        if (data.abideTags) setTags(data.abideTags);
        if (data.isPublic !== undefined) setIsPublic(data.isPublic);
        if (data.journalEntryId) setJournalEntryId(data.journalEntryId);
        // Restore listen stage progress
        if (data.listenDuration && !durationManuallySetRef.current) {
          setSelectedDuration(Number(data.listenDuration));
        }
        if (data.listenCompleted) {
          setTimerComplete(true);
          setTimerElapsed(Number(data.listenDuration) || 180);
        } else if (data.listenElapsed != null && Number(data.listenElapsed) > 0) {
          setTimerElapsed(Number(data.listenElapsed));
        }
        // Restore book/chapter if the current stage is beyond passage selection
        if (data.bookName && !bookName) setBookName(data.bookName);
        if (data.chapter && !chapter) setChapter(data.chapter.toString());
        if (data.verseStart && !verseStart)
          setVerseStart(data.verseStart.toString());
        if (data.verseEnd && !verseEnd)
          setVerseEnd(data.verseEnd?.toString() || '');
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  }, [
    bookName,
    chapter,
    sessionId,
    verseEnd,
    verseStart,
  ]);

  // Load session on mount / when sessionId changes
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Stop audio + timer when navigating away from the Lab screen (tab switch, back, etc.).
  // On re-focus, reload session and show the initial Listen view so the user explicitly
  // taps Play or Resume instead of the timer counting automatically.
  useFocusEffect(
    useCallback(() => {
      loadSession();
      return () => {
        savedCharPositionRef.current =
          currentPlayOffsetBaseRef.current + lastKnownCharOffsetRef.current;
        bibleTTS.stop().catch(() => {});
        setTimerRunning(false);
        setTimerPaused(false);
        playLoopActiveRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [loadSession]),
  );

  useLabLookStrongs({
    stage,
    bookName,
    chapter,
    verseStart,
    verseEnd,
    translationId,
    setVerseWords,
  });

  // ── Animated page wrapper for crossfade + slide ──────────────────────
  const renderPage = useCallback(
    (index: number, content: React.ReactNode) => {
      const W = SCREEN_WIDTH;
      const ctr = index * W;
      // 7-point ease-in-out curve — clusters values near center for a smooth
      // S-curve feel: slow→fast→slow as pages approach/leave the center.
      const inputRange = [
        (index - 1) * W,
        ctr - W * 0.66,
        ctr - W * 0.33,
        ctr,
        ctr + W * 0.33,
        ctr + W * 0.66,
        (index + 1) * W,
      ];

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 0.12, 0.55, 1, 0.55, 0.12, 0],
        extrapolate: 'clamp',
      });

      const translateX = scrollX.interpolate({
        inputRange,
        outputRange: [
          W * 0.05,
          W * 0.032,
          W * 0.012,
          0,
          -W * 0.012,
          -W * 0.032,
          -W * 0.05,
        ],
        extrapolate: 'clamp',
      });

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.95, 0.963, 0.985, 1, 0.985, 0.963, 0.95],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={{ opacity, transform: [{ translateX }, { scale }] }}
        >
          {content}
        </Animated.View>
      );
    },
    [scrollX],
  );

  const normalizeWord = useCallback((word: string) => {
    return word.toLowerCase().replace(/[^a-z0-9']/g, '');
  }, []);

  const renderChangePassageActions = () => (
    <View style={styles.changePassageRow}>
      {([
        { label: 'Book', value: 'book' },
        { label: 'Chapter', value: 'chapter' },
        { label: 'Verses', value: 'verse' },
      ] as const).map(action => (
        <TouchableOpacity
          key={action.value}
          style={[
            styles.changePassageBtn,
            { backgroundColor: COLORS.surface, borderColor: COLORS.border },
          ]}
          onPress={() => handleChangePassage(action.value)}
          activeOpacity={0.75}
        >
          <Text style={[styles.changePassageText, { color: COLORS.primary }]}> 
            Change {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderHighlightedVerseText = (
    verse: { verseNumber: number; text: string },
  ) => {
    const wordsForVerse = verseWords.filter(
      word => word.verseNumber === verse.verseNumber && word.strongsId,
    );
    const wordMap = wordsForVerse.reduce<Record<string, StrongsWordData>>(
      (acc, word) => {
        const key = normalizeWord(word.surfaceText || '');
        if (key && !acc[key]) acc[key] = word;
        return acc;
      },
      {},
    );
    const parts = verse.text.match(/[A-Za-z0-9'’]+|[^A-Za-z0-9'’]+/g) || [verse.text];

    return (
      <View style={styles.passageVerseTextWrap}>
        {parts.map((part, index) => {
          const strongWord = wordMap[normalizeWord(part)];
          if (!strongWord) {
            return (
              <Text key={`${part}-${index}`} style={[styles.passageVerseText, { color: COLORS.text }]}> 
                {part}
              </Text>
            );
          }

          return (
            <TouchableOpacity
              key={`${part}-${index}`}
              onPress={() => handleStrongsWordPress(strongWord)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.passageStrongWord,
                  {
                    color: COLORS.primary,
                    backgroundColor: `${COLORS.primary}18`,
                    borderColor: `${COLORS.primary}35`,
                  },
                ]}
              >
                {part}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Render verse range input (after book+chapter selected) ────────────────
  const renderVerseInput = () => (
    <PassageSelectionStep
      colors={COLORS}
      bookName={bookName}
      chapter={chapter}
      verseStart={verseStart}
      verseEnd={verseEnd}
      loading={loading}
      availableVerses={availableVerses}
      availableVersesLoading={availableVersesLoading}
      onBackToBooks={handleBackToBooks}
      onVerseStartChange={setVerseStart}
      onVerseEndChange={setVerseEnd}
      onSelectVerse={handleSelectVerse}
      isVerseSelected={isVerseSelected}
      onBeginStudy={startSession}
    />
  );

  // ── Render Look stage ────────────────────────────────────────────────────
  const renderLook = () => (
    <LookStage
      styles={styles}
      colors={COLORS}
      prompts={LOOK_PROMPTS}
      currentPromptIdx={currentPromptIdx}
      setCurrentPromptIdx={setCurrentPromptIdx}
      passageRef={passageRef}
      bookName={bookName}
      chapter={chapter}
      passageVerses={passageVerses}
      passageVersesLoading={passageVersesLoading}
      lookNotes={lookNotes}
      setLookNotes={setLookNotes}
      saving={saving}
      savingProgress={savingProgress}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onSaveProgress={() => saveCurrentProgress()}
      onContinue={saveLook}
      renderChangePassageActions={renderChangePassageActions}
      renderHighlightedVerseText={renderHighlightedVerseText}
    />
  );

  // ── Render Listen stage ──────────────────────────────────────────────────
  const renderListen = () => (
    <ListenStage
      styles={styles}
      colors={COLORS}
      passageRef={passageRef}
      passageVersesCount={passageVerses.length}
      selectedDuration={selectedDuration}
      setSelectedDuration={handleSetSelectedDuration}
      timerRunning={timerRunning}
      timerPaused={timerPaused}
      timerElapsed={timerElapsed}
      timerComplete={timerComplete}
      repeatCount={repeatCount}
      hasSavedProgress={timerElapsed > 0}
      animatedValue={animatedValue}
      audioStarting={audioStarting}
      isTtsPlaying={isTtsPlaying}
      isTtsPaused={isTtsPaused}
      saving={saving}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      renderChangePassageActions={renderChangePassageActions}
      onBeginTimer={handleBeginListenTimer}
      onResumeTimer={handleResumeListenTimer}
      onToggleTimer={handleToggleListenTimer}
      onResetTimer={handleResetListenTimer}
      onReplayPassageAudio={handleReplayPassageAudio}
      onContinue={saveListen}
    />
  );

  // ── Render Learn stage ───────────────────────────────────────────────────
  const renderLearn = () => (
    <LearnStage
      styles={styles}
      colors={COLORS}
      passageRef={passageRef}
      bookName={bookName}
      chapter={chapter}
      learnTab={learnTab}
      setLearnTab={setLearnTab}
      learnNotes={learnNotes}
      setLearnNotes={setLearnNotes}
      learnDataLoading={learnDataLoading}
      verseResources={verseResources}
      bookPrologue={bookPrologue}
      verseWords={verseWords}
      selectedStrongsWord={selectedStrongsWord}
      selectedStrongsEntry={selectedStrongsEntry}
      strongsEntryLoading={strongsEntryLoading}
      saving={saving}
      savingProgress={savingProgress}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      tabRowRef={tabRowRef}
      tabPositions={tabPositions}
      showLeftChevron={showLeftChevron}
      showRightChevron={showRightChevron}
      onTabScroll={setTabScrollX}
      onTabContentWidthChange={setTabContentWidth}
      onTabContainerWidthChange={setTabContainerWidth}
      onOpenBibleReader={() =>
        navigation.navigate(route.bible, {
          bookName,
          chapter: parseInt(chapter, 10),
        })
      }
      onStrongsWordPress={handleStrongsWordPress}
      onClearStrongsSelection={clearStrongsSelection}
      onSaveProgress={saveCurrentProgress}
      onContinue={saveLearn}
    />
  );

  // ── Render Abide stage ───────────────────────────────────────────────────
  const renderAbide = () => (
    <AbideStage
      styles={styles}
      colors={COLORS}
      passageRef={passageRef}
      reflection={reflection}
      setReflection={setReflection}
      prayer={prayer}
      setPrayer={setPrayer}
      appText={appText}
      setAppText={setAppText}
      tags={tags}
      setTags={setTags}
      isPublic={isPublic}
      setIsPublic={setIsPublic}
      saving={saving}
      savingProgress={savingProgress}
      journalEntryId={journalEntryId}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onSaveProgress={() => saveCurrentProgress()}
      onSaveAbide={saveAbide}
      onViewLegacyLedger={() => navigation.navigate(route.legacyLedger)}
    />
  );

  // ── Handle download / share entry ─────────────────────────────────────
  const handleDownloadEntry = useCallback(async () => {
    const passageVerseText = passageVerses
      .map(v => `${v.verseNumber}. ${v.text}`)
      .join('\n');

    const strongsList = verseWords
      .filter(w => w.strongsId)
      .map(
        w =>
          `  • ${w.surfaceText} (Strong's ${w.strongsId}${w.lemma ? `, lemma: ${w.lemma}` : ''})`,
      )
      .join('\n');

    const entryText = [
      `═══ EXEGESIS STUDY ═══`,
      `Passage: ${passageRef || `${bookName} ${chapter}`}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      `─── Passage Text ───`,
      passageVerseText || '(Passage text unavailable)',
      '',
      `─── Look: Observations ───`,
      lookNotes || '(No observations recorded)',
      '',
      `─── Listen: Dwell Time ───`,
      `${Math.floor(selectedDuration / 60)} min ${selectedDuration % 60} sec`,
      '',
      `─── Learn: Study Notes ───`,
      learnNotes || '(No study notes recorded)',
      '',
      strongsList ? `─── Strong's Words Studied ───\n${strongsList}\n` : '',
      `─── Abide: Reflection ───`,
      reflection || '(No reflection recorded)',
      '',
      `─── Abide: Prayer ───`,
      prayer || '(No prayer recorded)',
      '',
      `─── Abide: Application ───`,
      appText || '(No application recorded)',
      '',
      tags ? `Tags: ${tags}` : '',
      '',
      '— Saved from Exegesis Lab',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({
        message: entryText,
        title: `Exegesis: ${passageRef}`,
      });
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        console.error('Share failed:', e);
      }
    }
  }, [
    passageVerses,
    verseWords,
    passageRef,
    bookName,
    chapter,
    lookNotes,
    selectedDuration,
    learnNotes,
    reflection,
    prayer,
    appText,
    tags,
  ]);

  // ── Render Completed state ────────────────────────────────────────────────
  const handleStartNewStudy = useCallback(() => {
    setStage('passage');
    setSubStage('book');
    setSessionId(null);
    setBookName('');
    setChapter('');
    setVerseStart('');
    setVerseEnd('');
    setLookNotes('');
    setLearnNotes('');
    setReflection('');
    setPrayer('');
    setAppText('');
    setTags('');
    setVerseWords([]);
    setPassageVerses([]);
    setTimerComplete(false);
    setTimerElapsed(0);
    setRepeatCount(0);
    setCompleted(false);
    savedCharPositionRef.current = 0;
    singlePassageDurationRef.current = 0;
    durationManuallySetRef.current = false;
  }, [
    setStage, setSubStage, setSessionId, setBookName, setChapter,
    setVerseStart, setVerseEnd, setLookNotes, setLearnNotes,
    setReflection, setPrayer, setAppText, setTags, setVerseWords,
    setPassageVerses, setTimerComplete, setTimerElapsed, setCompleted,
  ]);

  const renderCompleted = () => (
    <CompletedStage
      styles={styles}
      colors={COLORS}
      onViewLegacyLedger={() => navigation.navigate(route.legacyLedger)}
      onDownloadEntry={handleDownloadEntry}
      onStartNewStudy={handleStartNewStudy}
    />
  );

  // ── Main render ──────────────────────────────────────────────────────────
  const stageTitleMap: Record<string, string> = {
    passage: 'Select Passage',
    look: 'Look',
    listen: 'Listen',
    learn: 'Learn',
    abide: 'Abide',
  };

  // When selecting book or chapter, show full-screen selectors
  if (stage === 'passage' && subStage === 'book') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: COLORS.background }]}
      >
        <BookSelectorScreen
          books={books}
          isDark={isDark}
          loading={booksLoading}
          onSelectBook={handleSelectBook}
          onBack={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (stage === 'passage' && subStage === 'chapter') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: COLORS.background }]}
      >
        <ChapterSelectorScreen
          bookName={bookName || 'Genesis'}
          maxChapters={maxChapters || 50}
          isDark={isDark}
          onSelectChapter={handleSelectChapter}
          onBack={handleBackToBooks}
        />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ActionHeader
        mode="standard"
        title={`Exegesis Lab — ${stageTitleMap[stage] || ''}`}
        onPress={() => {
          if (stage !== 'passage' && !completed) {
            Alert.alert(
              'Leave Study?',
              'Your progress will be saved. You can continue later.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save & Exit',
                  onPress: async () => {
                    await saveCurrentProgress();
                    navigation.goBack();
                  },
                },
                {
                  text: 'Exit Without Saving',
                  style: 'destructive',
                  onPress: () => navigation.goBack(),
                },
              ],
            );
          } else {
            navigation.goBack();
          }
        }}
      />

      {/* Stage progress indicator (tappable, smoothly animated via scrollX) */}
      {stage !== 'passage' && !completed && (
        <View style={[styles.progressBar, { backgroundColor: COLORS.border }]}>
          {STAGE_ORDER.map((s, idx) => {
            const isDone = idx < pageIndex;
            const isCurrent = idx === pageIndex;

            // Opacity: full when this dot's page is centered, faded otherwise
            const dotOpacity = scrollX.interpolate({
              inputRange: [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ],
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            // Scale: pops up slightly when active
            const dotScale = scrollX.interpolate({
              inputRange: [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ],
              outputRange: [1, 1.25, 1],
              extrapolate: 'clamp',
            });

            return (
              <TouchableOpacity
                key={s}
                style={styles.progressStep}
                onPress={() => goToStage(s)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: isDone
                        ? COLORS.success
                        : isCurrent
                          ? COLORS.accent
                          : COLORS.muted,
                      opacity: dotOpacity,
                      transform: [{ scale: dotScale }],
                      width: isCurrent ? 22 : 10,
                    },
                  ]}
                />
                <Animated.Text
                  style={[
                    styles.progressLabel,
                    {
                      color: isDone
                        ? COLORS.success
                        : isCurrent
                          ? COLORS.accent
                          : COLORS.muted,
                      opacity: dotOpacity,
                    },
                  ]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Passage selection (standalone) */}
      {stage === 'passage' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderVerseInput()}
        </ScrollView>
      )}

      {/* Completed screen (standalone) */}
      {completed && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderCompleted()}
        </ScrollView>
      )}

      {/* Swipeable carousel for the 4 stages (crossfade + subtle slide) */}
      {stage !== 'passage' && !completed && (
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={carouselRef}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => {
            const page = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );
            if (page !== pageIndex) {
              setPageIndex(page);
              // Short haptic tap on page change (iOS & Android)
              Vibration.vibrate(10);
            }
          }}
          scrollEnabled={!(timerRunning && !timerPaused)}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Look */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderPage(0, renderLook())}
          </ScrollView>
          {/* Listen */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderPage(1, renderListen())}
          </ScrollView>
          {/* Learn */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderPage(2, renderLearn())}
          </ScrollView>
          {/* Abide */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderPage(3, renderAbide())}
          </ScrollView>
        </Animated.ScrollView>
      )}

      <StrongsWordModal
        visible={showStrongsModal}
        word={selectedStrongsWord}
        entry={selectedStrongsEntry}
        loading={strongsEntryLoading}
        bookName={bookName}
        chapter={chapter}
        colors={COLORS}
        onClose={closeStrongsModal}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    // Stage container
    stageContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

    // Passage selection
    passageHeader: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
      marginTop: SPACING.lg,
    },
    passageTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '800',
      marginTop: SPACING.md,
      textAlign: 'center',
    },
    passageSubtitle: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      marginTop: SPACING.xs,
      lineHeight: 20,
      paddingHorizontal: SPACING.lg,
    },
    selectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      marginBottom: SPACING.lg,
    },
    selectedBadgeText: { fontSize: FONT_SIZES.md, fontWeight: '700', flex: 1 },

    // Stage header
    stageHeader: { alignItems: 'center', marginBottom: SPACING.xl },
    stageBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    stageLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: SPACING.xs,
    },
    stageTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '800',
      marginBottom: SPACING.xs,
    },
    stageSubtitle: { fontSize: FONT_SIZES.sm, textAlign: 'center' },
    passageChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs + 2,
      borderRadius: BORDER_RADIUS.round,
      marginTop: SPACING.md,
    },
    passageChipText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    changePassageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    changePassageBtn: {
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.round,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs + 2,
    },
    changePassageText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },

    // Inputs
    inputGroup: { marginBottom: SPACING.md },
    inputLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      fontSize: FONT_SIZES.md,
    },
    inputRow: { flexDirection: 'row', gap: SPACING.sm },
    verseGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    verseGridLoading: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    verseChip: {
      minWidth: 42,
      height: 42,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.sm,
    },
    verseChipText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
    },
    verseHelperText: {
      fontSize: FONT_SIZES.xs,
      lineHeight: 18,
      marginBottom: SPACING.sm,
    },
    textarea: {
      height: 120,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      marginBottom: SPACING.md,
    },
    textareaLarge: {
      height: 160,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      marginBottom: SPACING.md,
    },
    textareaLabel: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
    },

    // Buttons
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 52,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
      paddingHorizontal: SPACING.lg,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 44,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5,
      marginVertical: SPACING.sm,
    },
    secondaryBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    saveProgressBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 36,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      marginBottom: SPACING.md,
    },
    saveProgressText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

    // Look stage - prompts
    promptCard: {
      borderLeftWidth: 4,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
    },
    promptText: {
      fontSize: FONT_SIZES.md,
      lineHeight: 24,
      marginTop: SPACING.sm,
      fontStyle: 'italic',
    },
    promptNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    promptCounter: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

    // Look stage - passage text
    passageTextCard: {
      borderLeftWidth: 3,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    passageTextHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: 1,
      paddingBottom: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    passageTextLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    passageVerseRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    passageVerseNum: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      minWidth: 20,
      textAlign: 'right',
      lineHeight: 22,
    },
    passageVerseTextWrap: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
    },
    passageVerseText: { fontSize: FONT_SIZES.md, lineHeight: 24 },
    passageStrongWord: {
      fontSize: FONT_SIZES.md,
      lineHeight: 24,
      fontWeight: '700',
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.sm,
      paddingHorizontal: 2,
    },

    // Listen stage - timer
    durationRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    durationChip: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1.5,
    },
    durationChipText: { fontSize: FONT_SIZES.md, fontWeight: '700' },
    timerContainer: { alignItems: 'center', paddingVertical: SPACING.xl },
    swipeHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACING.md,
    },
    swipeHintText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '500',
      fontStyle: 'italic',
    },
    circleOuter: {
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.xl,
    },
    circleInner: {
      width: 190,
      height: 190,
      borderRadius: 95,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerText: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
    timerLabel: { fontSize: FONT_SIZES.xs, fontWeight: '600', marginTop: 2 },
    progressBarBg: {
      width: 120,
      height: 4,
      borderRadius: 2,
      marginTop: SPACING.md,
      overflow: 'hidden',
    },
    progressBarFill: { height: '100%', borderRadius: 2 },
    timerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.lg,
    },
    timerBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerBtnSmall: {
      height: 40,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerBtnSmallText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },

    // Amen state
    amenContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
    amenCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
    },
    amenText: {
      fontSize: FONT_SIZES.huge,
      fontWeight: '900',
      marginBottom: SPACING.sm,
    },
    amenSubtext: {
      fontSize: FONT_SIZES.md,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: SPACING.xl,
      marginBottom: SPACING.xl,
    },

    // Learn stage - tabs
    tabRowWrapper: {
      position: 'relative',
      marginBottom: SPACING.md,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tabChevron: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      zIndex: 1,
    },
    tabChevronLeft: { left: 0 },
    tabChevronRight: { right: 0 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 2,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    tabText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
    tabTextActive: { fontWeight: '700' },
    learnContent: {
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    learnSectionTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      marginBottom: SPACING.xs,
    },
    learnText: { fontSize: FONT_SIZES.sm, lineHeight: 22 },
    divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: SPACING.md,
    },

    // Resource cards (commentaries, cross-references, dictionary)
    resourceCard: {
      borderLeftWidth: 3,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    resourceCardAuthor: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    resourceCardLabel: { fontSize: FONT_SIZES.xs, marginTop: 1 },
    resourceCardText: { fontSize: FONT_SIZES.sm, lineHeight: 21 },
    resourceCardRef: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      marginBottom: 2,
    },
    resourceCardTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    resourceCardDef: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      lineHeight: 20,
    },
    dividerThin: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: 6,
    },

    // Strong's word rows (Original Language tab)
    wordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      marginBottom: SPACING.sm,
      gap: SPACING.sm,
    },
    wordIndex: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wordIndexText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
    wordContent: { flex: 1 },
    wordSurfaceText: { fontSize: FONT_SIZES.md, fontWeight: '600' },
    wordMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    wordBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    wordBadgeText: { fontSize: 10, fontWeight: '700' },
    wordLemma: { fontSize: FONT_SIZES.xs, fontStyle: 'italic' },
    wordMorph: { fontSize: 10, maxWidth: 120 },

    // Strong's detail card
    strongsDetailWord: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '800',
      marginBottom: 2,
    },
    strongsDetailStrongs: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    strongsDetailLemma: { fontSize: FONT_SIZES.xs, marginTop: 2 },
    strongsDetailMorph: { fontSize: FONT_SIZES.xs, marginTop: 1 },
    strongsDetailDef: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      lineHeight: 22,
    },
    strongsDetailTranslit: { fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
    strongsDetailOriginal: { fontSize: FONT_SIZES.sm, marginTop: 1 },
    strongsDetailPos: {
      fontSize: FONT_SIZES.xs,
      marginTop: SPACING.xs,
      lineHeight: 18,
    },
    strongsDetailUsage: { fontSize: FONT_SIZES.xs, marginTop: 2 },
    strongsDetailEmpty: { fontSize: FONT_SIZES.sm, fontStyle: 'italic' },
    strongsBadgeSmall: {
      fontSize: 10,
      fontWeight: '700',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },

    // Topic pills
    topicPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    topicPillText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

    // Abide stage
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.md,
    },
    privacyText: { fontSize: FONT_SIZES.sm, fontWeight: '500' },

    // Completed
    completedContainer: { alignItems: 'center', paddingTop: SPACING.xxl * 2 },
    completedIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.xl,
    },
    completedTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
      marginBottom: SPACING.sm,
    },
    completedSubtitle: {
      fontSize: FONT_SIZES.md,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: SPACING.xl,
      marginBottom: SPACING.xl,
    },

    // Progress bar (at top)
    progressBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.xl,
      paddingVertical: SPACING.sm,
      marginHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.xs,
    },
    progressStep: { alignItems: 'center', gap: 4 },
    progressDot: { width: 10, height: 10, borderRadius: 5 },
    progressLabel: { fontSize: 10, fontWeight: '600' },

    // Page indicator (bottom)
    pageIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.sm,
    },
    pageDot: { height: 8, borderRadius: 4 },
  });
