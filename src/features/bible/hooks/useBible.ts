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
  Share,
} from 'react-native';
import { bibleApi } from '../../../services/bibleApi';
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
import { useConnectivity } from '../../../providers/ConnectivityProvider';
import { useVoiceReading } from '../../../hooks/useVoiceReading';
import {
  getStrongsEntry,
  StrongsWordData,
  StrongsEntry,
} from '../../../services/strongsService';
import {
  getBookPrologue,
  BookPrologue,
} from '../../../services/bookProloguesApi';
import {
  getAiExplanation,
  AiExplanation,
} from '../../../services/aiApi';

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

type ChapterVerseHighlights = Record<
  string,
  { colorId: number; color: string }
>;

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

  const activeVersionId = app?.bibleVersionId || 'Berean';

  const [currentBook, setCurrentBook] = useState<string>('Genesis');
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [maxChapters, setMaxChapters] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [verses, setVerses] = useState<Record<number, string>>({});
  const [versesArray, setVersesArray] = useState<
    Array<{ num: number; text: string }>
  >([]);
  const [chapterHeadings, setChapterHeadings] = useState<
    Array<{ verse: number; heading: string }>
  >([]);
  const [bookHeadings, setBookHeadings] = useState<
    Record<number, Array<{ verse: number; heading: string }>>
  >({});
  const [highlights, setHighlights] = useState<ChapterVerseHighlights>({});
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
  const [showTranslationPicker, setShowTranslationPicker] =
    useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<VerseSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [verseExplanationMap, setVerseExplanationMap] = useState<
    Record<
      number,
      {
        explanation: string;
        learnMore: string;
        ai?: AiExplanation | null;
      }
    >
  >({});
  const [explainingVerse, setExplainingVerse] = useState<number | null>(null);
  // ── Inline verse panels (Strong's / Background / Journal) ─────────────────
  const [verseStrongsMap, setVerseStrongsMap] = useState<
    Record<
      number,
      {
        word: StrongsWordData;
        entry: StrongsEntry | null;
        ai: AiExplanation | null;
        loading: boolean;
      }
    >
  >({});
  const [verseBackgroundMap, setVerseBackgroundMap] = useState<
    Record<
      number,
      {
        ai: AiExplanation | null;
        prologue: BookPrologue | null;
        loading: boolean;
      }
    >
  >({});
  const [journalOpenVerse, setJournalOpenVerse] = useState<number | null>(null);
  const [dailyVerseRefMap, setDailyVerseRefMap] = useState<
    Record<
      number,
      { reflection?: string; explanation?: string; learnMore?: string }
    >
  >({});
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
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
  const currentBookRef = useRef<string>('Genesis');
  const currentChapterRef = useRef<number>(1);

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

  const pendingVersesRef = useRef<number[]>([]);

  // ── Voice Reading (extracted TTS logic) ─────────────────────────────────────
  const {
    showAudioPlayer,
    activeAudioVerse,
    isAudioPaused,
    audioPlaylist,
    audioVerseIndex,
    audioScope,
    afterPlayBehaviour,
    speechRate,
    sleepTimerRemaining,
    activeVerseWordMap,
    currentVoiceId,
    voiceList,
    edgeEnabled,
    startReadingChapter,
    startReadingSelectedVerses,
    handleAudioStop,
    handleAudioTogglePlayPause,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    onSpeedToggle,
    onSpeedReset,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    onVoiceSelect,
  } = useVoiceReading({
    verses,
    versesArray,
    currentBook,
    currentChapter,
    currentBookRef,
    currentChapterRef,
    flatListRef,
  });

  // ─── Network ────────────────────────────────────────────────────────────────
  const { isOnline } = useConnectivity();

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

  // Section headings for the whole book (chapter-selector previews)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const headings = await bibleApi.getBookHeadings(
          activeVersionId,
          currentBook,
        );
        if (!ignore) setBookHeadings(headings || {});
      } catch {
        if (!ignore) setBookHeadings({});
      }
    })();
    return () => {
      ignore = true;
    };
  }, [activeVersionId, currentBook]);

  // ─── Get verse text async (from backend with local fallback) ─────────────────────
  const getVerseTextAsync = useCallback(
    async (
      bookName: string,
      chapter: number,
      verseNumber: number,
    ): Promise<string | null> => {
      try {
        const result = await bibleApi.getVerse(
          activeVersionId,
          bookName,
          chapter,
          verseNumber,
        );
        if (result && result.text) {
          return result.text;
        }
        return null;
      } catch (error) {
        console.warn('[useBible] getVerseTextAsync error:', error);
        return null;
      }
    },
    [activeVersionId],
  );

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
    // Section headings are independent of the active translation
    try {
      const headings = await bibleApi.getChapterHeadings(
        activeVersionId,
        currentBook,
        currentChapter,
      );
      setChapterHeadings(headings || []);
    } catch (e) {
      setChapterHeadings([]);
    }
  }, [activeVersionId, currentBook, currentChapter, books]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCurrentChapter();
    setRefreshing(false);
  }, [loadCurrentChapter]);

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
  // Multi-select mode: entered via long-press on a verse. While active, tapping
  // verses toggles them in/out of the selection instead of replacing it.
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const enterMultiSelect = useCallback((verseNumber: number) => {
    setMultiSelectMode(true);
    setSelectedVerses([verseNumber]);
  }, []);

  const exitMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedVerses([]);
  }, []);

  const toggleVerseSelection = useCallback(
    (verseNumber: number) => {
      setSelectedVerses(prev => {
        if (prev.includes(verseNumber)) {
          // Deselect the verse
          return prev.filter(v => v !== verseNumber);
        }
        if (multiSelectMode) {
          // Add to the growing multi-selection
          return [...prev, verseNumber];
        }
        // Selecting a new verse should replace any existing selection
        return [verseNumber];
      });
    },
    [multiSelectMode],
  );

  const setVerseRangeSelection = useCallback((start: number, end: number) => {
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    setSelectedVerses(range);
  }, []);

  const clearSelection = useCallback(() => setSelectedVerses([]), []);

  const clearMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedVerses([]);
  }, []);
  const setPendingVerses = useCallback((v: number[]) => {
    pendingVersesRef.current = v;
  }, []);

  // ─── History / Favorites ────────────────────────────────────────────────────
  const addReadHistory = useCallback(
    async (verseNumber: number) => {
      try {
        await sendPostRequest('bible', 'add-read-history', {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber,
        });
      } catch {
        // Offline fallback: save locally
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
      }
    },
    [currentBook, currentChapter],
  );

  const addFavorite = useCallback(
    async (versesToFav: number[]) => {
      try {
        // Normalize input to an array (accepts Array, Set, or single number)
        let versesArr: number[] = [];
        if (Array.isArray(versesToFav)) versesArr = versesToFav.slice();
        else if (versesToFav instanceof Set)
          versesArr = Array.from(versesToFav);
        else if (typeof versesToFav === 'number') versesArr = [versesToFav];

        if (!versesArr || versesArr.length === 0) return;

        const body: any = {
          bookName: currentBook,
          chapter: currentChapter,
        };
        // Always send an array for consistency with backend expectations
        body.verseNumbers = versesArr;

        const response = await sendPostRequest<any>(
          'bible',
          'add-favorite',
          body,
          undefined,
          true,
        );

        if (response.returnCode === 200) {
          setFavorites(prev => new Set([...Array.from(prev), ...versesArr]));
          showToast('success', 'Added to favorites');
        } else if (response.returnCode === 202) {
          setFavorites(prev => new Set([...Array.from(prev), ...versesArr]));
          showToast('success', 'Saved offline — will sync');
        }
      } catch (error: any) {
        showToast('error', error?.message || 'Failed to add favorite');
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
        if (!versesToHighlight || versesToHighlight.length === 0) return;

        // Normalize to array (avoid Set or other structures)
        const versesArr = Array.isArray(versesToHighlight)
          ? versesToHighlight.slice()
          : Array.from(versesToHighlight);

        // Backend accepts verseNumbers array (or single verseNumber)
        const body: any = {
          bookName: currentBook,
          chapter: currentChapter,
          colorId,
        };
        // Always send array key
        body.verseNumbers = versesArr;

        const hlRes = await sendPostRequest(
          'bible',
          'add-highlight',
          body,
          undefined,
          true,
        );
        pendingVersesRef.current = [];
        setSelectedVerses([]);

        setHighlights(prev => {
          const next = { ...prev };
          versesArr.forEach(v => {
            const key = `${currentBook}-${currentChapter}-${v}`;
            next[key] = { colorId, color };
          });
          return next;
        });
      } catch (err: any) {
        console.warn('Failed to highlight', err);
        showToast('error', 'Failed to highlight');
      }
    },
    [currentBook, currentChapter, selectedVerses],
  );

  const removeHighlight = useCallback(
    async (verseNumber: number) => {
      try {
        // Backend delete requires highlightId. Fetch highlights for the verse,
        // then delete each returned highlight by id.
        const res = await sendPostRequest<any>('bible', 'get-highlights', {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber,
        });
        if (
          res.returnCode === 200 &&
          res.returnData &&
          res.returnData.highlights
        ) {
          const hs: any[] = res.returnData.highlights;
          for (const h of hs) {
            try {
              await sendPostRequest('bible', 'delete-highlight', {
                highlightId: h.id,
              });
            } catch (e) {
              console.warn('Failed to delete highlight id', h.id, e);
            }
          }
        }
        const highlightKey = `${currentBook}-${currentChapter}-${verseNumber}`;
        setHighlights(prev => {
          const next = { ...prev };
          delete next[highlightKey];
          return next;
        });
      } catch (err: any) {
        console.warn('Failed to remove highlight', err);
      }
    },
    [currentBook, currentChapter],
  );

  // ─── Share / Copy ───────────────────────────────────────────────────────────
  const shareVerses = useCallback(
    async (versesArg: number[]) => {
      const text = versesArg
        .map(
          v =>
            `${v}. ${verses[v] || getVerseText(currentBook, currentChapter, v)}`,
        )
        .join('\n');
      const message = `${currentBook} ${currentChapter}:${versesArg.join(',')}\n\n${text}\n\n— Shared from Exegesis`;
      try {
        await Share.share({ message });
      } catch (err: any) {
        if (err?.message !== 'User did not share') {
          console.warn('Share failed', err);
        }
      }
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
      Clipboard.setString(
        `${currentBook} ${currentChapter}:${versesArg.join(',')}\n\n${text}`,
      );
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
    async (
      verseNumbers: number[],
      bookName: string,
      chapter: number,
    ): Promise<boolean> => {
      try {
        if (!verseNumbers || verseNumbers.length === 0) return false;

        if (verseNumbers.length === 1) {
          setExplainingVerse(verseNumbers[0]);
        }

        // Backend provides get-verse-explanation for a single verse.
        // Call it for each requested verse and combine results.
        const results = await Promise.allSettled(
          verseNumbers.map(vn =>
            sendPostRequest<any>('bible', 'get-verse-explanation', {
              bookName,
              chapter,
              verseNumber: vn,
            }),
          ),
        );

        const explanations: Record<
          number,
          {
            explanation: string;
            learnMore: string;
            ai?: AiExplanation | null;
          }
        > = {};
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            const res = result.value;
            if (res.returnCode === 200 && res.returnData) {
              const item = res.returnData;
              explanations[item.verseNumber] = {
                explanation: item.explanation || '',
                learnMore: item.learnMore || '',
              };
            }
          }
        });

        // Attach the rich AI analysis (Verse Introduction, Application, Word
        // Study, Cross References, …) so the explanation panel renders the
        // full structured content instead of plain text.
        if (Object.keys(explanations).length > 0) {
          const aiResults = await Promise.allSettled(
            Object.keys(explanations).map(vn =>
              getAiExplanation(bookName, chapter, Number(vn), 'detailed'),
            ),
          );
          aiResults.forEach((r, idx) => {
            const vn = Number(Object.keys(explanations)[idx]);
            if (r.status === 'fulfilled' && r.value) {
              explanations[vn].ai = r.value;
            }
          });
          setVerseExplanationMap(prev => ({ ...prev, ...explanations }));
          setShowExplanation(true);
          return true;
        }
        showToast('info', 'No explanation available for this verse.');
        return false;
      } catch (err) {
        console.warn('Failed to get explanation', err);
        showToast('error', 'Failed to load explanation.');
        return false;
      } finally {
        setExplainingVerse(null);
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

  /** Fetches the rich AI explanation for a verse (detailed depth) once. */
  const fetchVerseAi = useCallback(
    async (verseNumber: number): Promise<AiExplanation | null> => {
      try {
        return await getAiExplanation(
          currentBook,
          currentChapter,
          verseNumber,
          'detailed',
        );
      } catch (err) {
        console.warn('Failed to load verse AI analysis:', err);
        return null;
      }
    },
    [currentBook, currentChapter],
  );

  // ─── Inline Strong's Concordance (per verse) ──────────────────────────────
  /** Loads the rich word study (word studies, applications, themes, cross
      references) plus the tapped word's Strong's entry inline (no bottom sheet). */
  const getVerseStrongs = useCallback(
    async (verseNumber: number, word: StrongsWordData) => {
      setVerseStrongsMap(prev => ({
        ...prev,
        [verseNumber]: { word, entry: null, ai: null, loading: true },
      }));
      try {
        const [entry, ai] = await Promise.all([
          (async () => {
            if (word.strongsId && word.hasData) {
              const res = await getStrongsEntry(word.strongsId);
              return res?.returnData ?? null;
            }
            return null;
          })(),
          fetchVerseAi(verseNumber),
        ]);
        setVerseStrongsMap(prev => ({
          ...prev,
          [verseNumber]: { word, entry, ai, loading: false },
        }));
      } catch (err) {
        console.warn('Failed to load Strongs entry:', err);
        setVerseStrongsMap(prev => ({
          ...prev,
          [verseNumber]: {
            word,
            entry: null,
            ai: null,
            loading: false,
          },
        }));
      }
    },
    [fetchVerseAi],
  );

  const clearVerseStrongsForVerse = useCallback((verseNumber: number) => {
    setVerseStrongsMap(prev => {
      const m = { ...prev };
      delete m[verseNumber];
      return m;
    });
  }, []);

  // ─── Inline Verse Background (per verse) ──────────────────────────────────
  /** Loads the verse background (Author / Book / Context from the AI analysis
      + book prologue) inline instead of a modal. */
  const getVerseBackground = useCallback(
    async (verseNumber: number) => {
      setVerseBackgroundMap(prev => ({
        ...prev,
        [verseNumber]: { ai: null, prologue: null, loading: true },
      }));
      try {
        const [ai, prologue] = await Promise.all([
          fetchVerseAi(verseNumber),
          getBookPrologue(currentBook).catch(() => null),
        ]);
        setVerseBackgroundMap(prev => ({
          ...prev,
          [verseNumber]: { ai, prologue, loading: false },
        }));
      } catch (err) {
        console.warn('Failed to load verse background:', err);
        setVerseBackgroundMap(prev => ({
          ...prev,
          [verseNumber]: { ai: null, prologue: null, loading: false },
        }));
      }
    },
    [fetchVerseAi, currentBook],
  );

  const clearVerseBackgroundForVerse = useCallback((verseNumber: number) => {
    setVerseBackgroundMap(prev => {
      const m = { ...prev };
      delete m[verseNumber];
      return m;
    });
  }, []);

  // ─── Inline Journal (per verse) ───────────────────────────────────────────
  const openVerseJournal = useCallback((verseNumber: number) => {
    setJournalOpenVerse(verseNumber);
  }, []);

  const closeVerseJournal = useCallback(() => {
    setJournalOpenVerse(null);
  }, []);

  const getDailyVerseRef = useCallback(
    async (verseNumber: number, bookName: string, chapter: number) => {
      try {
        const res = await sendPostRequest<any>(
          'bible',
          'get-daily-verse-by-ref',
          {
            bookName,
            chapter,
            verseNumber,
          },
        );
        if (res.returnCode === 200 && res.returnData) {
          const dv = res.returnData;
          setDailyVerseRefMap(prev => ({
            ...prev,
            [verseNumber]: {
              reflection: dv.reflection || '',
              explanation: dv.explanation || '',
              learnMore: dv.learnMore || '',
            },
          }));
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Failed to get daily verse ref', err);
        return false;
      }
    },
    [],
  );

  const clearDailyVerseRef = useCallback((verseNumber: number) => {
    setDailyVerseRefMap(prev => {
      const m = { ...prev };
      delete m[verseNumber];
      return m;
    });
  }, []);

  const openNoteModal = useCallback(() => setShowNoteModal(true), []);
  const closeNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setNoteText('');
    pendingVersesRef.current = [];
    setSelectedVerses([]);
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
        if (!versesToSave || versesToSave.length === 0) return;

        const versesArr = Array.isArray(versesToSave)
          ? versesToSave.slice()
          : Array.from(versesToSave);

        const body: any = {
          bookName: currentBook,
          chapter: currentChapter,
          note: noteText,
        };
        // Always send array key
        body.verseNumbers = versesArr;

        const noteRes = await sendPostRequest(
          'bible',
          'add-verse-note',
          body,
          undefined,
          true,
        );
        pendingVersesRef.current = [];
        setSelectedVerses([]);
        showToast(
          'success',
          noteRes.returnCode === 202
            ? 'Saved offline — will sync'
            : 'Note saved',
        );
        closeNoteModal();
      } catch (err: any) {
        console.warn('Failed to save note', err);
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
    setCurrentBook,
    setCurrentChapter,
    isDark,
    navigation,
    books,
    maxChapters,
    verses,
    versesArray,
    chapterHeadings,
    bookHeadings,
    highlights,
    favorites,
    selectedVerses,
    multiSelectMode,
    enterMultiSelect,
    exitMultiSelect,
    clearMultiSelect,
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
    getVerseTextAsync,
    getverseExplanation,
    explainingVerse,
    clearVerseExplanationForVerse,
    verseStrongsMap,
    getVerseStrongs,
    clearVerseStrongsForVerse,
    verseBackgroundMap,
    getVerseBackground,
    clearVerseBackgroundForVerse,
    journalOpenVerse,
    openVerseJournal,
    closeVerseJournal,
    dailyVerseRefMap,
    getDailyVerseRef,
    clearDailyVerseRef,
    activeVerseWordMap,
    modal,
    dismissModal,
    selectChapterFromModal,
    selectBookFromModal,
    startReadingChapter,
    handleAudioStop,
    refreshing,
    onRefresh,
    showAudioPlayer,
    activeAudioVerse,
    audioPlaylist,
    audioScope,
    afterPlayBehaviour,
    audioVerseIndex,
    isAudioPaused,
    speechRate,
    sleepTimerRemaining,
    onSpeedToggle,
    onSpeedReset,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    currentVoiceId,
    voiceList,
    edgeEnabled,
    onVoiceSelect,
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
