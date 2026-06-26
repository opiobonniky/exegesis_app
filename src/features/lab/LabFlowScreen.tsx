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
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
  Share,
  Vibration,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import ActionHeader from '../../reusable/ActionHeader';
import { showToast } from '../../helpers/Toash.helper';
import {
  Eye,
  Ear,
  Brain,
  Heart,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Hash,
  Globe,
  BookText,
  Play,
  Pause,
  CheckCircle2,
  Sparkles,
  FileText,
  BookMarked,
  MessageSquareQuote,
  Tag,
  Lock,
  Save,
  Download,
} from 'lucide-react-native';
import BookSelectorScreen from '../bible/components/BookSelectorScreen';
import ChapterSelectorScreen from '../bible/components/ChapterSelectorScreen';
import { bibleApi } from '../../services/bibleApi';
import {
  getVerseWords,
  getStrongsEntry,
  StrongsWordData,
  StrongsEntry,
} from '../../services/strongsService';
import {
  getVerseResources,
  VerseResourceData,
} from '../../services/verseResourcesApi';
import { bibleTTS } from '../../utilits/bibleTTS';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────────────────
interface BookItem {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

// ── Constants ────────────────────────────────────────────────────────────────
const STAGE_ORDER = ['look', 'listen', 'learn', 'abide'] as const;

const LISTEN_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

const LOOK_PROMPTS = [
  'What specific words or phrases stand out to you in this passage?',
  'Who is speaking? Who is listening or being addressed?',
  'What commands, promises, warnings, or truths do you see?',
  'What is repeated in this passage?',
  'What contrasts do you notice (light/darkness, before/after, etc.)?',
  'What questions does this passage raise in your mind?',
];

// ── Component ────────────────────────────────────────────────────────────────
export default function LabFlowScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<any>().params || {};
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // ── Swipeable carousel ──────────────────────────────────────────────────
  const carouselRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // ── Learn stage tab row ref (horizontal scroll with programmatic auto-scroll) ─
  const tabRowRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, number>>({});
  const [tabScrollX, setTabScrollX] = useState(0);
  const [tabContentWidth, setTabContentWidth] = useState(0);
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const isTabScrollable = tabContentWidth > tabContainerWidth;
  const showRightChevron = isTabScrollable && tabScrollX < tabContentWidth - tabContainerWidth - 10;
  const showLeftChevron = isTabScrollable && tabScrollX > 10;
  const [pageIndex, setPageIndex] = useState(() => {
    const initialStage = routeParams.stage || 'passage';
    const idx = STAGE_ORDER.indexOf(
      initialStage as (typeof STAGE_ORDER)[number],
    );
    return idx >= 0 ? idx : 0;
  });

