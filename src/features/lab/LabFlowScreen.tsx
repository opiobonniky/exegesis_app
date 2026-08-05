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
  Clipboard,
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
import ReactNativeBlobUtil from 'react-native-blob-util';
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
import StageStepper from './components/StageStepper';
import LookStage from './components/LookStage';
import ListenStage from './components/ListenStage';
import LearnStage from './components/LearnStage';
import AbideStage from './components/AbideStage';
import ApplyStage from './components/ApplyStage';
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

  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  // primaryOnSurface: a brighter blue for text/icons on dark surfaces.
  // Dark mode's primary (#396284) is nearly invisible on dark backgrounds
  // (2.78:1); #60A5FA reads at 7.05:1. Buttons keep colors.primary so white
  // text on the button still passes (6.45:1).
  const COLORS = useMemo(() => {
    const base = getColors(isDark);
    return {
      ...base,
      primaryOnSurface: isDark ? '#60A5FA' : base.primary,
    };
  }, [isDark]);
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
  const [observations, setObservations] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);

  // ── Listen stage ──────────────────────────────────────────────────────────
  const [selectedRepeats, setSelectedRepeats] = useState<number>(3);
  const [repeatCount, setRepeatCount] = useState(0);
  const [listenComplete, setListenComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const repeatCountRef = useRef(0);
  const selectedRepeatsRef = useRef(3);
  const isLoopActiveRef = useRef(false);

  // ── Learn stage ───────────────────────────────────────────────────────────
  const [learnNotes, setLearnNotes] = useState('');
  const [learnTab, setLearnTab] = useState<
    'prologue' | 'language' | 'history' | 'geography' | 'theology' | 'crossrefs' | 'exegesis'
  >(routeParams.learnTab || 'prologue');
  const [verseWords, setVerseWords] = useState<StrongsWordData[]>([]);
  const {
    learnDataLoading,
    verseResources,
    bookPrologue,
    translations,
    translationsLoading,
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

  // ── Apply stage ───────────────────────────────────────────────────────────
  const [challengeText, setChallengeText] = useState('');
  const [resultsText, setResultsText] = useState('');

  // Sync refs with state for use in async callbacks
  useEffect(() => { repeatCountRef.current = repeatCount; }, [repeatCount]);
  useEffect(() => { selectedRepeatsRef.current = selectedRepeats; }, [selectedRepeats]);

  // Reset listen state when a new passage is loaded
  useEffect(() => {
    isLoopActiveRef.current = false;
    setRepeatCount(0);
    setListenComplete(false);
    setIsPlaying(false);
    setIsPaused(false);
    repeatCountRef.current = 0;
  }, [bookName, chapter, verseStart, verseEnd]);

  // Stop audio when listen completes
  useEffect(() => {
    if (listenComplete && isTtsPlaying) {
      bibleTTS.stop().catch(() => {});
    }
  }, [listenComplete, isTtsPlaying]);

  // ── Sync pageIndex → stage (when swiping) ─────────────────────────────
  useEffect(() => {
    if (stage === 'passage') return;
    const newStage = STAGE_ORDER[pageIndex];
    if (newStage && newStage !== stage) {
      setStage(newStage);
    }
  }, [pageIndex, stage]);

  // ── Pause TTS when swiping away from Listen ───
  const prevPageRef = useRef(pageIndex);
  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = pageIndex;
    const prevStage = STAGE_ORDER[prev];
    const currentStage = STAGE_ORDER[pageIndex];
    if (prevStage !== currentStage) {
      if (prevStage === 'listen' && isTtsPlaying) {
        isLoopActiveRef.current = false;
        bibleTTS.stop().catch(() => {});
        setIsPlaying(false);
        setIsPaused(false);
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
        apply: 'Apply',
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
        observations,
      });
      showToast('success', 'Progress saved!');
      goToStage('listen');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sessionId, lookNotes, observations, goToStage]);

  const saveListen = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await sendPostRequest('exegesis', `${sessionId}/listen`, {
        repeats: selectedRepeats,
      });
      goToStage('learn');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sessionId, selectedRepeats, goToStage]);

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
      // Save abide progress to session before advancing
      await sendPostRequest('exegesis', `${sessionId}/progress`, {
        abideReflection: reflection,
        abidePrayer: prayer,
        abideApplication: appText,
        abideTags: tags,
        isPublic: isPublic,
      }, false, true);
      goToStage('apply');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
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
    goToStage,
  ]);

  const saveApply = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await sendPostRequest('exegesis', `${sessionId}/progress`, {
        applyChallenge: challengeText,
        applyResults: resultsText,
      }, false, true);
      setCompleted(true);
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sessionId, challengeText, resultsText]);

  // ── Save progress (without advancing stage) ──────────────────────────
  const saveCurrentProgress = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!sessionId) {
      showToast('error', 'No active session to save');
      return;
    }
    try {
      const body: any = {};
      switch (stage) {
        case 'look':
          body.lookNotes = lookNotes;
          body.observations = observations;
          break;
        case 'listen':
          body.listenRepeats = selectedRepeats;
          body.listenRepeatCount = repeatCount;
          if (listenComplete) body.listenCompleted = true;
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
        case 'apply':
          body.applyChallenge = challengeText;
          body.applyResults = resultsText;
          break;
        default:
          return;
      }
      await sendPostRequest('exegesis', `${sessionId}/progress`, body, false, true);
      if (!silent) showToast('success', 'Progress saved!');
    } catch (e: any) {
      if (e?.returnCode === 202) {
        if (!silent) showToast('info', 'Progress saved offline');
      } else {
        showToast('error', e?.message || 'Failed to save progress');
      }
    }
  }, [
    sessionId,
    stage,
    lookNotes,
    observations,
    selectedRepeats,
    listenComplete,
    repeatCount,
    learnNotes,
    reflection,
    prayer,
    appText,
    tags,
    isPublic,
    challengeText,
    resultsText,
  ]);

  // ── TTS passage playback for Listen stage ─────────────────────────────
  const speakPassageWithPreferredVoice = useCallback(async () => {
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

    bibleTTS.setEdgeEnabled(false);
    await bibleTTS.init();
    await bibleTTS.stop();
    await bibleTTS.speak(fullPrepared, prefixLen, 0, undefined, true);
  }, [bookName, chapter, passageVerses]);

  const scheduleNextPlay = useCallback(() => {
    if (!isLoopActiveRef.current) return;
    const nextCount = repeatCountRef.current + 1;
    if (nextCount >= selectedRepeatsRef.current) {
      isLoopActiveRef.current = false;
      setRepeatCount(nextCount);
      setListenComplete(true);
      setIsPlaying(false);
      return;
    }
    setRepeatCount(nextCount);
    speakPassageWithPreferredVoice()
      .then(() => {
        if (isLoopActiveRef.current) scheduleNextPlay();
      })
      .catch(() => {
        isLoopActiveRef.current = false;
      });
  }, [speakPassageWithPreferredVoice]);

  const handleStart = useCallback(() => {
    if (passageVerses.length === 0) {
      showToast('error', 'No passage selected');
      return;
    }
    setAudioStarting(true);
    setRepeatCount(0);
    setListenComplete(false);
    setIsPlaying(true);
    setIsPaused(false);
    isLoopActiveRef.current = true;

    speakPassageWithPreferredVoice()
      .then(() => {
        if (isLoopActiveRef.current) scheduleNextPlay();
      })
      .catch((error: any) => {
        showToast('error', error?.message || 'Audio could not start');
      })
      .finally(() => setAudioStarting(false));
  }, [passageVerses.length, speakPassageWithPreferredVoice, scheduleNextPlay]);

  const handleToggle = useCallback(() => {
    if (isPlaying && !isPaused) {
      setIsPaused(true);
      bibleTTS.pause().catch(() => {});
    } else if (isPaused) {
      setIsPaused(false);
      if (isTtsPaused) {
        bibleTTS.resume().catch(() => {});
      }
    }
  }, [isPlaying, isPaused, isTtsPaused]);

  // ── Repeat count selection ────────────
  const handleSetSelectedRepeats = useCallback((value: number) => {
    setSelectedRepeats(value);
  }, []);

  const handleReset = useCallback(() => {
    isLoopActiveRef.current = false;
    setRepeatCount(0);
    setListenComplete(false);
    setIsPlaying(false);
    setIsPaused(false);
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
        if (data.observations) setObservations(data.observations);
        if (data.learnNotes) setLearnNotes(data.learnNotes);
        // Restore abide fields if resuming from Abide
        if (data.abideReflection) setReflection(data.abideReflection);
        if (data.abidePrayer) setPrayer(data.abidePrayer);
        if (data.abideApplication) setAppText(data.abideApplication);
        if (data.abideTags) setTags(data.abideTags);
        if (data.isPublic !== undefined) setIsPublic(data.isPublic);
        // Restore apply fields if resuming from Apply
        if (data.applyChallenge) setChallengeText(data.applyChallenge);
        if (data.applyResults) setResultsText(data.applyResults);
        // Restore listen stage progress
        if (data.listenRepeats) {
          setSelectedRepeats(Number(data.listenRepeats));
        }
        if (data.listenCompleted) {
          setListenComplete(true);
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
        isLoopActiveRef.current = false;
        bibleTTS.stop().catch(() => {});
        setIsPlaying(false);
        setIsPaused(false);
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
                    color: COLORS.primaryOnSurface ?? COLORS.primary,
                    backgroundColor: `${COLORS.primaryOnSurface ?? COLORS.primary}18`,
                    borderColor: `${COLORS.primaryOnSurface ?? COLORS.primary}35`,
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
      observations={observations}
      setObservations={setObservations}
      saving={saving}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onSaveProgress={saveLook}
      renderHighlightedVerseText={renderHighlightedVerseText}
    />
  );

  // ── Render Listen stage ──────────────────────────────────────────────────
  const renderListen = () => (
    <ListenStage
      styles={styles}
      colors={COLORS}
      passageRef={passageRef}
      bookName={bookName}
      chapter={chapter}
      verseStart={verseStart}
      passageVerses={passageVerses}
      selectedRepeats={selectedRepeats}
      setSelectedRepeats={handleSetSelectedRepeats}
      repeatCount={repeatCount}
      listenComplete={listenComplete}
      isPlaying={isPlaying}
      isPaused={isPaused}
      audioStarting={audioStarting}
      saving={saving}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onStart={handleStart}
      onToggle={handleToggle}
      onReset={handleReset}
      onAdvance={saveListen}
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
      verseStart={verseStart}
      learnTab={learnTab}
      setLearnTab={setLearnTab}
      learnNotes={learnNotes}
      setLearnNotes={setLearnNotes}
      learnDataLoading={learnDataLoading}
      verseResources={verseResources}
      bookPrologue={bookPrologue}
      verseWords={verseWords}
      translations={translations}
      translationsLoading={translationsLoading}
      isPublic={isPublic}
      setIsPublic={setIsPublic}
      saving={saving}
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
      onOpenCrossReference={(ref: string) => {
        // Parse "Book 3:16" / "Book 3:16-17" style references.
        const match = ref.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
        if (!match) return;
        navigation.navigate(route.bible, {
          bookName: match[1].trim(),
          chapter: Number(match[2]),
          verseNumber: match[3] ? Number(match[3]) : undefined,
        });
      }}
      onStrongsWordPress={handleStrongsWordPress}
      onContinue={saveLearn}
    />
  );

  // ── Render Abide stage ───────────────────────────────────────────────────
  const renderAbide = () => (
    <AbideStage
      styles={styles}
      colors={COLORS}
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
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onSaveAbide={saveAbide}
    />
  );

  // ── Render Apply stage ───────────────────────────────────────────────────
  const renderApply = () => (
    <ApplyStage
      styles={styles}
      colors={COLORS}
      passageRef={passageRef}
      bookName={bookName}
      chapter={chapter}
      verseStart={verseStart}
      passageVerses={passageVerses}
      challengeText={challengeText}
      setChallengeText={setChallengeText}
      resultsText={resultsText}
      setResultsText={setResultsText}
      saving={saving}
      pageIndex={pageIndex}
      stageOrder={STAGE_ORDER}
      scrollX={scrollX}
      screenWidth={SCREEN_WIDTH}
      onComplete={saveApply}
      onOpenBibleReader={() =>
        navigation.navigate(route.bible, {
          bookName,
          chapter: parseInt(chapter, 10),
        })
      }
      onOpenChallengeLibrary={() =>
        showToast('info', 'Challenge library coming soon')
      }
      onOpenPastChallenges={() =>
        showToast('info', 'Past challenges coming soon')
      }
    />
  );

  // ── Format study as text ────────────────────────────────────────────
  const formatStudyAsText = useCallback(() => {
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

    const passageTitle = passageRef || `${bookName} ${chapter}`;
    return [
      `📖 Bible Study: ${passageTitle}`,
      `─`.repeat(50),
      '',
      `─── Passage Text ───`,
      passageVerseText || '(Passage text unavailable)',
      '',
      `─── Look: Observations ───`,
      observations || lookNotes || '(No observations recorded)',
      '',
      `─── Learn: Study Notes ───`,
      learnNotes || '(No study notes recorded)',
      '',
      strongsList ? `─── Strong's Words Studied ───\n${strongsList}\n` : '',
      `─── Reflection ───`,
      reflection || '(No reflection recorded)',
      '',
      `─── Prayer ───`,
      prayer || '(No prayer recorded)',
      '',
      `─── Application ───`,
      appText || '(No application recorded)',
      '',
      `─── Challenge ───`,
      challengeText || '(No challenge recorded)',
      '',
      `─── Results ───`,
      resultsText || '(No results recorded)',
      '',
      tags ? `🏷️ Tags: ${tags}` : '',
      '',
      `─`.repeat(50),
      'Created with Exegesis Bible App',
    ]
      .filter(Boolean)
      .join('\n');
  }, [passageVerses, verseWords, passageRef, bookName, chapter, lookNotes, observations, learnNotes, reflection, prayer, appText, tags, challengeText, resultsText]);

  // ── Handle copy entry to clipboard ───────────────────────────────
  const handleCopyEntry = useCallback(async () => {
    try {
      Clipboard.setString(formatStudyAsText());
      showToast('success', 'Study copied to clipboard');
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        console.error('Clipboard failed:', e);
        showToast('error', 'Could not copy to clipboard');
      }
    }
  }, [formatStudyAsText]);

  // ── Handle download / share entry ─────────────────────────────────────
  // Prefers the backend-generated PDF (POST /exegesis/:id/pdf); falls back
  // to sharing the study as plain text when no session or network error.
  const handleDownloadEntry = useCallback(async () => {
    const shareTextFallback = async () => {
      await Share.share({
        message: formatStudyAsText(),
        title: `Exegesis: ${passageRef || `${bookName} ${chapter}`}`,
      });
    };

    if (sessionId) {
      try {
        const res = await sendPostRequest('exegesis', `${sessionId}/pdf`, {}, true);
        if (res.returnCode === 200 && res.returnData?.content) {
          const { content, filename, mimeType } = res.returnData;
          const safeName =
            filename || `exegesis-study-${sessionId}.pdf`;
          const pdfPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${safeName}`;
          await ReactNativeBlobUtil.fs.writeFile(pdfPath, content, 'base64');
          if (Platform.OS === 'android') {
            await ReactNativeBlobUtil.android.actionViewIntent(
              pdfPath,
              mimeType || 'application/pdf',
            );
          } else {
            await Share.share({
              url: `file://${pdfPath}`,
              title: safeName,
            });
          }
          return;
        }
      } catch (e: any) {
        console.error('PDF export failed, falling back to text share:', e);
      }
    }

    try {
      await shareTextFallback();
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        console.error('Share failed:', e);
      }
    }
  }, [sessionId, formatStudyAsText, passageRef, bookName, chapter]);

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
    setObservations('');
    setLearnNotes('');
    setReflection('');
    setPrayer('');
    setAppText('');
    setTags('');
    setChallengeText('');
    setResultsText('');
    setVerseWords([]);
    setPassageVerses([]);
    setListenComplete(false);
    setRepeatCount(0);
    setIsPlaying(false);
    setIsPaused(false);
    setCompleted(false);
    isLoopActiveRef.current = false;
  }, [
    setStage, setSubStage, setSessionId, setBookName, setChapter,
    setVerseStart, setVerseEnd, setLookNotes, setLearnNotes,
    setReflection, setPrayer, setAppText, setTags, setChallengeText,
    setResultsText, setObservations, setVerseWords, setPassageVerses,
    setListenComplete, setRepeatCount, setIsPlaying, setIsPaused, setCompleted,
  ]);

  const renderCompleted = () => (
    <CompletedStage
      styles={styles}
      colors={COLORS}
      onViewLegacyLedger={() => navigation.navigate(route.legacyLedger)}
      onDownloadEntry={handleDownloadEntry}
      onCopyEntry={handleCopyEntry}
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
    apply: 'Apply',
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

      {/* Stage stepper (tappable — matches the Lab design images) */}
      {stage !== 'passage' && !completed && (
        <StageStepper
          stageOrder={STAGE_ORDER}
          pageIndex={pageIndex}
          colors={COLORS}
          onSelect={goToStage}
        />
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
          scrollEnabled={!(isPlaying && !isPaused)}
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
          {/* Apply */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderPage(4, renderApply())}
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

    // Look stage - prompts
    promptCard: {
      borderLeftWidth: 4,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    promptHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    promptQuoteIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    promptText: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      lineHeight: 23,
      paddingTop: 2,
    },
    promptInput: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      marginTop: SPACING.md,
      marginLeft: 50, // aligns under the question text (icon 38 + gap 12)
    },
    promptNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.md,
      marginLeft: 50, // aligns under the question text (icon 38 + gap 12)
    },
    promptNavBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    promptCounter: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
    obsLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    obsIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Look stage - passage text
    passageTextCard: {
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      marginBottom: SPACING.sm,
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
      flexShrink: 1,
    },
    passageTextHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 'auto',
    },
    verseRangeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
    },
    verseRangeChipText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    copyPassageBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    passageVerseRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    passageVerseNum: {
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
      minWidth: 24,
      textAlign: 'right',
      lineHeight: 24,
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
    topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

    // Learn stage - translation comparison
    translationBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: 4,
    },
    translationBadgeText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    translationText: {
      fontSize: FONT_SIZES.md,
      fontStyle: 'italic',
      lineHeight: 23,
      marginTop: 4,
    },

    // Learn stage - commentary copy + cross-ref tap
    commentaryHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
    },
    commentaryCopyBtn: {
      width: 28,
      height: 28,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crossRefTapHint: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      marginTop: 6,
    },

    // Learn stage - word studies
    wordStudyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 4,
    },

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

    // Abide stage - question cards
    abideCard: {
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    abideCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    abideNumBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    abideNumText: { fontSize: 12, fontWeight: '800' },
    abideQuestion: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      lineHeight: 23,
      fontWeight: '700',
      paddingTop: 2,
    },
    abideInput: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      marginTop: SPACING.xs,
      marginLeft: 50, // aligns under the question text (icon 38 + gap 12), icon stands alone
    },

    // Apply stage - link rows
    applyLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: SPACING.md,
    },
    applyLinkText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      flexShrink: 1,
    },
    applyLinkTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    applyLinkSubtitle: {
      fontSize: FONT_SIZES.xs,
      lineHeight: 17,
      marginTop: 2,
    },

    // Apply stage - cards
    applyCard: {
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginTop: SPACING.lg,
    },
    applyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    applyCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyCardTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },
    applyCardSubtitle: {
      fontSize: FONT_SIZES.xs,
      lineHeight: 17,
      marginTop: 2,
    },
    applyInput: {
      minHeight: 96,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
    },

    // Completed
    completedContainer: { alignItems: 'center', paddingTop: SPACING.xxl * 2 },
    completedBadgeWrap: {
      width: 128,
      height: 128,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
    },
    completedBadgeOuter: {
      width: 116,
      height: 116,
      borderRadius: 58,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedBadgeInner: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedSparkle: {
      position: 'absolute',
      top: 4,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
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
    completedSavedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      width: '100%',
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.lg,
    },
    completedSavedIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedSavedTextWrap: { flex: 1 },
    completedSavedTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },
    completedSavedSubtitle: {
      fontSize: FONT_SIZES.xs,
      marginTop: 2,
      lineHeight: 16,
    },
    completedActionsRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      width: '100%',
      marginBottom: SPACING.sm,
    },
    completedActionBtn: { flex: 1 },
    completedPrimaryBtn: { width: '100%' },

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



    textareaWrap: { position: 'relative' },
    promptTagRow: {
      alignItems: 'flex-end',
      marginTop: -SPACING.xs,
      marginBottom: SPACING.md,
    },
    promptTag: {
      fontSize: 9,
      fontWeight: '600',
      backgroundColor: 'rgba(128,128,128,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.round,
    },

    aiTipText: {
      fontSize: FONT_SIZES.sm,
      lineHeight: 20,
    },

    // Listen stage - translations & commentary expandable section
    listenStudySection: {
      borderTopWidth: 1,
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
    },
    listenStudyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: SPACING.xs,
    },
    listenStudyLabel: {
      flex: 1,
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    listenStudyBody: {
      borderTopWidth: 1,
      paddingTop: SPACING.sm,
      marginTop: SPACING.xs,
    },
    listenStudyEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
    },

  });
