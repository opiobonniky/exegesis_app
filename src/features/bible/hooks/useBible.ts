import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  FlatList,
  Clipboard,
} from 'react-native';
import { bibleApi, checkOnlineStatus } from '../../../services/bibleApi';
import {
  getVerseText,
  getVersesForChapter,
  getBibleBooks,
} from '../../../utilits/bibleUtils';
import { AppContext } from '../../../common/AppContext';
import { getColors } from '../../../constants/theme';
import { route } from '../../../component/navigations/routes';
import { sendPostRequest } from '../../../services/api';
import { showToast } from '../../../helpers/Toash.helper';
import { bibleTTS } from '../../../utilits/bibleTTS';
import { computeWordMap, WordSpan } from '../../../utilits/bibleUtils';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface Book {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

export interface VerseSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

type RootStackParamList = {
  [route.bible]: { bookName: string; chapter: number; verseNumber: number };
  [route.journalEntry]: any;
  [route.fullVerseExplanation]: any;
};

export const useBible = () => {
  const app = React.useContext(AppContext);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);

  const activeVersionId = app?.bibleVersionId || 'BSB';

  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [currentBook, setCurrentBook] = useState<string>('Genesis');
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [maxChapters, setMaxChapters] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [verses, setVerses] = useState<Record<number, string>>({});
  const [versesArray, setVersesArray] = useState<
    Array<{ num: number; text: string }>
  >([]);
  const [highlights, setHighlights] = useState<
    Record<number, { colorId: number; color: string }>
  >({});
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [showBookSelector, setShowBookSelector] = useState<boolean>(false);
  const [showChapterSelector, setShowChapterSelector] =
    useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] =
    useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showVersionPicker, setShowVersionPicker] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [showTranslationPicker, setShowTranslationPicker] =
    useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<VerseSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [verseExplanationMap, setVerseExplanationMap] = useState<
    Record<number, string>
  >({});
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [activeAudioVerse, setActiveAudioVerse] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioPlaylist, setAudioPlaylist] = useState<
    Array<{ num: number; text: string }>
  >([]);
  const [audioVerseIndex, setAudioVerseIndex] = useState<number>(0);
  const [audioScope, setAudioScope] = useState<'chapter' | 'selection'>(
    'chapter',
  );
  const [afterPlayBehaviour, setAfterPlayBehaviour] = useState<
    'stop' | 'repeat_one' | 'repeat' | 'continue'
  >('continue');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number>(0);
  const [modal, setModal] = useState<{
    status: boolean;
    title: string;
    message: string;
    severity: string;
  }>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });
  const [verseJournalPrompts, setVerseJournalPrompts] = useState<
    Array<{ id: number; prompt: string }>
  >([]);
  const [chapterJournalPrompts, setChapterJournalPrompts] = useState<
    Array<{ id: number; prompt: string }>
  >([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [versionMeta, setVersionMeta] = useState<{
    name: string;
    abbreviation: string;
  }>({
    name: '',
    abbreviation: activeVersionId,
  });

  const flatListRef = useRef<FlatList>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(0);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Stable refs for async callbacks ───────────────────────────────────────
  const audioPlaylistRef = useRef<Array<{ num: number; text: string }>>([]);
  const audioVerseIndexRef = useRef<number>(0);
  const afterPlayBehaviourRef = useRef<
    'stop' | 'repeat_one' | 'repeat' | 'continue'
  >('continue');
  const currentBookRef = useRef<string>('Genesis');
  const currentChapterRef = useRef<number>(1);

  const isPausedRef = useRef<boolean>(false); // user intentionally paused
  const stopRequestedRef = useRef<boolean>(false); // hard-stop in progress
  const ttsActiveRef = useRef<boolean>(false); // loop is running
  /** Index of the last verse CONFIRMED by the TTS engine (tts-start). Used by
   *  next/prev to advance from what the user is *actually* hearing, not from
   *  the index that auto-advance has already queued during the gap between
   *  verses. */
  const confirmedAudioIndexRef = useRef<number>(-1);

  /** Set when user initiates next/prev navigation. Prevents the auto-advance
   *  logic inside speakVerseAtIndex from racing with user navigation. */
  const _userNavigatingRef = useRef<boolean>(false);

  // Keep refs synced with state
  useEffect(() => {
    audioPlaylistRef.current = audioPlaylist;
  }, [audioPlaylist]);
  useEffect(() => {
    audioVerseIndexRef.current = audioVerseIndex;
  }, [audioVerseIndex]);
  useEffect(() => {
    afterPlayBehaviourRef.current = afterPlayBehaviour;
  }, [afterPlayBehaviour]);
  useEffect(() => {
    currentBookRef.current = currentBook;
  }, [currentBook]);
  useEffect(() => {
    currentChapterRef.current = currentChapter;
  }, [currentChapter]);

  const activeVersion = useMemo(
    () => ({
      id: activeVersionId,
      name: versionMeta.name || getVersionName(activeVersionId),
      abbreviation: versionMeta.abbreviation || activeVersionId,
    }),
    [activeVersionId, versionMeta],
  );

  const bibleVersionId = activeVersionId;

  // Compute word-map for the currently playing verse for TTS word highlighting
  const activeVerseWordMap = useMemo((): WordSpan[] | null => {
    if (!activeAudioVerse || !verses[activeAudioVerse]) return null;
    return computeWordMap(verses[activeAudioVerse]);
  }, [activeAudioVerse, verses]);

  const pendingVersesRef = useRef<number[]>([]);

  // ─── Network ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkOnlineStatus();
      setIsOnline(connected);
    };
    checkConnection();
    const interval = setInterval(() => {
      checkConnection().catch(console.warn);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadBooks();
    loadCurrentChapter();
  }, [activeVersionId]);

  useEffect(() => {
    const loadVersionMeta = async () => {
      try {
        const translations =
          await bibleApi.getAvailableTranslationsWithMapping();
        const match = translations.find(t => t.frontendId === activeVersionId);
        if (match) {
          setVersionMeta({
            name: match.name,
            abbreviation: match.shortName || match.frontendId,
          });
        } else {
          setVersionMeta({
            name: getVersionName(activeVersionId),
            abbreviation: activeVersionId,
          });
        }
      } catch {
        setVersionMeta({
          name: getVersionName(activeVersionId),
          abbreviation: activeVersionId,
        });
      }
    };
    loadVersionMeta();
  }, [activeVersionId]);

  useEffect(() => {
    if (currentBook) loadCurrentChapter();
  }, [currentBook, currentChapter]);

  const loadBooks = useCallback(async () => {
    try {
      let booksData: Book[];
      const backendBooks =
        await bibleApi.getBooksWithMaxChapters(activeVersionId);
      if (backendBooks && backendBooks.length > 0) {
        booksData = backendBooks.map(book => ({
          name: book.bookName,
          chapters: book.maxChapter,
          verses: book.totalVerses,
          testament: book.testament.toLowerCase() === 'new' ? 'New' : 'Old',
        }));
      } else {
        booksData = getBibleBooks();
      }
      setBooks(booksData);
      const bookData = booksData.find(b => b.name === currentBook);
      if (bookData) setMaxChapters(bookData.chapters);
    } catch (error) {
      console.warn('Failed to load books, using local:', error);
      const localBooks = getBibleBooks();
      setBooks(localBooks);
      const bookData = localBooks.find(b => b.name === currentBook);
      if (bookData) setMaxChapters(bookData.chapters);
    }
  }, [activeVersionId, currentBook]);

  const loadCurrentChapter = useCallback(async () => {
    setLoading(true);
    try {
      let chapterVerses: Record<number, string>;
      const result = await bibleApi.getVerses(
        activeVersionId,
        currentBook,
        currentChapter,
      );
      if (result && result.verses && result.verses.length > 0) {
        chapterVerses = {};
        result.verses.forEach(v => {
          chapterVerses[v.verseNumber] = v.text;
        });
      } else {
        chapterVerses = getVersesForChapter(currentBook, currentChapter);
      }
      setVerses(chapterVerses);
      setVersesArray(
        Object.entries(chapterVerses)
          .map(([num, text]) => ({ num: parseInt(num), text }))
          .sort((a, b) => a.num - b.num),
      );
      const bookData = books.find(b => b.name === currentBook);
      if (bookData) setMaxChapters(bookData.chapters);
    } catch (error) {
      console.warn('Failed to load chapter, using local:', error);
      const localVerses = getVersesForChapter(currentBook, currentChapter);
      setVerses(localVerses);
      setVersesArray(
        Object.entries(localVerses)
          .map(([num, text]) => ({ num: parseInt(num), text }))
          .sort((a, b) => a.num - b.num),
      );
    } finally {
      setLoading(false);
    }
  }, [activeVersionId, currentBook, currentChapter, books]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCurrentChapter();
    setRefreshing(false);
  }, [loadCurrentChapter]);

  // ─── TTS engine → UI sync ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = bibleTTS.subscribe(ttsState => {
      if (ttsState.isPlaying) {
        setShowAudioPlayer(true);
        setIsAudioPaused(false);
      } else if (ttsState.isPaused) {
        // Engine confirmed paused — keep the bar visible in paused state.
        setShowAudioPlayer(true);
        setIsAudioPaused(true);
      } else if (ttsState.tier === 'idle') {
        // Only close the audio bar if:
        //  1. The user did NOT intentionally pause (isPausedRef.current is false)
        //  2. No playback loop is running
        // This prevents the bar from closing when tts-cancel fires as part of
        // the pause flow before the engine has acknowledged isPaused state.
        if (!isPausedRef.current && !ttsActiveRef.current) {
          setShowAudioPlayer(false);
          setIsAudioPaused(false);
        }
      }
    });
    return unsub;
  }, []);

  // ─── Core verse playback loop ───────────────────────────────────────────────
  const speakVerseAtIndex = useCallback(async (index: number) => {
    const playlist = audioPlaylistRef.current;
    if (!playlist.length || index < 0 || index >= playlist.length) {
      ttsActiveRef.current = false;
      setShowAudioPlayer(false);
      setActiveAudioVerse(null);
      return;
    }

    // Guard: if user is navigating (next/prev), do NOT auto-advance
    if (_userNavigatingRef.current) {
      _userNavigatingRef.current = false;
      return;
    }

    const verse = playlist[index];

    // Update the highlight and audio-bar index IMMEDIATELY so the UI
    // stays in sync with what we're about to speak — no need to wait for
    // tts-start. This also fixes next/prev which previously left the
    // highlight on the wrong verse because tts-start had already fired
    // before the navigation call.
    audioVerseIndexRef.current = index;
    setAudioVerseIndex(index);
    setActiveAudioVerse(verse.num);

    // Scroll the verse into view immediately
    flatListRef.current?.scrollToIndex({
      index: Math.max(0, index),
      animated: true,
      viewPosition: 0.3,
    });

    try {
      await bibleTTS.speakVerses(
        [verse],
        currentBookRef.current,
        currentChapterRef.current,
        { announceLocation: index === 0 },
      );
    } catch (err) {
      console.warn('[useBible] speakVerses error:', err);
    }

    // ── Post-utterance decision ───────────────────────────────────────────
    //
    // isPausedRef = true  →  user paused; do NOT advance, wait for resume()
    // stopRequestedRef = true  →  hard stop; clean up and exit
    // _userNavigatingRef = true  →  user pressed next/prev; do NOT auto-advance
    //
    if (isPausedRef.current) return;
    if (stopRequestedRef.current) {
      return;
    }
    if (_userNavigatingRef.current) return;

    const behaviour = afterPlayBehaviourRef.current;
    const next = index + 1;

    if (behaviour === 'repeat_one') {
      speakVerseAtIndex(index);
    } else if (behaviour === 'repeat' && next >= playlist.length) {
      speakVerseAtIndex(0);
    } else if (next < playlist.length) {
      speakVerseAtIndex(next);
    } else {
      // Playlist exhausted - close audio bar and reset state
      ttsActiveRef.current = false;
      setShowAudioPlayer(false);
      setActiveAudioVerse(null);
      setAudioPlaylist([]);
      setAudioVerseIndex(0);
      audioPlaylistRef.current = [];
      audioVerseIndexRef.current = 0;
    }
  }, []);

  // ─── Internal launcher ──────────────────────────────────────────────────────
  const _startPlayback = useCallback(
    async (playlist: Array<{ num: number; text: string }>, startIndex = 0) => {
      if (!playlist.length) return;

      isPausedRef.current = false;
      stopRequestedRef.current = true;
      ttsActiveRef.current = true;
      await bibleTTS.stop();
      stopRequestedRef.current = false;

      audioPlaylistRef.current = playlist;
      setAudioPlaylist(playlist);

      audioVerseIndexRef.current = startIndex;
      setAudioVerseIndex(startIndex);

      const startVerse = playlist[startIndex];
      setActiveAudioVerse(startVerse?.num ?? null);

      confirmedAudioIndexRef.current = startIndex;
      setShowAudioPlayer(true);
      setIsAudioPaused(false);

      speakVerseAtIndex(startIndex);
    },
    [speakVerseAtIndex],
  );

  // ─── Public audio API ───────────────────────────────────────────────────────

  const startReadingChapter = useCallback(() => {
    const playlist = versesArray.map(v => ({ num: v.num, text: v.text }));
    setAudioScope('chapter');
    _startPlayback(playlist, 0);
  }, [versesArray, _startPlayback]);

  const startReadingSelectedVerses = useCallback(
    (selectedVerseNumbers: number[]) => {
      if (!selectedVerseNumbers.length) return;
      const playlist = selectedVerseNumbers
        .map(v => ({
          num: v,
          text: verses[v] || getVerseText(currentBook, currentChapter, v) || '',
        }))
        .filter(v => v.text);
      setAudioScope('selection');
      _startPlayback(playlist, 0);
    },
    [currentBook, currentChapter, verses, _startPlayback],
  );

  const handleAudioStop = useCallback(async () => {
    isPausedRef.current = false;
    stopRequestedRef.current = true;
    ttsActiveRef.current = false;
    await bibleTTS.stop();
    stopRequestedRef.current = false;
    setShowAudioPlayer(false);
    setActiveAudioVerse(null);
    setAudioPlaylist([]);
    audioPlaylistRef.current = [];
    setAudioVerseIndex(0);
    audioVerseIndexRef.current = 0;
    confirmedAudioIndexRef.current = -1;
    setIsAudioPaused(false);
  }, []);

  // ── PAUSE / RESUME ──────────────────────────────────────────────────────────
  const handleAudioTogglePlayPause = useCallback(async () => {
    if (isPausedRef.current) {
      // ── RESUME ────────────────────────────────────────────────────────────
      isPausedRef.current = false;
      setIsAudioPaused(false);
      setShowAudioPlayer(true); // keep bar open during the async gap
      ttsActiveRef.current = true;

      const currentIndex = audioVerseIndexRef.current;

      if (bibleTTS.hasPausedText) {
        // bibleTTS.resume() speaks the remainder of the paused verse and
        // resolves when that utterance finishes (tts-finish / tts-cancel).
        // After it resolves we chain directly to the next verse so the full
        // playlist continues — exactly what speakVerseAtIndex does after each
        // verse, but starting from the mid-verse resume instead of the top.
        try {
          await bibleTTS.resume();
        } catch (err) {
          console.warn('[useBible] resume error:', err);
        }

        // Guard: if the user paused/stopped again while we were awaiting, bail.
        if (isPausedRef.current || stopRequestedRef.current) return;
        if (!ttsActiveRef.current) return;

        const behaviour = afterPlayBehaviourRef.current;
        const next = currentIndex + 1;
        const playlist = audioPlaylistRef.current;

        if (behaviour === 'repeat_one') {
          speakVerseAtIndex(currentIndex);
        } else if (behaviour === 'repeat' && next >= playlist.length) {
          speakVerseAtIndex(0);
        } else if (next < playlist.length) {
          speakVerseAtIndex(next);
        } else {
          // Playlist exhausted after the resumed verse
          ttsActiveRef.current = false;
          setShowAudioPlayer(false);
          setActiveAudioVerse(null);
          setAudioPlaylist([]);
          setAudioVerseIndex(0);
          audioPlaylistRef.current = [];
          audioVerseIndexRef.current = 0;
        }
      } else {
        // No saved paused text (e.g. pause was triggered at a verse boundary
        // or the paused text was cleared). Fall back to restarting the current
        // verse from the top so the user always hears something immediately.
        speakVerseAtIndex(currentIndex);
      }
    } else {
      // ── PAUSE ─────────────────────────────────────────────────────────────
      // Set flag BEFORE the engine call so the tts-cancel → promise-resolve
      // arrives after isPausedRef is already true and speakVerseAtIndex
      // returns without advancing.
      isPausedRef.current = true;
      setIsAudioPaused(true);
      ttsActiveRef.current = false;
      await bibleTTS.pause();
    }
  }, [speakVerseAtIndex]);

  // ── Skip next / previous ────────────────────────────────────────────────────
  const goToNextSelectedVerse = useCallback(async () => {
    _userNavigatingRef.current = true;

    const savedAfterPlay = afterPlayBehaviourRef.current;
    afterPlayBehaviourRef.current = 'stop';

    // Use the live audioVerseIndexRef — it's updated synchronously in speakVerseAtIndex
    const currentIdx = audioVerseIndexRef.current;
    const playlist = audioPlaylistRef.current;
    const next = currentIdx + 1;
    if (next >= playlist.length) {
      afterPlayBehaviourRef.current = savedAfterPlay;
      _userNavigatingRef.current = false;
      return;
    }
    isPausedRef.current = false;
    stopRequestedRef.current = true;
    ttsActiveRef.current = true;
    await bibleTTS.stop();
    stopRequestedRef.current = false;
    setIsAudioPaused(false);
    speakVerseAtIndex(next).finally(() => {
      afterPlayBehaviourRef.current = savedAfterPlay;
      _userNavigatingRef.current = false;
    });
  }, [speakVerseAtIndex]);

  const goToPreviousSelectedVerse = useCallback(async () => {
    _userNavigatingRef.current = true;

    const savedAfterPlay = afterPlayBehaviourRef.current;
    afterPlayBehaviourRef.current = 'stop';

    const currentIdx = audioVerseIndexRef.current;
    const prev = currentIdx - 1;
    if (prev < 0) {
      afterPlayBehaviourRef.current = savedAfterPlay;
      _userNavigatingRef.current = false;
      return;
    }
    isPausedRef.current = false;
    stopRequestedRef.current = true;
    ttsActiveRef.current = true;
    await bibleTTS.stop();
    stopRequestedRef.current = false;
    setIsAudioPaused(false);
    speakVerseAtIndex(prev).finally(() => {
      afterPlayBehaviourRef.current = savedAfterPlay;
      _userNavigatingRef.current = false;
    });
  }, [speakVerseAtIndex]);

  // ── Speed ────────────────────────────────────────────────────────────────────
  const onSpeedToggle = useCallback(() => {
    setSpeechRate(prev => {
      const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const next = rates[(rates.indexOf(prev) + 1) % rates.length];
      bibleTTS.setRate(next).catch(console.warn);
      return next;
    });
  }, []);

  // ── Sleep timer ──────────────────────────────────────────────────────────────
  const onSleepTimerToggle = useCallback(() => {
    if (sleepTimerRemaining > 0) {
      setSleepTimerRemaining(0);
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    } else {
      setSleepTimerRemaining(15);
      sleepTimerRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev <= 1) {
            handleAudioStop();
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    }
  }, [sleepTimerRemaining, handleAudioStop]);

  // ── Scope / after-play ───────────────────────────────────────────────────────
  const handleAudioScopeChange = useCallback(
    (scope: 'chapter' | 'selection') => {
      setAudioScope(scope);
      if (scope === 'chapter') startReadingChapter();
    },
    [startReadingChapter],
  );

  const handleAfterPlayChange = useCallback(
    (behaviour: 'stop' | 'repeat_one' | 'repeat' | 'continue') => {
      afterPlayBehaviourRef.current = behaviour;
      setAfterPlayBehaviour(behaviour);
    },
    [],
  );

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goToChapter = useCallback(
    (direction: 'prev' | 'next' | 'first' | 'last') => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (direction === 'first') setCurrentChapter(1);
      else if (direction === 'last') setCurrentChapter(maxChapters);
      else if (direction === 'prev') {
        if (currentChapter > 1) setCurrentChapter(currentChapter - 1);
      } else if (direction === 'next') {
        if (currentChapter < maxChapters) setCurrentChapter(currentChapter + 1);
      }
    },
    [currentChapter, maxChapters],
  );

  const selectBookFromModal = useCallback((bookName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentBook(bookName);
    setCurrentChapter(1);
    setShowBookSelector(false);
  }, []);

  const selectChapterFromModal = useCallback((chapter: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentChapter(chapter);
    setShowChapterSelector(false);
  }, []);

  // ─── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const backendResults = await bibleApi.search(
          activeVersionId,
          query,
          50,
        );
        setSearchResults(
          backendResults.map(r => ({
            book: r.bookName,
            chapter: r.chapter,
            verse: r.verse,
            text: r.text,
          })),
        );
      } catch {
        try {
          const { searchVerses } = require('../../../utilits/bibleUtils');
          setSearchResults(searchVerses(query, 50));
        } catch {
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    },
    [activeVersionId],
  );

  const goToVerse = useCallback((result: VerseSearchResult) => {
    setCurrentBook(result.book);
    setCurrentChapter(result.chapter);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: Math.max(0, result.verse - 1),
        animated: true,
      });
    }, 300);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // ─── Selection ──────────────────────────────────────────────────────────────
  const toggleVerseSelection = useCallback((verseNumber: number) => {
    setSelectedVerses(prev =>
      prev.includes(verseNumber)
        ? prev.filter(v => v !== verseNumber)
        : [...prev, verseNumber].sort((a, b) => a - b),
    );
  }, []);

  const setVerseRangeSelection = useCallback((start: number, end: number) => {
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    setSelectedVerses(range);
  }, []);

  const clearSelection = useCallback(() => setSelectedVerses([]), []);
  const setPendingVerses = useCallback((v: number[]) => {
    pendingVersesRef.current = v;
  }, []);

  // ─── History / Favorites ────────────────────────────────────────────────────
  const addReadHistory = useCallback(
    async (verseNumber: number) => {
      try {
        const key = 'read_history';
        const existing = await AsyncStorage.getItem(key);
        const history = existing ? JSON.parse(existing) : [];
        const entry = {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber,
          timestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          key,
          JSON.stringify([entry, ...history].slice(0, 100)),
        );
      } catch {
        console.warn('Failed to save read history');
      }
    },
    [currentBook, currentChapter],
  );

  const addFavorite = useCallback(
    async (versesToFav: number[]) => {
      try {
        const startV = Math.min(...versesToFav);
        const endV = Math.max(...versesToFav);
        const response = await sendPostRequest<any>('bible', 'add-favorite', {
          bookName: currentBook,
          chapter: currentChapter,
          verseStart: startV,
          verseEnd: versesToFav.length > 1 ? endV : startV,
        });
        if (response.returnCode === 200) {
          setFavorites(prev => new Set([...prev, ...versesToFav]));
          showToast('success', 'Added to favorites');
        }
      } catch {
        showToast('error', 'Failed to add favorite');
      }
    },
    [currentBook, currentChapter],
  );

  // ─── Highlights ─────────────────────────────────────────────────────────────
  const highlightVerses = useCallback(
    async (
      colorId: number,
      color: string,
      rangeStart?: number,
      rangeEnd?: number,
    ) => {
      const versesToHighlight =
        pendingVersesRef.current.length > 0
          ? pendingVersesRef.current
          : rangeStart !== undefined && rangeEnd !== undefined
            ? Array.from(
                { length: rangeEnd - rangeStart + 1 },
                (_, i) => rangeStart + i,
              )
            : selectedVerses;
      try {
        for (const v of versesToHighlight) {
          await sendPostRequest('bible', 'highlight', {
            bookName: currentBook,
            chapter: currentChapter,
            verseNumber: v,
            colorId,
            color,
          });
        }
        const newHighlights = { ...highlights };
        versesToHighlight.forEach(v => {
          newHighlights[v] = { colorId, color };
        });
        setHighlights(newHighlights);
        showToast('success', 'Highlighted');
      } catch {
        showToast('error', 'Failed to highlight');
      }
    },
    [currentBook, currentChapter, highlights, selectedVerses],
  );

  const removeHighlight = useCallback(
    async (verseNumber: number) => {
      try {
        await sendPostRequest('bible', 'remove-highlight', {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber,
        });
        const newHighlights = { ...highlights };
        delete newHighlights[verseNumber];
        setHighlights(newHighlights);
      } catch {
        console.warn('Failed to remove highlight');
      }
    },
    [currentBook, currentChapter, highlights],
  );

  // ─── Share / Copy ───────────────────────────────────────────────────────────
  const shareVerses = useCallback(
    (versesArg: number[]) => {
      const text = versesArg
        .map(
          v =>
            `${v}. ${verses[v] || getVerseText(currentBook, currentChapter, v)}`,
        )
        .join('\n');
      Clipboard.setString(
        `${currentBook} ${currentChapter}:${versesArg.join(',')}\n\n${text}`,
      );
      showToast('success', 'Copied to clipboard');
    },
    [currentBook, currentChapter, verses],
  );

  const copyVerses = useCallback(
    (versesArg: number[]) => {
      const text = versesArg
        .map(
          v =>
            `${v}. ${verses[v] || getVerseText(currentBook, currentChapter, v)}`,
        )
        .join('\n');
      Clipboard.setString(text);
      showToast('success', 'Copied to clipboard');
    },
    [currentBook, currentChapter, verses],
  );

  // ─── Version ────────────────────────────────────────────────────────────────
  const handleVersionChange = useCallback(async (versionId: string) => {
    if (app?.setBibleVersion) app.setBibleVersion(versionId);
    setCurrentChapter(1);
    setShowDrawer(false);
    setShowVersionPicker(false);
    setShowTranslationPicker(false);
    try {
      await AsyncStorage.setItem('bible_version', versionId);
    } catch {}
  }, []);

  // ─── Explanation / Notes ────────────────────────────────────────────────────
  const getverseExplanation = useCallback(
    async (verseNumbers: number[], bookName: string, chapter: number) => {
      try {
        const response = await sendPostRequest<any>('bible', 'explain', {
          bookName,
          chapter,
          verseNumbers,
        });
        if (response.returnCode === 200 && response.returnData) {
          const explanations: Record<number, string> = {};
          response.returnData.forEach((item: any) => {
            explanations[item.verseNumber] = item.explanation;
          });
          setVerseExplanationMap(explanations);
          setShowExplanation(true);
        }
      } catch {
        console.warn('Failed to get explanation');
      }
    },
    [],
  );

  const clearVerseExplanationForVerse = useCallback((verseNumber: number) => {
    setVerseExplanationMap(prev => {
      const m = { ...prev };
      delete m[verseNumber];
      return m;
    });
  }, []);

  const openNoteModal = useCallback(() => setShowNoteModal(true), []);
  const closeNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setNoteText('');
  }, []);

  const saveNote = useCallback(
    async (rangeStart?: number, rangeEnd?: number) => {
      setNoteSaving(true);
      try {
        const versesToSave =
          pendingVersesRef.current.length > 0
            ? pendingVersesRef.current
            : rangeStart !== undefined && rangeEnd !== undefined
              ? Array.from(
                  { length: rangeEnd - rangeStart + 1 },
                  (_, i) => rangeStart + i,
                )
              : selectedVerses;
        const startV = Math.min(...versesToSave);
        const endV = Math.max(...versesToSave);
        await sendPostRequest('bible', 'note', {
          bookName: currentBook,
          chapter: currentChapter,
          verseStart: startV,
          verseEnd: versesToSave.length > 1 ? endV : startV,
          note: noteText,
        });
        showToast('success', 'Note saved');
        closeNoteModal();
      } catch {
        showToast('error', 'Failed to save note');
      } finally {
        setNoteSaving(false);
      }
    },
    [currentBook, currentChapter, noteText, selectedVerses, closeNoteModal],
  );

  const loadChapterPrompts = useCallback(async () => {
    try {
      const response = await sendPostRequest<any>('bible', 'journal-prompts', {
        bookName: currentBook,
        chapter: currentChapter,
      });
      if (response.returnCode === 200 && response.returnData)
        setChapterJournalPrompts(response.returnData);
    } catch {
      setChapterJournalPrompts([]);
    }
  }, [currentBook, currentChapter]);

  const dismissModal = useCallback(() => {
    setModal({ status: false, title: '', message: '', severity: 'info' });
  }, []);

  return {
    isDark,
    navigation,
    books,
    maxChapters,
    verses,
    versesArray,
    highlights,
    favorites,
    selectedVerses,
    setPendingVerses,
    activeVersion,
    bibleVersionId,
    currentBook,
    currentChapter,
    fontSize,
    setFontSize,
    loading,
    searchLoading,
    showBookSelector,
    setShowBookSelector,
    showChapterSelector,
    setShowChapterSelector,
    showSearchModal,
    setShowSearchModal,
    showHighlightPicker,
    setShowHighlightPicker,
    showDrawer,
    setShowDrawer,
    showVersionPicker,
    setShowVersionPicker,
    showExplanation,
    setShowExplanation,
    showNoteModal,
    showAudioPlayer,
    showTranslationPicker,
    setShowTranslationPicker,
    searchQuery,
    searchResults,
    handleSearch,
    goToVerse,
    closeSearch,
    verseExplanationMap,
    noteText,
    setNoteText,
    noteSaving,
    openNoteModal,
    closeNoteModal,
    saveNote,
    highlightedVerse,
    highlightAnim,
    fadeAnim,
    flatListRef,
    toggleVerseSelection,
    setVerseRangeSelection,
    clearSelection,
    addReadHistory,
    addFavorite,
    startReadingSelectedVerses,
    highlightVerses,
    removeHighlight,
    shareVerses,
    copyVerses,
    goToChapter,
    handleVersionChange,
    getverseExplanation,
    clearVerseExplanationForVerse,
    activeVerseWordMap,
    modal,
    dismissModal,
    selectChapterFromModal,
    selectBookFromModal,
    startReadingChapter,
    handleAudioStop,
    refreshing,
    onRefresh,
    activeAudioVerse,
    audioPlaylist,
    audioScope,
    afterPlayBehaviour,
    audioVerseIndex,
    isAudioPaused,
    speechRate,
    sleepTimerRemaining,
    onSpeedToggle,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    handleAudioTogglePlayPause,
    verseJournalPrompts,
    chapterJournalPrompts,
    loadChapterPrompts,
    isOnline,
  };
};

function getVersionName(id: string): string {
  const names: Record<string, string> = {
    KJV: 'King James Version',
    ASV: 'American Standard Version',
    BBE: 'Bible in Basic English',
    DARBY: 'Darby Translation',
    WEB: 'World English Bible',
    WEBSTER: 'Webster Bible',
    YLT: "Young's Literal Translation",
    BSB: 'Berean Standard Bible',
  };
  return names[id] || id;
}

export default useBible;