  // ── State: session & stage ─────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(
    routeParams.sessionId || null,
  );
  const [stage, setStage] = useState<string>(routeParams.stage || 'passage');
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
  const [subStage, setSubStage] = useState<'book' | 'chapter' | 'verse'>(
    routeParams.bookName ? 'verse' : 'book',
  );
  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [maxChapters, setMaxChapters] = useState(0);

  // Fetch books on mount
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const translationId = app?.bibleVersionId || 'Berean';
        const data = await bibleApi.getBooksWithMaxChapters(translationId);
        const mapped: BookItem[] = data.map(b => ({
          name: b.bookName,
          chapters: b.chaptersCount,
          verses: b.totalVerses,
          testament: b.testament as 'Old' | 'New',
        }));
        setBooks(mapped);
      } catch (e) {
        console.error('Failed to fetch books:', e);
      } finally {
        setBooksLoading(false);
      }
    };
    fetchBooks();
  }, [app?.bibleVersionId]);

  // ── Look stage ────────────────────────────────────────────────────────────
  const [lookNotes, setLookNotes] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [passageVerses, setPassageVerses] = useState<
    { verseNumber: number; text: string }[]
  >([]);
  const [passageVersesLoading, setPassageVersesLoading] = useState(false);

  // ── Listen stage ──────────────────────────────────────────────────────────
  const [selectedDuration, setSelectedDuration] = useState<number>(180);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerComplete, setTimerComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animatedValue = useRef(new Animated.Value(1)).current;

  // ── Learn stage ───────────────────────────────────────────────────────────
  const [learnNotes, setLearnNotes] = useState('');
  const [learnTab, setLearnTab] = useState<
    'exegesis' | 'language' | 'history' | 'prologue'
  >('exegesis');
  const [verseWords, setVerseWords] = useState<StrongsWordData[]>([]);
  const [verseResources, setVerseResources] =
    useState<VerseResourceData | null>(null);
  const [learnDataLoading, setLearnDataLoading] = useState(false);
  const [selectedStrongsWord, setSelectedStrongsWord] =
    useState<StrongsWordData | null>(null);
  const [selectedStrongsEntry, setSelectedStrongsEntry] =
    useState<StrongsEntry | null>(null);
  const [strongsEntryLoading, setStrongsEntryLoading] = useState(false);

  // ── TTS audio state ──────────────────────────────────────────────────────
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsPaused, setIsTtsPaused] = useState(false);

  // Subscribe to bibleTTS state changes
  useEffect(() => {
    const unsub = bibleTTS.subscribe(state => {
      setIsTtsPlaying(state.isPlaying);
      setIsTtsPaused(state.isPaused);
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

  // ── Timer logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      timerRef.current = setInterval(() => {
        setTimerElapsed(prev => {
          const next = prev + 1;
          if (next >= selectedDuration) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            setTimerComplete(true);
            return selectedDuration;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerPaused, selectedDuration]);

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
  }, [timerRunning, timerPaused]);

  const remaining = selectedDuration - timerElapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = selectedDuration > 0 ? timerElapsed / selectedDuration : 0;

  const formatTimeStr = (m: number, s: number) =>
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  // ── Sync pageIndex → stage (when swiping) ─────────────────────────────
  useEffect(() => {
    const newStage = STAGE_ORDER[pageIndex];
    if (newStage && newStage !== stage) {
      setStage(newStage);
    }
  }, [pageIndex]);

  // ── Stop TTS when swiping away from Listen ─────────────────────────────
  const prevPageRef = useRef(pageIndex);
  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = pageIndex;
    const prevStage = STAGE_ORDER[prev];
    const currentStage = STAGE_ORDER[pageIndex];
    if (prevStage !== currentStage) {
      // Swiped away from Listen → stop TTS
      if (prevStage === 'listen' && isTtsPlaying) {
        bibleTTS.stop().catch(() => {});
      }
      // Swiped to Listen → no auto-start, user taps "Play"
    }
  }, [pageIndex, isTtsPlaying]);

  // ── Scroll carousel to follow stage changes from Continue buttons ──────
  const goToStage = useCallback((newStage: string, animated = true) => {
    const idx = STAGE_ORDER.indexOf(newStage as (typeof STAGE_ORDER)[number]);
    if (idx < 0) return;
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
  }, []); // empty deps — runs once on mount

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
  }, []); // empty deps — runs once on mount

  // ── Book/chapter selection handlers ─────────────────────────────────────
  const handleSelectBook = useCallback(
    (selectedBook: string) => {
      setBookName(selectedBook);
      const found = books.find(b => b.name === selectedBook);
      if (found) setMaxChapters(found.chapters);
      setChapter('');
      setVerseStart('');
      setVerseEnd('');
      setSubStage('chapter');
    },
    [books],
  );

  const handleSelectChapter = useCallback((ch: number) => {
    setChapter(String(ch));
    setSubStage('verse');
  }, []);

  const handleBackToBooks = useCallback(() => {
    setSubStage('book');
  }, []);

  // ── API calls ────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!bookName || !chapter) {
      showToast('error', 'Please select a book and chapter');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPostRequest('exegesis', 'start', {
        bookName,
        chapter: parseInt(chapter, 10),
        verseStart: verseStart ? parseInt(verseStart, 10) : undefined,
        verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
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
    if (!sessionId) return;
    setSaving(true);
    try {
      await sendPostRequest('exegesis', `${sessionId}/look`, {
        notes: lookNotes,
      });
      goToStage('listen');
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
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
    timerComplete,
    learnNotes,
    reflection,
    prayer,
    appText,
    tags,
    isPublic,
  ]);

  // ── TTS passage playback for Listen stage ─────────────────────────────
  const handlePlayPassageAudio = useCallback(async () => {
    if (!passageVerses.length) return;
    if (isTtsPlaying && isTtsPaused) {
      await bibleTTS.resume();
    } else if (isTtsPlaying) {
      await bibleTTS.pause();
    } else {
      await bibleTTS.stop();
      const verses = passageVerses.map(v => ({
        num: v.verseNumber,
        text: v.text,
      }));
      await bibleTTS.speakVerses(verses, bookName, parseInt(chapter, 10), {
        announceLocation: true,
        announceVerseNumbers: passageVerses.length <= 5,
      });
    }
  }, [passageVerses, bookName, chapter, isTtsPlaying, isTtsPaused]);

  // Cleanup TTS when leaving the screen
  useEffect(() => {
    return () => {
      bibleTTS.stop().catch(() => {});
    };
  }, []);

  // ── Strong's word press handler ────────────────────────────────────────
  const handleStrongsWordPress = useCallback(async (word: StrongsWordData) => {
    setSelectedStrongsWord(word);
    setStrongsEntryLoading(true);
    setSelectedStrongsEntry(null);
    if (word.strongsId && word.hasData) {
      try {
        const res = await getStrongsEntry(word.strongsId);
        if (res?.returnData) {
          setSelectedStrongsEntry(res.returnData);
        }
      } catch (e) {
        console.error('Failed to fetch Strongs entry:', e);
      }
    }
    setStrongsEntryLoading(false);
  }, []);

  // ── Load session data on resume ────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const loadSession = async () => {
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
          if (data.journalEntryId) setJournalEntryId(data.journalEntryId);          // Restore listen stage progress
          if (data.listenDuration) setSelectedDuration(Number(data.listenDuration));
          if (data.listenCompleted) {
            setTimerComplete(true);
            setTimerElapsed(Number(data.listenDuration) || selectedDuration);
          } else if (data.listenElapsed != null && Number(data.listenElapsed) > 0) {
            // Mid-timer — restore elapsed seconds and resume the countdown
            setTimerElapsed(Number(data.listenElapsed));
            setTimerRunning(true);
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
    };
    loadSession();
  }, [sessionId]);

  // ── Fetch passage verses when entering any stage that needs them ─────
  useEffect(() => {
    if (!bookName || !chapter) return;
    if (passageVerses.length > 0) return; // already fetched
    const fetchPassage = async () => {
      setPassageVersesLoading(true);
      try {
        const translationId = app?.bibleVersionId || 'Berean';
        const ch = parseInt(chapter, 10);
        const vs = parseInt(verseStart || '1', 10);
        const ve = parseInt(verseEnd || '0', 10);
        const chapterData = await bibleApi.getVerses(
          translationId,
          bookName,
          ch,
        );
        if (chapterData?.verses?.length) {
          const filtered = chapterData.verses.filter(v => {
            if (ve > vs) return v.verseNumber >= vs && v.verseNumber <= ve;
            return v.verseNumber >= vs;
          });
          setPassageVerses(filtered);
        }
      } catch (e) {
        console.error('Failed to fetch passage verses:', e);
      } finally {
        setPassageVersesLoading(false);
      }
    };
    fetchPassage();
  }, [
    bookName,
    chapter,
    verseStart,
    verseEnd,
    app?.bibleVersionId,
    passageVerses.length,
  ]);

  // ── Fetch Learn stage data when entering the Learn stage ──────────────
  useEffect(() => {
    if (stage !== 'learn' || !bookName || !chapter) return;
    const fetchLearnData = async () => {
      setLearnDataLoading(true);
      const ch = parseInt(chapter, 10);
      const vs = parseInt(verseStart || '1', 10);
      try {
        const translationId = app?.bibleVersionId || 'Berean';
        const [wordsRes, resourcesRes] = await Promise.allSettled([
          getVerseWords(bookName, ch, vs, translationId),
          getVerseResources(bookName, ch, vs),
        ]);
        if (wordsRes.status === 'fulfilled' && wordsRes.value?.returnData) {
          setVerseWords(wordsRes.value.returnData);
        }
        if (
          resourcesRes.status === 'fulfilled' &&
          resourcesRes.value?.returnData
        ) {
          setVerseResources(resourcesRes.value.returnData);
        }
        // If verseStart > 1, also try fetching words for verse 1 for more context
        if (
          vs > 1 &&
          wordsRes.status === 'fulfilled' &&
          (!wordsRes.value?.returnData ||
            wordsRes.value.returnData.length === 0)
        ) {
          const fallbackRes = await getVerseWords(
            bookName,
            ch,
            undefined,
            translationId,
          );
          if (fallbackRes?.returnData) {
            setVerseWords(fallbackRes.returnData);
          }
        }
      } catch (e) {
        console.error('Failed to fetch Learn data:', e);
      } finally {
        setLearnDataLoading(false);
      }
    };
    fetchLearnData();
  }, [stage, bookName, chapter, verseStart, app?.bibleVersionId]);

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

  // ── Render verse range input (after book+chapter selected) ────────────────
  const renderVerseInput = () => (
    <View style={styles.stageContainer}>
      <View style={styles.passageHeader}>
        <BookOpen size={24} color={COLORS.accent} />
        <Text style={[styles.passageTitle, { color: COLORS.text }]}>
          Choose Your Passage
        </Text>
        <Text style={[styles.passageSubtitle, { color: COLORS.textSecondary }]}>
          Select the Scripture you want to study through the 4-step journey.
        </Text>
      </View>

      {/* Selected book + chapter badge */}
      <TouchableOpacity
        style={[
          styles.selectedBadge,
          {
            backgroundColor: COLORS.cardBackground,
            borderColor: COLORS.border,
          },
        ]}
        onPress={handleBackToBooks}
        activeOpacity={0.7}
      >
        <BookOpen size={16} color={COLORS.primary} />
        <Text style={[styles.selectedBadgeText, { color: COLORS.text }]}>
          {bookName} {chapter}
        </Text>
        <ChevronRight size={14} color={COLORS.muted} />
      </TouchableOpacity>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
            Verse (start)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
                color: COLORS.text,
              },
            ]}
            placeholder="16"
            placeholderTextColor={COLORS.muted}
            value={verseStart}
            onChangeText={setVerseStart}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
            Verse (end)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
                color: COLORS.text,
              },
            ]}
            placeholder="21"
            placeholderTextColor={COLORS.muted}
            value={verseEnd}
            onChangeText={setVerseEnd}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: COLORS.accent, opacity: loading ? 0.6 : 1 },
        ]}
        onPress={startSession}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Begin Study</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ── Render Look stage ────────────────────────────────────────────────────
  const renderLook = () => (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View
          style={[styles.stageBadge, { backgroundColor: `${COLORS.accent}20` }]}
        >
          <Eye size={20} color={COLORS.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: COLORS.accent }]}>
          Step 1 of 4
        </Text>
        <Text style={[styles.stageTitle, { color: COLORS.text }]}>Look</Text>
        <Text style={[styles.stageSubtitle, { color: COLORS.textSecondary }]}>
          What does the text say?
        </Text>
        {passageRef && (
          <View
            style={[
              styles.passageChip,
              { backgroundColor: `${COLORS.primary}15` },
            ]}
          >
            <BookOpen size={12} color={COLORS.primary} />
            <Text style={[styles.passageChipText, { color: COLORS.primary }]}>
              {passageRef}
            </Text>
          </View>
        )}
      </View>

      {/* Guided prompt */}
      <View
        style={[
          styles.promptCard,
          {
            backgroundColor: COLORS.cardBackground,
            borderLeftColor: COLORS.accent,
          },
        ]}
      >
        <MessageSquareQuote size={16} color={COLORS.accent} />
        <Text style={[styles.promptText, { color: COLORS.text }]}>
          {LOOK_PROMPTS[currentPromptIdx]}
        </Text>
        <View style={styles.promptNav}>
          <TouchableOpacity
            onPress={() => setCurrentPromptIdx(p => Math.max(0, p - 1))}
            disabled={currentPromptIdx === 0}
          >
            <ChevronLeft
              size={18}
              color={currentPromptIdx === 0 ? COLORS.muted : COLORS.accent}
            />
          </TouchableOpacity>
          <Text style={[styles.promptCounter, { color: COLORS.muted }]}>
            {currentPromptIdx + 1} / {LOOK_PROMPTS.length}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setCurrentPromptIdx(p => Math.min(LOOK_PROMPTS.length - 1, p + 1))
            }
            disabled={currentPromptIdx === LOOK_PROMPTS.length - 1}
          >
            <ChevronRight
              size={18}
              color={
                currentPromptIdx === LOOK_PROMPTS.length - 1
                  ? COLORS.muted
                  : COLORS.accent
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Passage text */}
      {passageVersesLoading ? (
        <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      ) : passageVerses.length > 0 ? (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: COLORS.surface,
              borderColor: COLORS.border,
              borderLeftColor: COLORS.primary,
            },
          ]}
        >
          <View
            style={[
              styles.passageTextHeader,
              { borderBottomColor: COLORS.border },
            ]}
          >
            <BookOpen size={14} color={COLORS.primary} />
            <Text style={[styles.passageTextLabel, { color: COLORS.primary }]}>
              {passageRef || `${bookName} ${chapter}`}
            </Text>
          </View>
          {passageVerses.map(v => (
            <View key={v.verseNumber} style={styles.passageVerseRow}>
              <Text style={[styles.passageVerseNum, { color: COLORS.muted }]}>
                {v.verseNumber}
              </Text>
              <Text style={[styles.passageVerseText, { color: COLORS.text }]}>
                {v.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Notes */}
      <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
        Your Observations
      </Text>
      <TextInput
        style={[
          styles.textarea,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
        ]}
        placeholder="Write what you observe in this passage..."
        placeholderTextColor={COLORS.muted}
        value={lookNotes}
        onChangeText={setLookNotes}
        multiline
        textAlignVertical="top"
      />

      {/* Save Progress button */}
      <TouchableOpacity
        style={[styles.saveProgressBtn, { borderColor: COLORS.muted }]}
        onPress={() => saveCurrentProgress()}
        disabled={savingProgress}
        activeOpacity={0.7}
      >
        {savingProgress ? (
          <ActivityIndicator size="small" color={COLORS.muted} />
        ) : (
          <>
            <Save size={14} color={COLORS.muted} />
            <Text style={[styles.saveProgressText, { color: COLORS.muted }]}>
              Save Progress
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
        onPress={saveLook}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Continue to Listen</Text>
        )}
      </TouchableOpacity>

      {/* Page indicator (animated via scrollX) */}
      <View style={styles.pageIndicator}>
        {STAGE_ORDER.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor:
                    idx === pageIndex ? COLORS.accent : COLORS.muted,
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  width: idx === pageIndex ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );

  // ── Render Listen stage ──────────────────────────────────────────────────
  const renderListen = () => (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View
          style={[styles.stageBadge, { backgroundColor: `${COLORS.accent}20` }]}
        >
          <Ear size={20} color={COLORS.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: COLORS.accent }]}>
          Step 2 of 4
        </Text>
        <Text style={[styles.stageTitle, { color: COLORS.text }]}>Listen</Text>
        <Text style={[styles.stageSubtitle, { color: COLORS.textSecondary }]}>
          Be still and dwell in the Word
        </Text>
        {passageRef && (
          <View
            style={[
              styles.passageChip,
              { backgroundColor: `${COLORS.primary}15` },
            ]}
          >
            <BookOpen size={12} color={COLORS.primary} />
            <Text style={[styles.passageChipText, { color: COLORS.primary }]}>
              {passageRef}
            </Text>
          </View>
        )}
      </View>

      {!timerComplete ? (
        <>
          {/* Duration picker (before timer starts) */}
          {!timerRunning && !timerPaused && (
            <>
              <Text
                style={[styles.textareaLabel, { color: COLORS.textSecondary }]}
              >
                How long would you like to dwell in the Word?
              </Text>
              <View style={styles.durationRow}>
                {LISTEN_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.durationChip,
                      selectedDuration === opt.value
                        ? {
                            backgroundColor: COLORS.accent,
                            borderColor: COLORS.accent,
                          }
                        : {
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.border,
                          },
                    ]}
                    onPress={() => setSelectedDuration(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        {
                          color:
                            selectedDuration === opt.value
                              ? '#FFFFFF'
                              : COLORS.text,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Play passage audio */}
              {passageVerses.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    { borderColor: COLORS.accent, marginBottom: SPACING.md },
                  ]}
                  onPress={handlePlayPassageAudio}
                  activeOpacity={0.7}
                >
                  {isTtsPlaying && !isTtsPaused ? (
                    <Pause size={16} color={COLORS.accent} />
                  ) : (
                    <Play size={16} color={COLORS.accent} />
                  )}
                  <Text
                    style={[styles.secondaryBtnText, { color: COLORS.accent }]}
                  >
                    {isTtsPlaying && isTtsPaused
                      ? 'Resume Passage'
                      : isTtsPlaying
                        ? 'Pause Passage'
                        : 'Play Passage Audio'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
                onPress={async () => {
                  // Start reading passage when timer begins
                  if (passageVerses.length > 0 && !isTtsPlaying) {
                    await bibleTTS.stop();
                    const verses = passageVerses.map(v => ({
                      num: v.verseNumber,
                      text: v.text,
                    }));
                    bibleTTS
                      .speakVerses(verses, bookName, parseInt(chapter, 10), {
                        announceLocation: true,
                        announceVerseNumbers: passageVerses.length <= 5,
                      })
                      .catch(() => {});
                  }
                  setTimerRunning(true);
                  setTimerElapsed(0);
                }}
                activeOpacity={0.8}
              >
                <Play size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  Begin{' '}
                  {LISTEN_OPTIONS.find(o => o.value === selectedDuration)
                    ?.label || ''}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Timer UI */}
          {(timerRunning || timerPaused) && (
            <View style={styles.timerContainer}>
              {/* Swipe indicator — lock while timer runs, unlock when paused */}
              <View style={styles.swipeHintRow}>
                {timerRunning && !timerPaused ? (
                  <>
                    <Lock
                      size={12}
                      color={COLORS.muted}
                      style={{ opacity: 0.5 }}
                    />
                    <Text
                      style={[styles.swipeHintText, { color: COLORS.muted }]}
                    >
                      Focus mode — swipe locked while timer runs
                    </Text>
                  </>
                ) : (
                  <>
                    <ChevronLeft
                      size={12}
                      color={COLORS.muted}
                      style={{ opacity: 0.4 }}
                    />
                    <Text
                      style={[styles.swipeHintText, { color: COLORS.muted }]}
                    >
                      Swipe to explore other stages
                    </Text>
                    <ChevronRight
                      size={12}
                      color={COLORS.muted}
                      style={{ opacity: 0.4 }}
                    />
                  </>
                )}
              </View>

              {/* Circular progress */}
              <Animated.View
                style={[
                  styles.circleOuter,
                  {
                    borderColor: COLORS.accent,
                    opacity: animatedValue,
                    transform: [{ scale: animatedValue }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.circleInner,
                    { backgroundColor: COLORS.cardBackground },
                  ]}
                >
                  <Text style={[styles.timerText, { color: COLORS.text }]}>
                    {formatTimeStr(minutes, seconds)}
                  </Text>
                  <Text style={[styles.timerLabel, { color: COLORS.muted }]}>
                    remaining
                  </Text>

                  {/* Progress bar */}
                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: COLORS.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: COLORS.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Animated.View>

              {/* Controls */}
              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={[
                    styles.timerBtn,
                    {
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                    },
                  ]}
                  onPress={() => {
                    if (timerRunning && !timerPaused) {
                      setTimerPaused(true);
                    } else if (timerPaused) {
                      setTimerPaused(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {timerPaused || !timerRunning ? (
                    <Play size={24} color={COLORS.accent} />
                  ) : (
                    <Pause size={24} color={COLORS.accent} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timerBtnSmall,
                    {
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                    },
                  ]}
                  onPress={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setTimerRunning(false);
                    setTimerPaused(false);
                    setTimerElapsed(0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.timerBtnSmallText, { color: COLORS.error }]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        /* Amen state — timer complete */
        <View style={styles.amenContainer}>
          <View
            style={[
              styles.amenCircle,
              { backgroundColor: `${COLORS.accent}20` },
            ]}
          >
            <CheckCircle2 size={48} color={COLORS.accent} />
          </View>
          <Text style={[styles.amenText, { color: COLORS.text }]}>Amen</Text>
          <Text style={[styles.amenSubtext, { color: COLORS.textSecondary }]}>
            You have dwelled in the Word for{' '}
            {formatTimeStr(
              Math.floor(selectedDuration / 60),
              selectedDuration % 60,
            )}
            .
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
            onPress={saveListen}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Brain size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Continue to Learn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Page indicator (animated via scrollX) */}
      <View style={styles.pageIndicator}>
        {STAGE_ORDER.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor:
                    idx === pageIndex ? COLORS.accent : COLORS.muted,
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  width: idx === pageIndex ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );

  // ── Render Learn stage ───────────────────────────────────────────────────
  const renderLearn = () => {
    const tabs: { id: typeof learnTab; label: string; icon: any }[] = [
      { id: 'exegesis', label: 'Exegesis Notes', icon: BookText },
      { id: 'language', label: 'Original Language', icon: Hash },
      { id: 'history', label: 'Historical Context', icon: Globe },
      { id: 'prologue', label: 'Book Prologue', icon: BookOpen },
    ];

    const resources = verseResources;
    const hasResources =
      resources &&
      ((resources.commentaries?.length ?? 0) > 0 ||
        (resources.crossReferences?.length ?? 0) > 0 ||
        (resources.wordStudies?.length ?? 0) > 0 ||
        (resources.dictionaryTerms?.length ?? 0) > 0 ||
        (resources.relatedTopics?.length ?? 0) > 0);

    const renderExegesisNotes = () => (
      <View>
        {/* Guiding questions — always shown */}
        <View
          style={[
            styles.promptCard,
            {
              backgroundColor: COLORS.cardBackground,
              borderLeftColor: COLORS.accent,
              marginBottom: SPACING.md,
            },
          ]}
        >
          <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
            Guiding Questions
          </Text>
          <Text
            style={[
              styles.learnText,
              { color: COLORS.textSecondary, marginTop: SPACING.xs },
            ]}
          >
            Consider the central truth this passage communicates. What is the
            author's main point? How does this passage fit into the broader
            biblical narrative?
          </Text>
          <Text
            style={[
              styles.learnText,
              { color: COLORS.textSecondary, marginTop: SPACING.sm },
            ]}
          >
            What does this passage reveal about God, humanity, salvation, or the
            Christian life? How does it point to Christ?
          </Text>
          <Text
            style={[
              styles.learnText,
              { color: COLORS.textSecondary, marginTop: SPACING.sm },
            ]}
          >
            How should this truth change how you think, believe, or live today?
          </Text>
        </View>

        {/* Commentaries from Verse Resources */}
        {resources?.commentaries && resources.commentaries.length > 0 && (
          <>
            <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
              Commentaries
            </Text>
            {resources.commentaries.map((c, i) => (
              <View
                key={`comm-${i}`}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderLeftColor: COLORS.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.resourceCardAuthor, { color: COLORS.primary }]}
                >
                  {c.author}
                </Text>
                <Text
                  style={[styles.resourceCardLabel, { color: COLORS.muted }]}
                >
                  {c.title}
                </Text>
                <View
                  style={[styles.divider, { backgroundColor: COLORS.border }]}
                />
                <Text style={[styles.resourceCardText, { color: COLORS.text }]}>
                  {c.text}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Cross References */}
        {resources?.crossReferences && resources.crossReferences.length > 0 && (
          <>
            <Text
              style={[
                styles.learnSectionTitle,
                { color: COLORS.text, marginTop: SPACING.md },
              ]}
            >
              Cross References
            </Text>
            {resources.crossReferences.map((ref, i) => (
              <View
                key={`xref-${i}`}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderLeftColor: COLORS.accent,
                  },
                ]}
              >
                <Text
                  style={[styles.resourceCardRef, { color: COLORS.accent }]}
                >
                  {ref.ref}
                </Text>
                <Text
                  style={[
                    styles.resourceCardText,
                    { color: COLORS.textSecondary },
                  ]}
                >
                  {ref.text}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Empty state */}
        {!hasResources && !learnDataLoading && (
          <Text
            style={[
              styles.learnText,
              {
                color: COLORS.muted,
                fontStyle: 'italic',
                textAlign: 'center',
                paddingVertical: SPACING.lg,
              },
            ]}
          >
            No commentary or cross-reference data available for this passage
            yet. Use the guiding questions above to aid your study.
          </Text>
        )}
      </View>
    );

    const renderOriginalLanguage = () => {
      if (selectedStrongsWord) {
        return (
          <View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: SPACING.md,
              }}
              onPress={() => {
                setSelectedStrongsWord(null);
                setSelectedStrongsEntry(null);
              }}
              activeOpacity={0.7}
            >
              <ChevronLeft size={16} color={COLORS.accent} />
              <Text
                style={[
                  styles.learnText,
                  { color: COLORS.accent, fontWeight: '600' },
                ]}
              >
                Back to all words
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.resourceCard,
                {
                  backgroundColor: COLORS.surface,
                  borderColor: COLORS.border,
                  borderLeftColor: COLORS.accent,
                },
              ]}
            >
              <Text style={[styles.strongsDetailWord, { color: COLORS.text }]}>
                {selectedStrongsWord.surfaceText}
              </Text>
              {selectedStrongsWord.strongsId && (
                <Text
                  style={[
                    styles.strongsDetailStrongs,
                    { color: COLORS.accent },
                  ]}
                >
                  Strong's {selectedStrongsWord.strongsId}
                </Text>
              )}
              {selectedStrongsWord.lemma && (
                <Text
                  style={[
                    styles.strongsDetailLemma,
                    { color: COLORS.textSecondary },
                  ]}
                >
                  Lemma: {selectedStrongsWord.lemma}
                </Text>
              )}
              {selectedStrongsWord.morphology && (
                <Text
                  style={[
                    styles.strongsDetailMorph,
                    { color: COLORS.textSecondary },
                  ]}
                >
                  Morphology: {selectedStrongsWord.morphology}
                </Text>
              )}
              <View
                style={[styles.divider, { backgroundColor: COLORS.border }]}
              />
              {strongsEntryLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : selectedStrongsEntry ? (
                <>
                  <Text
                    style={[styles.strongsDetailDef, { color: COLORS.text }]}
                  >
                    {selectedStrongsEntry.shortDefinition}
                  </Text>
                  {selectedStrongsEntry.transliteration && (
                    <Text
                      style={[
                        styles.strongsDetailTranslit,
                        { color: COLORS.textSecondary },
                      ]}
                    >
                      Transliteration: {selectedStrongsEntry.transliteration}
                    </Text>
                  )}
                  {selectedStrongsEntry.originalWord && (
                    <Text
                      style={[
                        styles.strongsDetailOriginal,
                        { color: COLORS.textSecondary },
                      ]}
                    >
                      Original: {selectedStrongsEntry.originalWord} (
                      {selectedStrongsEntry.language})
                    </Text>
                  )}
                  {selectedStrongsEntry.partOfSpeech && (
                    <Text
                      style={[styles.strongsDetailPos, { color: COLORS.muted }]}
                    >
                      {selectedStrongsEntry.partOfSpeech}
                      {selectedStrongsEntry.grammaticalCase
                        ? ` | Case: ${selectedStrongsEntry.grammaticalCase}`
                        : ''}
                      {selectedStrongsEntry.gender
                        ? ` | Gender: ${selectedStrongsEntry.gender}`
                        : ''}
                      {selectedStrongsEntry.number
                        ? ` | Number: ${selectedStrongsEntry.number}`
                        : ''}
                    </Text>
                  )}
                  {selectedStrongsEntry.usageCount !== null && (
                    <Text
                      style={[
                        styles.strongsDetailUsage,
                        { color: COLORS.muted },
                      ]}
                    >
                      Used {selectedStrongsEntry.usageCount} times
                    </Text>
                  )}
                </>
              ) : selectedStrongsWord.strongsId ? (
                <Text
                  style={[styles.strongsDetailEmpty, { color: COLORS.muted }]}
                >
                  No detailed entry found.
                </Text>
              ) : (
                <Text
                  style={[styles.strongsDetailEmpty, { color: COLORS.muted }]}
                >
                  No Strong's data for this word.
                </Text>
              )}
            </View>
          </View>
        );
      }

      if (learnDataLoading) {
        return (
          <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text
              style={[
                styles.learnText,
                { color: COLORS.muted, marginTop: SPACING.sm },
              ]}
            >
              Loading word data...
            </Text>
          </View>
        );
      }

      if (verseWords.length === 0) {
        return (
          <View>
            <Text style={[styles.learnText, { color: COLORS.textSecondary }]}>
              No Strong's word data available for this verse in the current
              translation. Try opening the Bible Reader to see word-level
              details with dotted underlines.
            </Text>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: COLORS.primary }]}
              onPress={() =>
                navigation.navigate(route.bible, {
                  bookName,
                  chapter: parseInt(chapter, 10),
                })
              }
              activeOpacity={0.7}
            >
              <Hash size={16} color={COLORS.primary} />
              <Text
                style={[styles.secondaryBtnText, { color: COLORS.primary }]}
              >
                Open Bible Reader
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View>
          <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
            Words in this Passage
          </Text>
          <Text
            style={[
              styles.learnText,
              { color: COLORS.textSecondary, marginBottom: SPACING.md },
            ]}
          >
            Tap any word to see its Strong's Concordance entry.
          </Text>
          {verseWords.map((word, i) => (
            <TouchableOpacity
              key={`vw-${i}`}
              style={[
                styles.wordRow,
                { backgroundColor: COLORS.surface, borderColor: COLORS.border },
              ]}
              onPress={() => handleStrongsWordPress(word)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.wordIndex,
                  { backgroundColor: `${COLORS.accent}15` },
                ]}
              >
                <Text style={[styles.wordIndexText, { color: COLORS.accent }]}>
                  {word.verseNumber || i + 1}
                </Text>
              </View>
              <View style={styles.wordContent}>
                <Text style={[styles.wordSurfaceText, { color: COLORS.text }]}>
                  {word.surfaceText}
                </Text>
                <View style={styles.wordMeta}>
                  {word.strongsId && (
                    <View
                      style={[
                        styles.wordBadge,
                        { backgroundColor: `${COLORS.accent}12` },
                      ]}
                    >
                      <Text
                        style={[styles.wordBadgeText, { color: COLORS.accent }]}
                      >
                        H{word.strongsId.replace(/^H/, '').replace(/^G/, 'G')}
                      </Text>
                    </View>
                  )}
                  {word.lemma && (
                    <Text style={[styles.wordLemma, { color: COLORS.muted }]}>
                      {word.lemma}
                    </Text>
                  )}
                  {word.morphology && (
                    <Text
                      style={[styles.wordMorph, { color: COLORS.muted }]}
                      numberOfLines={1}
                    >
                      {word.morphology}
                    </Text>
                  )}
                </View>
              </View>
              <ChevronRight size={14} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>
      );
    };

    const renderHistoricalContext = () => (
      <View>
        {/* Dictionary / Cultural Terms */}
        {resources?.dictionaryTerms && resources.dictionaryTerms.length > 0 ? (
          <>
            <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
              Key Terms & Cultural Background
            </Text>
            {resources.dictionaryTerms.map((d, i) => (
              <View
                key={`dict-${i}`}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderLeftColor: COLORS.success,
                  },
                ]}
              >
                <Text
                  style={[styles.resourceCardTitle, { color: COLORS.text }]}
                >
                  {d.term}
                </Text>
                {d.pronunciation && (
                  <Text
                    style={[
                      styles.resourceCardLabel,
                      { color: COLORS.muted, fontStyle: 'italic' },
                    ]}
                  >
                    /{d.pronunciation}/
                  </Text>
                )}
                <View
                  style={[
                    styles.dividerThin,
                    { backgroundColor: COLORS.border },
                  ]}
                />
                <Text
                  style={[styles.resourceCardDef, { color: COLORS.success }]}
                >
                  {d.definition}
                </Text>
                <Text
                  style={[
                    styles.resourceCardText,
                    { color: COLORS.textSecondary, marginTop: SPACING.xs },
                  ]}
                >
                  {d.description}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={[styles.learnText, { color: COLORS.textSecondary }]}>
            Understanding the historical and cultural setting helps you grasp
            what the passage meant to its original audience.
          </Text>
        )}

        {/* Word Studies from Verse Resources */}
        {resources?.wordStudies && resources.wordStudies.length > 0 && (
          <>
            <Text
              style={[
                styles.learnSectionTitle,
                { color: COLORS.text, marginTop: SPACING.lg },
              ]}
            >
              Word Studies
            </Text>
            {resources.wordStudies.map((ws, i) => (
              <View
                key={`ws-${i}`}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderLeftColor: COLORS.accent,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={[styles.resourceCardTitle, { color: COLORS.text }]}
                  >
                    {ws.word}
                  </Text>
                  <Text
                    style={[styles.resourceCardLabel, { color: COLORS.muted }]}
                  >
                    ({ws.transliteration})
                  </Text>
                  {ws.strongs && (
                    <Text
                      style={[
                        styles.strongsBadgeSmall,
                        {
                          backgroundColor: `${COLORS.accent}15`,
                          color: COLORS.accent,
                        },
                      ]}
                    >
                      {ws.strongs}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.resourceCardText,
                    { color: COLORS.textSecondary },
                  ]}
                >
                  {ws.meaning}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Author & Audience */}
        <View
          style={[
            styles.resourceCard,
            {
              backgroundColor: COLORS.cardBackground,
              borderColor: COLORS.border,
              borderLeftColor: COLORS.primary,
              marginTop: SPACING.md,
            },
          ]}
        >
          <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
            Author & Audience
          </Text>
          <Text
            style={[
              styles.learnText,
              { color: COLORS.textSecondary, marginTop: SPACING.xs },
            ]}
          >
            Who wrote this book? To whom was it written? What was the occasion
            or purpose? These details shape how we understand the message.
          </Text>
        </View>

        {/* Empty state */}
        {(!resources?.dictionaryTerms ||
          resources.dictionaryTerms.length === 0) &&
          (!resources?.wordStudies || resources.wordStudies.length === 0) &&
          !learnDataLoading && (
            <Text
              style={[
                styles.learnText,
                {
                  color: COLORS.muted,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  paddingVertical: SPACING.lg,
                },
              ]}
            >
              No historical context data available for this passage yet.
            </Text>
          )}
      </View>
    );

    const renderBookPrologue = () => (
      <View>
        <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
          About {bookName}
        </Text>
        <Text style={[styles.learnText, { color: COLORS.textSecondary }]}>
          Learn about the book's author, audience, date, purpose, and key
          themes. This background helps you read with greater understanding.
        </Text>

        {/* Related Topics from Verse Resources */}
        {resources?.relatedTopics && resources.relatedTopics.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
              Related Themes
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {resources.relatedTopics.map((t, i) => (
                <View
                  key={`topic-${i}`}
                  style={[
                    styles.topicPill,
                    {
                      backgroundColor: `${COLORS.primary}10`,
                      borderColor: `${COLORS.primary}25`,
                    },
                  ]}
                >
                  <Text
                    style={[styles.topicPillText, { color: COLORS.primary }]}
                  >
                    {t.name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Word Studies */}
        {resources?.wordStudies && resources.wordStudies.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.learnSectionTitle, { color: COLORS.text }]}>
              Key Words in {bookName}
            </Text>
            {resources.wordStudies.slice(0, 3).map((ws, i) => (
              <View
                key={`ws-pl-${i}`}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderLeftColor: COLORS.accent,
                    marginBottom: SPACING.sm,
                  },
                ]}
              >
                <Text
                  style={[styles.resourceCardTitle, { color: COLORS.text }]}
                >
                  {ws.word}
                </Text>
                <Text
                  style={[
                    styles.resourceCardText,
                    { color: COLORS.textSecondary },
                  ]}
                >
                  {ws.meaning}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: COLORS.primary }]}
          onPress={() =>
            navigation.navigate(route.bible, {
              bookName,
              chapter: parseInt(chapter, 10),
            })
          }
          activeOpacity={0.7}
        >
          <BookOpen size={16} color={COLORS.primary} />
          <Text style={[styles.secondaryBtnText, { color: COLORS.primary }]}>
            Open {bookName} in Bible Reader
          </Text>
        </TouchableOpacity>
      </View>
    );

    const renderTabContent = () => {
      switch (learnTab) {
        case 'exegesis':
          return renderExegesisNotes();
        case 'language':
          return renderOriginalLanguage();
        case 'history':
          return renderHistoricalContext();
        case 'prologue':
          return renderBookPrologue();
        default:
          return null;
      }
    };

    return (
      <View style={styles.stageContainer}>
        <View style={styles.stageHeader}>
          <View
            style={[
              styles.stageBadge,
              { backgroundColor: `${COLORS.accent}20` },
            ]}
          >
            <Brain size={20} color={COLORS.accent} />
          </View>
          <Text style={[styles.stageLabel, { color: COLORS.accent }]}>
            Step 3 of 4
          </Text>
          <Text style={[styles.stageTitle, { color: COLORS.text }]}>Learn</Text>
          <Text style={[styles.stageSubtitle, { color: COLORS.textSecondary }]}>
            Seek to understand the Word
          </Text>
          {passageRef && (
            <View
              style={[
                styles.passageChip,
                { backgroundColor: `${COLORS.primary}15` },
              ]}
            >
              <BookOpen size={12} color={COLORS.primary} />
              <Text style={[styles.passageChipText, { color: COLORS.primary }]}>
                {passageRef}
              </Text>
            </View>
          )}
        </View>

        {/* Tabs — horizontal scroll with programmatic auto-scroll to active tab */}
        <View style={styles.tabRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            ref={tabRowRef}
            style={styles.tabRow}
            scrollEventThrottle={16}
            onScroll={(e) => setTabScrollX(e.nativeEvent.contentOffset.x)}
            onContentSizeChange={(w) => setTabContentWidth(w)}
            onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = learnTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    active
                      ? { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                      : {
                          backgroundColor: COLORS.surface,
                          borderColor: COLORS.border,
                        },
                  ]}
                  onPress={() => setLearnTab(tab.id)}
                  onLayout={(e) => {
                    // Store the tab's x-position within the ScrollView content
                    tabPositions.current[tab.id] = e.nativeEvent.layout.x;
                  }}
                  activeOpacity={0.7}
                >
                  <Icon size={14} color={active ? '#FFFFFF' : COLORS.muted} />
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? '#FFFFFF' : COLORS.text },
                      active && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Overflow chevron indicators */}
          {showLeftChevron && (
            <View style={[styles.tabChevron, styles.tabChevronLeft, { backgroundColor: `${COLORS.background}E0` }]}>
              <ChevronLeft size={14} color={COLORS.accent} />
            </View>
          )}
          {showRightChevron && (
            <View style={[styles.tabChevron, styles.tabChevronRight, { backgroundColor: `${COLORS.background}E0` }]}>
              <ChevronRight size={14} color={COLORS.accent} />
            </View>
          )}
        </View>

        {/* Loading indicator */}
        {learnDataLoading && (
          <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text
              style={[
                styles.learnText,
                {
                  color: COLORS.muted,
                  marginTop: SPACING.sm,
                  fontSize: FONT_SIZES.xs,
                },
              ]}
            >
              Loading study resources...
            </Text>
          </View>
        )}

        {/* Tab content */}
        {!learnDataLoading && (
          <View
            style={[
              styles.learnContent,
              { backgroundColor: COLORS.cardBackground },
            ]}
          >
            {renderTabContent()}
          </View>
        )}

        {/* Notes */}
        <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
          Study Notes
        </Text>
        <TextInput
          style={[
            styles.textarea,
            {
              backgroundColor: COLORS.surface,
              borderColor: COLORS.border,
              color: COLORS.text,
            },
          ]}
          placeholder="Write what you have learned..."
          placeholderTextColor={COLORS.muted}
          value={learnNotes}
          onChangeText={setLearnNotes}
          multiline
          textAlignVertical="top"
        />

        {/* Save Progress button */}
        <TouchableOpacity
          style={[styles.saveProgressBtn, { borderColor: COLORS.muted }]}
          onPress={() => saveCurrentProgress()}
          disabled={savingProgress}
          activeOpacity={0.7}
        >
          {savingProgress ? (
            <ActivityIndicator size="small" color={COLORS.muted} />
          ) : (
            <>
              <Save size={14} color={COLORS.muted} />
              <Text style={[styles.saveProgressText, { color: COLORS.muted }]}>
                Save Progress
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
          onPress={saveLearn}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Continue to Abide</Text>
          )}
        </TouchableOpacity>

        {/* Page indicator (animated via scrollX) */}
        <View style={styles.pageIndicator}>
          {STAGE_ORDER.map((s, idx) => {
            const dotOpacity = scrollX.interpolate({
              inputRange: [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const dotScale = scrollX.interpolate({
              inputRange: [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ],
              outputRange: [1, 1.3, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={s}
                style={[
                  styles.pageDot,
                  {
                    backgroundColor:
                      idx === pageIndex ? COLORS.accent : COLORS.muted,
                    opacity: dotOpacity,
                    transform: [{ scale: dotScale }],
                    width: idx === pageIndex ? 20 : 8,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // ── Render Abide stage ───────────────────────────────────────────────────
  const renderAbide = () => (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View
          style={[styles.stageBadge, { backgroundColor: `${COLORS.accent}20` }]}
        >
          <Heart size={20} color={COLORS.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: COLORS.accent }]}>
          Step 4 of 4
        </Text>
        <Text style={[styles.stageTitle, { color: COLORS.text }]}>Abide</Text>
        <Text style={[styles.stageSubtitle, { color: COLORS.textSecondary }]}>
          Record what the Lord has shown you
        </Text>
        {passageRef && (
          <View
            style={[
              styles.passageChip,
              { backgroundColor: `${COLORS.primary}15` },
            ]}
          >
            <BookOpen size={12} color={COLORS.primary} />
            <Text style={[styles.passageChipText, { color: COLORS.primary }]}>
              {passageRef}
            </Text>
          </View>
        )}
      </View>

      {/* Reflection */}
      <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
        <FileText size={14} color={COLORS.textSecondary} /> My Reflection
      </Text>
      <TextInput
        style={[
          styles.textareaLarge,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
        ]}
        placeholder="What has God shown you through this passage?"
        placeholderTextColor={COLORS.muted}
        value={reflection}
        onChangeText={setReflection}
        multiline
        textAlignVertical="top"
      />

      {/* Prayer */}
      <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
        <Heart size={14} color={COLORS.textSecondary} /> My Prayer
      </Text>
      <TextInput
        style={[
          styles.textareaLarge,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
        ]}
        placeholder="Write your prayer response..."
        placeholderTextColor={COLORS.muted}
        value={prayer}
        onChangeText={setPrayer}
        multiline
        textAlignVertical="top"
      />

      {/* Application */}
      <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
        <BookMarked size={14} color={COLORS.textSecondary} /> Practical Step
      </Text>
      <TextInput
        style={[
          styles.textarea,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
        ]}
        placeholder="What will you do in response to God's Word?"
        placeholderTextColor={COLORS.muted}
        value={appText}
        onChangeText={setAppText}
        multiline
        textAlignVertical="top"
      />

      {/* Tags */}
      <Text style={[styles.textareaLabel, { color: COLORS.textSecondary }]}>
        <Tag size={14} color={COLORS.textSecondary} /> Tags
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
        ]}
        placeholder="#John #Believe #EternalLife"
        placeholderTextColor={COLORS.muted}
        value={tags}
        onChangeText={setTags}
        autoCapitalize="none"
      />

      {/* Privacy toggle */}
      <TouchableOpacity
        style={[styles.privacyRow, { backgroundColor: COLORS.cardBackground }]}
        onPress={() => setIsPublic(!isPublic)}
        activeOpacity={0.7}
      >
        <Lock size={16} color={isPublic ? COLORS.warning : COLORS.success} />
        <Text style={[styles.privacyText, { color: COLORS.text }]}>
          {isPublic
            ? 'Public — anyone can read this'
            : 'Private — only you can see this'}
        </Text>
      </TouchableOpacity>

      {/* Save Progress button */}
      <TouchableOpacity
        style={[styles.saveProgressBtn, { borderColor: COLORS.muted }]}
      onPress={() => saveCurrentProgress()}
      disabled={savingProgress}
      activeOpacity={0.7}
    >
      {savingProgress ? (
        <ActivityIndicator size="small" color={COLORS.muted} />
      ) : (
        <>
          <Save size={14} color={COLORS.muted} />
          <Text style={[styles.saveProgressText, { color: COLORS.muted }]}>
            Save Progress
          </Text>
        </>
      )}
    </TouchableOpacity>

    {/* Save to Legacy Ledger button — hidden if already saved */}
      {journalEntryId ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: `${COLORS.success}20`,
              borderWidth: 1,
              borderColor: COLORS.success,
            },
          ]}
          onPress={() => navigation.navigate(route.legacyLedger)}
          activeOpacity={0.8}
        >
          <CheckCircle2 size={18} color={COLORS.success} />
          <Text
            style={[
              styles.primaryBtnText,
              { color: COLORS.success },
            ]}
          >
            Saved — View in Legacy Ledger
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
          onPress={saveAbide}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                Save to Legacy Ledger
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Page indicator (animated via scrollX) */}
      <View style={styles.pageIndicator}>
        {STAGE_ORDER.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [
              (idx - 1) * SCREEN_WIDTH,
              idx * SCREEN_WIDTH,
              (idx + 1) * SCREEN_WIDTH,
            ],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor:
                    idx === pageIndex ? COLORS.accent : COLORS.muted,
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  width: idx === pageIndex ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
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
  const renderCompleted = () => (
    <View style={[styles.stageContainer, styles.completedContainer]}>
      <View
        style={[
          styles.completedIcon,
          { backgroundColor: `${COLORS.success}20` },
        ]}
      >
        <CheckCircle2 size={64} color={COLORS.success} />
      </View>
      <Text style={[styles.completedTitle, { color: COLORS.text }]}>
        Study Complete!
      </Text>
      <Text style={[styles.completedSubtitle, { color: COLORS.textSecondary }]}>
        Your exegesis has been saved to the Legacy Ledger. You can view it in
        your journal.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
        onPress={() => navigation.navigate(route.journal)}
        activeOpacity={0.8}
      >
        <BookMarked size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Open Legacy Ledger</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: COLORS.primary }]}
        onPress={handleDownloadEntry}
        activeOpacity={0.7}
      >
        <Download size={16} color={COLORS.primary} />
        <Text style={[styles.secondaryBtnText, { color: COLORS.primary }]}>
          Download Entry
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.secondaryBtn,
          { borderColor: COLORS.primary, marginTop: SPACING.md },
        ]}
        onPress={() => {
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
          setCompleted(false);
        }}
        activeOpacity={0.7}
      >
        <Sparkles size={16} color={COLORS.primary} />
        <Text style={[styles.secondaryBtnText, { color: COLORS.primary }]}>
          Start Another Study
        </Text>
      </TouchableOpacity>
    </View>
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
        {booksLoading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <BookSelectorScreen
            books={books}
            isDark={isDark}
            onSelectBook={handleSelectBook}
          />
        )}
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
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
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
          >
            {renderPage(0, renderLook())}
          </ScrollView>
          {/* Listen */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderPage(1, renderListen())}
          </ScrollView>
          {/* Learn */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderPage(2, renderLearn())}
          </ScrollView>
          {/* Abide */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderPage(3, renderAbide())}
          </ScrollView>
        </Animated.ScrollView>
      )}
    </View>
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
    passageVerseText: { fontSize: FONT_SIZES.md, lineHeight: 24, flex: 1 },

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
