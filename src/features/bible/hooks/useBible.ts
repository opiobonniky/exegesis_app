import {
  useState,
  useRef,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { Animated, Clipboard, FlatList, Share } from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {
  getBibleBooks,
  getVersesForChapter,
  searchVerses,
  Book,
} from '../../../utilits/bibleUtils';
import { sendPostRequest } from '../../../services/api';
import { HIGHLIGHT_COLORS } from '../../../utilits/HIGHLIGHT_COLORS';
import { AppContext } from '../../../common/AppContext';
import { bibleTTS } from '../../../utilits/bibleTTS';
import { BIBLE_VERSIONS } from '../../../assets/bibleVersion/json/bibleVersions';
import { showToast } from '../../../helpers/Toash.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Highlight {
  id?: number;
  verseKey: string;
  color: string;
  colorId: number;
  note?: string;
}

export interface VerseItem {
  verseNum: string;
  text: string;
}

export interface ActionModalState {
  status: boolean;
  title: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export type AudioScope = 'verse' | 'selection' | 'chapter';
export type AfterPlayBehaviour = 'continue' | 'repeat' | 'repeat_one' | 'stop';

/**
 * Generates a map of word spans (start index and length) for a given text.
 * Used for word-level highlighting during TTS.
 */
const generateWordMap = (
  text: string,
): Array<{ start: number; length: number }> => {
  if (!text) return [];
  const spans: Array<{ start: number; length: number }> = [];
  const spanRe = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = spanRe.exec(text)) !== null) {
    spans.push({
      start: match.index,
      length: match[0].length,
    });
  }
  return spans;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useBible() {
  const isFocused = useIsFocused();
  const routes = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookName, chapter } = routes?.params || {};

  const {
    isDark,
    currentBook,
    setCurrentBook,
    currentChapter,
    setCurrentChapter,
    bibleVersionId,
    setBibleVersion,
  }: any = useContext(AppContext);

  // ── Data ─────────────────────────────────────────────────────────────────

  const [books, setBooks] = useState<Book[]>([]);
  const [maxChapters, setMaxChapters] = useState(21);
  const [verses, setVerses] = useState<Record<number, string>>({});
  const [highlights, setHighlights] = useState<Record<string, Highlight>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [pendingVerses, setPendingVerses] = useState<number[]>([]);

  // ── UI ───────────────────────────────────────────────────────────────────

  const [fontSize, setFontSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [versesReady, setVersesReady] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [versionSwitching, setVersionSwitching] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────────────

  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showChapterOverlay, setShowChapterOverlay] = useState(false);
  const [activeAudioVerse, setActiveAudioVerse] = useState<number | null>(null);
  const [activeAudioVerseText, setActiveAudioVerseText] = useState<
    string | null
  >(null);
  const [audioPlaylist, setAudioPlaylist] = useState<
    Array<{ num: number; text: string }>
  >([]);

  // ── AudioControlBar state ─────────────────────────────────────────────────
  const [audioScope, setAudioScope] = useState<AudioScope>('selection');
  const [afterPlayBehaviour, setAfterPlayBehaviour] =
    useState<AfterPlayBehaviour>('stop');
  const [audioVerseIndex, setAudioVerseIndex] = useState(0);
  const [isAudioPaused, setIsAudioPaused] = useState(false);

  const [activeVerseWordMap, setActiveVerseWordMap] = useState<
    Array<{ start: number; length: number }>
  >([]);

  const resumeResolverRef = useRef<(() => void) | null>(null);
  const verseWordMapRef = useRef<Array<{ start: number; length: number }>>([]);

  // ── Mutable refs ──────────────────────────────────────────────────────────
  const audioIndexRef = useRef(0);
  const afterPlayBehaviourRef = useRef<AfterPlayBehaviour>('stop');
  const audioScopeRef = useRef<AudioScope>('selection');
  const audioPlaylistRef = useRef<Array<{ num: number; text: string }>>([]);
  const isReadingRef = useRef(false);
  const isAudioPausedRef = useRef(false);
  const currentVerseIndexRef = useRef(0);

  // ── FIXED: Track the char offset we have already spoken for the current
  //    verse so we can resume from that position if interrupted.
  //    Reset to 0 at the START of every new verse (not on pause).
  const verseCharOffsetRef = useRef(0);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ── Explanation ───────────────────────────────────────────────────────────
  const [verseExplanationMap, setVerseExplanationMap] = useState<
    Record<number, string>
  >({});

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [targetVerseAfterLoad, setTargetVerseAfterLoad] = useState<
    number | null
  >(null);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modal, setModal] = useState<ActionModalState>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  // ── Refs & animations ─────────────────────────────────────────────────────
  const flatListRef = useRef<FlatList<VerseItem>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // ── Derived ───────────────────────────────────────────────────────────────
  const versesArray = useMemo(
    (): VerseItem[] =>
      Object.entries(verses).map(([verseNum, text]) => ({ verseNum, text })),
    [verses],
  );

  const activeVersion = useMemo(
    () =>
      BIBLE_VERSIONS.find(v => v.id === bibleVersionId) ?? BIBLE_VERSIONS[0],
    [bibleVersionId],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      if (bookName) setCurrentBook(bookName);
      if (chapter) setCurrentChapter(Number(chapter));
    }
  }, [isFocused, bookName, chapter]);

  useEffect(() => {
    const bibleBooks = getBibleBooks();
    setBooks(bibleBooks);
    const book = bibleBooks.find(b => b.name === currentBook);
    if (book) setMaxChapters(book.chapters);
  }, []);

  useEffect(() => {
    setBooks(getBibleBooks());
  }, [bibleVersionId]);

  useEffect(() => {
    setLoading(true);
    setVersesReady(false);
    loadVerses();
    loadHighlights();
    animateIn();
    const book = books.find(b => b.name === currentBook);
    if (book) setMaxChapters(book.chapters);
  }, [currentBook, currentChapter, books, bibleVersionId]);

  useEffect(() => {
    if (showDrawer) loadFavorites();
  }, [showDrawer]);

  useEffect(() => {
    if (versesReady) {
      setLoading(false);
    }
  }, [versesReady]);

  useEffect(() => {
    return () => {
      isReadingRef.current = false;
      bibleTTS.stop();
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      _stopAllAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // FIX: Only stop audio when chapter changes if we are NOT paused.
  // When paused, chapter hasn't changed — this effect was firing spuriously
  // because isAudioPaused state change triggered re-renders that cascaded here.
  useEffect(() => {
    if ((showAudioPlayer || showChapterOverlay) && !isAudioPausedRef.current) {
      _stopAllAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBook, currentChapter]);

  useEffect(() => {
    if (
      targetVerseAfterLoad === null ||
      verses[targetVerseAfterLoad] === undefined
    )
      return;

    const scrollTimer = setTimeout(() => {
      const index = versesArray.findIndex(
        v => parseInt(v.verseNum, 10) === targetVerseAfterLoad,
      );
      if (index === -1 || !flatListRef.current) return;

      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.4,
      });

      const flashTimer = setTimeout(() => {
        setHighlightedVerse(targetVerseAfterLoad);
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.delay(400),
          Animated.timing(highlightAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.delay(200),
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.delay(400),
          Animated.timing(highlightAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setTargetVerseAfterLoad(null);
          setHighlightedVerse(null);
        });
      }, 800);

      return () => clearTimeout(flashTimer);
    }, 300);

    return () => clearTimeout(scrollTimer);
  }, [verses, targetVerseAfterLoad, versesArray]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Loaders
  // ─────────────────────────────────────────────────────────────────────────────

  const loadVerses = () => {
    const next = getVersesForChapter(currentBook, currentChapter);
    setVerses(next);
    setSelectedVerses([]);
    setVersesReady(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      loadVerses();
      await loadHighlights();
      await loadFavorites();
    } finally {
      setRefreshing(false);
    }
  }, [currentBook, currentChapter, bibleVersionId]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const loadHighlights = async () => {
    try {
      const res = await sendPostRequest('bible', 'get-highlights', {
        bookName: currentBook,
        chapter: currentChapter,
      });
      if (res.returnCode === 200 && res.returnData) {
        const map: Record<string, Highlight> = {};
        res.returnData.highlights.forEach((h: any) => {
          const key = `${h.bookName} ${h.chapter}:${h.verseNumber}`;
          const col = HIGHLIGHT_COLORS.find(c => c.id === h.colorId);
          if (col)
            map[key] = {
              id: h.id,
              verseKey: key,
              color: col.color,
              colorId: h.colorId,
              note: h.note,
            };
        });
        setHighlights(map);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error loading highlights:', e);
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await sendPostRequest('bible', 'get-favorites', {});
      if (res.returnCode === 200 && res.returnData) {
        setFavorites(
          new Set(
            res.returnData.favorites.map(
              (i: any) => `${i.bookName} ${i.chapter}:${i.verseNumber}`,
            ),
          ),
        );
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection
  // ─────────────────────────────────────────────────────────────────────────────

  const toggleVerseSelection = (n: number) =>
    setSelectedVerses(prev =>
      prev.includes(n) ? prev.filter(v => v !== n) : [...prev, n],
    );

  const setVerseRangeSelection = (start: number, end: number) => {
    const range = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    setSelectedVerses(range);
  };

  const clearSelection = () => {
    setSelectedVerses([]);
    setPendingVerses([]);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // History & Favorites
  // ─────────────────────────────────────────────────────────────────────────────

  const addReadHistory = async (verseNumber = 1) => {
    try {
      await sendPostRequest('bible', 'add-read-history', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumber,
      });
    } catch (e) {
      console.error('Error adding read history:', e);
    }
  };

  const getverseExplanation = async (
    verseNumbers?: number[],
    bookName?: string,
    chapter?: number,
  ) => {
    const targetVerses = verseNumbers ?? selectedVerses;
    const targetBook = bookName ?? currentBook;
    const targetChapter = chapter ?? currentChapter;
    if (targetVerses.length !== 1) return;
    const verseNumber = targetVerses[0];
    try {
      const res = await sendPostRequest('bible', 'get-verse-explanation', {
        bookName: targetBook,
        chapter: targetChapter,
        verseNumber,
      });
      if (res?.returnCode === 200) {
        if (!res.returnData?.explanation) {
          showToast(
            'info',
            'No Explanation: No explanation found for this verse.',
          );
          return;
        }
        setVerseExplanationMap(prev => ({
          ...prev,
          [verseNumber]: res.returnData.explanation as string,
        }));
        setShowExplanation(true);
      }
    } catch (e: any) {
      showToast(
        'error',
        'Error: ' + (e.message || 'Failed to load verse explanation'),
      );
    }
  };

  const clearVerseExplanation = useCallback(() => {
    setVerseExplanationMap({});
    setShowExplanation(false);
    setSelectedVerses([]);
  }, []);

  const clearVerseExplanationForVerse = useCallback((verseNumber: number) => {
    setVerseExplanationMap(prev => {
      const next = { ...prev };
      delete next[verseNumber];
      return next;
    });
  }, []);

  const addFavorite = async (overrideVerses?: number[]) => {
    const targets = overrideVerses || selectedVerses;
    try {
      const res = await sendPostRequest('bible', 'add-favorite', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumbers: targets,
      });
      if (res.returnCode === 200) {
        loadFavorites();
        showToast(
          'success',
          'Added to Favorites: ' +
            (res.returnMessage || 'Verses added to favorites'),
        );
      }
    } catch (e: any) {
      showToast(
        'error',
        'Adding Favorite Error: ' +
          (e.message || 'Failed to add to favorites.'),
      );
    } finally {
      clearSelection();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio — private primitives
  // ─────────────────────────────────────────────────────────────────────────────

  const _scrollToVerse = (verseNum: number) => {
    const index = versesArray.findIndex(
      v => parseInt(v.verseNum, 10) === verseNum,
    );
    if (index === -1 || !flatListRef.current) return;
    flatListRef.current.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
  };

  /**
   * Speaks one verse from the current verseCharOffsetRef position and WAITS.
   *
   * FIX 1: Always speaks the FULL verse text and passes prefixLen = verseCharOffsetRef
   *        so the TTS manager handles offset internally. This means we never
   *        pass a sliced string whose length might be 0 (causing immediate return).
   *
   * FIX 2: The progress callback now sets verseCharOffsetRef to the absolute
   *        char offset within the verse (not accumulates), so pausing mid-verse
   *        then resuming correctly continues from the right word.
   *
   * FIX 3: On a fresh verse (not a resume), verseCharOffsetRef is 0 so full
   *        verse is spoken from the beginning.
   */
  const _playVerseAtIndex = async (
    index: number,
    playlist: any[],
    isFirstInSequence = false,
  ) => {
    if (!playlist[index]) return;
    const { num, text } = playlist[index];

    setActiveAudioVerse(num);
    setActiveAudioVerseText(text);
    _scrollToVerse(num);

    const startOffset = verseCharOffsetRef.current;

    // ── Intro construction ──────────────────────────────────────────────────
    // Only add intro if we are NOT resuming mid-verse.
    const isResume = startOffset > 0;
    const fullWordMap = generateWordMap(text);
    setActiveVerseWordMap(fullWordMap);

    let baseWordIndex = 0;
    if (isResume) {
      // Find the index of the word that contains or starts after the current offset.
      // This ensures highlighting resumes from the correct word.
      const foundIdx = fullWordMap.findIndex(
        w => w.start + w.length > startOffset,
      );
      baseWordIndex = foundIdx >= 0 ? foundIdx : fullWordMap.length;
    }

    let prefix = '';
    if (!isResume) {
      if (isFirstInSequence) {
        prefix = `${currentBook} chapter ${currentChapter}, verse ${num}. `;
      } else {
        prefix = `verse ${num}. `;
      }
    }

    // Calculate prefix length for the TTS manager to ignore during highlighting.
    // We calculate this by preparing the full text and finding where the
    // verse text starts within that cleaned version.
    const fullTextToSpeak = isResume ? text.slice(startOffset) : prefix + text;
    const cleanFull = bibleTTS.prepareText(fullTextToSpeak);
    const cleanVerse = bibleTTS.prepareText(
      isResume ? text.slice(startOffset) : text,
    );

    // The prefix length is the difference between the full cleaned text
    // and the cleaned verse portion.
    const prefixLen = Math.max(0, cleanFull.length - cleanVerse.length);

    // Guard: if somehow offset is past end of text, reset and speak full verse
    if (!fullTextToSpeak || !fullTextToSpeak.trim()) {
      verseCharOffsetRef.current = 0;
      return bibleTTS.speak(text, 0, 0);
    }

    return bibleTTS.speak(
      fullTextToSpeak,
      prefixLen,
      baseWordIndex,
      (charOffset: number) => {
        // charOffset is the position within the verse portion of textToSpeak.
        // Store the absolute position within the original verse text.
        verseCharOffsetRef.current = startOffset + charOffset;
      },
    );
  };

  /** Reset everything to silent / hidden */
  const _stopAllAudio = async () => {
    isReadingRef.current = false; // breaks the for-loop
    isAudioPausedRef.current = false;
    setIsAudioPaused(false);
    verseCharOffsetRef.current = 0;
    await bibleTTS.stop(); // unblocks _pendingResolve so loop exits
    setShowAudioPlayer(false);
    setShowChapterOverlay(false);
    setActiveAudioVerse(null);
    setActiveAudioVerseText(null);
    setActiveVerseWordMap([]);
    setAudioPlaylist([]);
    audioPlaylistRef.current = [];
    audioIndexRef.current = 0;
    currentVerseIndexRef.current = 0;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio — the shared for-loop runner
  //
  // FIX: Extracted the sequential verse-playing loop into one place so pause
  // logic is consistent between chapter mode and selection mode.
  // ─────────────────────────────────────────────────────────────────────────────

  const _runPlaylist = async (
    playlist: Array<{ num: number; text: string }>,
    startIndex: number,
  ): Promise<'done' | 'stopped' | 'exhausted'> => {
    // track if this is the very first verse of the current playlist sequence
    // (used to trigger the Book/Chapter/Verse intro vs just Verse #)
    let isFirst = true;

    for (let i = startIndex; i < playlist.length; i++) {
      // ── Skip-jump check (Next/Prev button moved the index) ─────────────────
      // If the ref was changed externally (by onNext/onPrev), we jump to that index.
      if (currentVerseIndexRef.current !== i) {
        i = currentVerseIndexRef.current;
        if (i >= playlist.length || i < 0) break;
      }

      // ── Pause check ────────────────────────────────────────────────────────
      if (isAudioPausedRef.current) {
        // Wait here until unpaused or stopped.
        while (isAudioPausedRef.current && isReadingRef.current) {
          // If a skip happens while paused, we break out of the wait
          // to start the new verse immediately (once resumed).
          if (currentVerseIndexRef.current !== i) break;

          await new Promise<void>(resolve => {
            resumeResolverRef.current = resolve;
          });
        }

        // If a skip happened while paused, restart the loop iteration for the new index.
        if (currentVerseIndexRef.current !== i) {
          i--; // counteract the for-loop i++
          continue;
        }

        // If stopped while paused, exit.
        if (!isReadingRef.current) return 'stopped';
      }

      // ── Stop check ─────────────────────────────────────────────────────────
      if (!isReadingRef.current) return 'stopped';

      // ── Update UI index ────────────────────────────────────────────────────
      setAudioVerseIndex(i);
      audioIndexRef.current = i;

      // ── Speak ──────────────────────────────────────────────────────────────
      await _playVerseAtIndex(i, playlist, isFirst);
      isFirst = false;

      // ── Post-speak checks ──────────────────────────────────────────────────
      if (!isReadingRef.current) return 'stopped';

      // ── Skip-jump (Next/Prev button moved the index while speaking) ────────
      if (currentVerseIndexRef.current !== i) {
        i = currentVerseIndexRef.current - 1; // for-loop will i++
        continue;
      }

      // If paused mid-verse (pause was set while speaking), loop back to same
      // index without advancing — verseCharOffsetRef holds the resume position.
      if (isAudioPausedRef.current) {
        i--; // counteract the for-loop i++
        continue;
      }

      // Verse finished naturally — reset char offset for the next verse.
      verseCharOffsetRef.current = 0;

      // ── Repeat one ─────────────────────────────────────────────────────────
      if (afterPlayBehaviourRef.current === 'repeat_one') {
        i--;
      }
    }

    return 'exhausted';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio — public API
  // ─────────────────────────────────────────────────────────────────────────────

  const startReadingSelectedVerses = async (overrideVerses?: number[]) => {
    const targets = overrideVerses || selectedVerses;
    if (targets.length === 0) return;
    isReadingRef.current = true;
    setAudioScope('selection');
    audioScopeRef.current = 'selection';
    setShowAudioPlayer(true);
    setShowChapterOverlay(false);
    isAudioPausedRef.current = false;
    setIsAudioPaused(false);
    currentVerseIndexRef.current = 0;
    verseCharOffsetRef.current = 0;

    while (isReadingRef.current) {
      const playlist = [...targets]
        .sort((a, b) => a - b)
        .map(num => ({ num, text: verses[num] }));

      let fullPlaylist = [...playlist];
      if (afterPlayBehaviourRef.current === 'continue') {
        const lastSelected = Math.max(...selectedVerses);
        const maxVerse = Math.max(...Object.keys(verses).map(Number));
        for (let v = lastSelected + 1; v <= maxVerse; v++) {
          if (verses[v]) fullPlaylist.push({ num: v, text: verses[v] });
        }
      }

      setAudioPlaylist(fullPlaylist);
      audioPlaylistRef.current = fullPlaylist;

      const result = await _runPlaylist(
        fullPlaylist,
        currentVerseIndexRef.current,
      );

      if (result === 'stopped' || !isReadingRef.current) break;

      const behaviour = afterPlayBehaviourRef.current;
      if (behaviour === 'repeat') {
        currentVerseIndexRef.current = 0;
        verseCharOffsetRef.current = 0;
        continue;
      } else if (behaviour === 'continue') {
        const nextChapter = currentChapter + 1;
        if (nextChapter <= maxChapters) {
          setCurrentChapter(nextChapter);
          currentVerseIndexRef.current = 0;
          verseCharOffsetRef.current = 0;
          setAudioScope('chapter');
          audioScopeRef.current = 'chapter';
          await new Promise<void>(r => setTimeout(r, 600));
          continue;
        }
        break;
      } else {
        break;
      }
    }

    isReadingRef.current = false;
    setShowAudioPlayer(false);
    setActiveAudioVerse(null);
    setActiveAudioVerseText(null);
    setActiveVerseWordMap([]);
    currentVerseIndexRef.current = 0;
    verseCharOffsetRef.current = 0;
  };

  const startReadingChapter = async () => {
    isReadingRef.current = true;
    setAudioScope('chapter');
    audioScopeRef.current = 'chapter';
    setShowAudioPlayer(true);
    setShowChapterOverlay(true);
    isAudioPausedRef.current = false;
    setIsAudioPaused(false);
    currentVerseIndexRef.current = 0;
    verseCharOffsetRef.current = 0;

    while (isReadingRef.current) {
      const chapterVerses = getVersesForChapter(currentBook, currentChapter);
      const playlist = Object.entries(chapterVerses)
        .map(([num, text]) => ({ num: Number(num), text }))
        .sort((a, b) => a.num - b.num);

      if (!playlist.length) break;

      setAudioPlaylist(playlist);
      audioPlaylistRef.current = playlist;

      const result = await _runPlaylist(playlist, currentVerseIndexRef.current);

      if (result === 'stopped' || !isReadingRef.current) break;

      const behaviour = afterPlayBehaviourRef.current;
      if (behaviour === 'repeat') {
        currentVerseIndexRef.current = 0;
        verseCharOffsetRef.current = 0;
        continue;
      } else if (behaviour === 'continue') {
        const nextChapter = currentChapter + 1;
        if (nextChapter <= maxChapters) {
          setCurrentChapter(nextChapter);
          currentVerseIndexRef.current = 0;
          verseCharOffsetRef.current = 0;
          await new Promise<void>(r => setTimeout(r, 600));
          continue;
        }
        break;
      } else {
        break;
      }
    }

    isReadingRef.current = false;
    setShowAudioPlayer(false);
    setShowChapterOverlay(false);
    setActiveAudioVerse(null);
    setActiveAudioVerseText(null);
    setActiveVerseWordMap([]);
    audioPlaylistRef.current = [];
    audioIndexRef.current = 0;
    currentVerseIndexRef.current = 0;
    verseCharOffsetRef.current = 0;
  };

  /**
   * Skip forward.
   * FIX: Also resets verseCharOffsetRef so the next verse starts from 0.
   */
  const goToNextSelectedVerse = async () => {
    const next = currentVerseIndexRef.current + 1;
    if (next >= audioPlaylistRef.current.length) {
      if (afterPlayBehaviourRef.current === 'continue') {
        verseCharOffsetRef.current = 0;
        currentVerseIndexRef.current = next;
        await bibleTTS.stop();
      }
      return;
    }
    verseCharOffsetRef.current = 0;
    currentVerseIndexRef.current = next;
    setAudioVerseIndex(next); // Update UI immediately
    await bibleTTS.stop();
  };

  /**
   * Skip backward.
   */
  const goToPreviousSelectedVerse = async () => {
    const prev = currentVerseIndexRef.current - 1;
    if (prev < 0) return;
    verseCharOffsetRef.current = 0;
    currentVerseIndexRef.current = prev;
    setAudioVerseIndex(prev); // Update UI immediately
    await bibleTTS.stop();
  };

  /**
   * Toggle Pause / Resume.
   *
   * FIX: On pause we call bibleTTS.stop() to interrupt the TTS engine, but we
   * do NOT set isReadingRef.current = false (that's only for a full stop).
   * The for-loop's pause-poll in _runPlaylist keeps the loop alive.
   * verseCharOffsetRef retains the mid-verse position for resume.
   *
   * On resume we just flip the flag — the poll exits and _playVerseAtIndex
   * is called again for the same verse index, resuming from verseCharOffsetRef.
   */
  const handleAudioTogglePlayPause = async () => {
    if (isAudioPausedRef.current) {
      // ── Resume ──────────────────────────────────────────────────────────
      isAudioPausedRef.current = false;
      setIsAudioPaused(false);
      // Immediately resolve the waiting promise in _runPlaylist to resume.
      if (resumeResolverRef.current) {
        resumeResolverRef.current();
        resumeResolverRef.current = null;
      }
    } else {
      // ── Pause ───────────────────────────────────────────────────────────
      // Set the flag BEFORE stopping so the for-loop sees it immediately
      // when _playVerseAtIndex's await resolves.
      isAudioPausedRef.current = true;
      setIsAudioPaused(true);
      // Stop the TTS engine to silence audio immediately.
      // This does NOT set isReadingRef.current = false, so the loop survives.
      // We call the TTS manager's stop directly (not _stopAllAudio).
      await bibleTTS.stop();
    }
  };

  /**
   * Full stop — hides all audio UI, clears state, clears selection.
   */
  const handleAudioStop = async () => {
    await _stopAllAudio();
    clearSelection();
    // Also resolve any waiting resume promise to allow the loop to exit.
    if (resumeResolverRef.current) {
      resumeResolverRef.current();
      resumeResolverRef.current = null;
    }
  };

  const collapseChapterOverlay = () => {
    setShowChapterOverlay(false);
    setShowAudioPlayer(true);
  };

  const handleAudioScopeChange = async (scope: AudioScope) => {
    const wasPlaying = isReadingRef.current;
    if (wasPlaying) {
      await _stopAllAudio();
    }
    setAudioScope(scope);

    if (scope === 'chapter') {
      startReadingChapter();
    } else if (scope === 'selection' && selectedVerses.length > 0) {
      startReadingSelectedVerses();
    } else if (scope === 'verse' && activeAudioVerse) {
      const singleVerse = [
        { num: activeAudioVerse, text: verses[activeAudioVerse] },
      ];
      isReadingRef.current = true;
      audioPlaylistRef.current = singleVerse;
      audioIndexRef.current = 0;
      setAudioPlaylist(singleVerse);
      setAudioVerseIndex(0);
      setShowAudioPlayer(true);
      setShowChapterOverlay(false);
      await _playVerseAtIndex(0, singleVerse);
    }
  };

  const handleAfterPlayChange = (behaviour: AfterPlayBehaviour) => {
    setAfterPlayBehaviour(behaviour);
    afterPlayBehaviourRef.current = behaviour;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Notes
  // ─────────────────────────────────────────────────────────────────────────────

  const openNoteModal = () => {
    if (selectedVerses.length === 0) {
      showToast('error', 'Please select at least one verse to add a note.');
      return;
    }
    setPendingVerses([...selectedVerses]);
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setNoteText('');
    setPendingVerses([]);
  };

  const saveNote = async (rangeStart?: number, rangeEnd?: number) => {
    if (!noteText.trim()) {
      showToast('warning', 'Empty Note: Please enter some text for your note.');
      return;
    }
    let versesToSave =
      pendingVerses.length > 0 ? pendingVerses : selectedVerses;
    if (rangeStart != null && rangeEnd != null) {
      versesToSave = [];
      for (let v = rangeStart; v <= rangeEnd; v++) versesToSave.push(v);
    }
    try {
      setNoteSaving(true);
      const res = await sendPostRequest('bible', 'add-verse-note', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumbers: versesToSave,
        note: noteText.trim(),
      });
      if (res.returnCode !== 200) {
        showToast(
          'error',
          'Failed to Add Note: ' + (res.returnMessage || 'Failed to add note.'),
        );
        return;
      }
      showToast(
        'success',
        'Note Added: ' + (res.returnMessage || 'Note added successfully.'),
      );
      closeNoteModal();
      setSelectedVerses([]);
    } catch (e) {
      console.error('Error saving note:', e);
      setModal({
        status: true,
        title: 'Error',
        message: 'Failed to save note.',
        severity: 'error',
      });
    } finally {
      setNoteSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Highlights
  // ─────────────────────────────────────────────────────────────────────────────

  const highlightVerses = async (
    colorId: number,
    color: string,
    rangeStart?: number,
    rangeEnd?: number,
  ) => {
    let versesToHighlight =
      pendingVerses.length > 0 ? pendingVerses : selectedVerses;
    if (rangeStart != null && rangeEnd != null) {
      versesToHighlight = [];
      for (let v = rangeStart; v <= rangeEnd; v++) versesToHighlight.push(v);
    }
    try {
      for (const verseNum of versesToHighlight) {
        const res = await sendPostRequest('bible', 'add-highlight', {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber: verseNum,
          colorId,
          note: '',
        });
        if (res.returnCode === 200) {
          const key = `${currentBook} ${currentChapter}:${verseNum}`;
          setHighlights(prev => ({
            ...prev,
            [key]: { verseKey: key, color, colorId },
          }));
        }
      }
      setSelectedVerses([]);
      setPendingVerses([]);
      setShowHighlightPicker(false);
      await loadHighlights();
    } catch (e: any) {
      showToast('error', 'Error: ' + e.message);
    }
  };

  const removeHighlight = async (verseNum: number) => {
    const key = `${currentBook} ${currentChapter}:${verseNum}`;
    const h = highlights[key];
    if (!h || !h.id) {
      setHighlights(prev => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      return;
    }
    try {
      const res = await sendPostRequest('bible', 'delete-highlight', {
        highlightId: h.id,
      });
      if (res.returnCode === 200) {
        setHighlights(prev => {
          const n = { ...prev };
          delete n[key];
          return n;
        });
      } else {
        showToast(
          'error',
          'Failed to Remove Highlight: ' +
            (res.returnMessage || 'Failed to remove.'),
        );
      }
    } catch (e: any) {
      showToast('error', 'Removing Highlight Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Share / Copy
  // ─────────────────────────────────────────────────────────────────────────────

  const shareVerses = async (overrideVerses?: number[]) => {
    const targets = overrideVerses || selectedVerses;
    const text = targets
      .sort((a, b) => a - b)
      .map(v => `${currentBook} ${currentChapter}:${v}\n${verses[v]}`)
      .join('\n\n');
    try {
      await Share.share({ message: text });
      clearSelection();
    } catch (e) {
      console.error(e);
    }
  };

  const copyVerses = (overrideVerses?: number[]) => {
    const targets = overrideVerses || selectedVerses;
    const text = targets
      .sort((a, b) => a - b)
      .map(v => `${currentBook} ${currentChapter}:${v}\n${verses[v]}`)
      .join('\n\n');
    Clipboard.setString(text);
    clearSelection();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Chapter navigation
  // ─────────────────────────────────────────────────────────────────────────────

  const goToChapter = (direction: 'prev' | 'next') => {
    try {
      if (direction === 'prev' && currentChapter > 1) {
        setLoading(true);
        setVerses({});
        setSelectedVerses([]);
        setCurrentChapter((prev: any) => Math.max(1, prev - 1));
      } else if (direction === 'next' && currentChapter < maxChapters) {
        setLoading(true);
        setVerses({});
        setSelectedVerses([]);
        setCurrentChapter((prev: any) => Math.min(maxChapters, prev + 1));
      }
    } catch (e) {
      showToast('error', 'Navigation Error: Unable to navigate to chapter.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────────────────────

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (query.trim().length > 2) {
      setSearchLoading(true);
      searchDebounceRef.current = setTimeout(() => {
        try {
          setSearchResults(searchVerses(query.trim(), 50));
        } catch (e) {
          console.error('Search error:', e);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  const goToVerse = (book: string, chapterNum: number, verse?: number) => {
    setLoading(true);
    setVersesReady(false);
    setVerses({});
    setSelectedVerses([]);
    setCurrentBook(book);
    setCurrentChapter(chapterNum);
    if (verse !== undefined) setTargetVerseAfterLoad(verse);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeSearch = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Version
  // ─────────────────────────────────────────────────────────────────────────────

  const handleVersionChange = async (versionId: string) => {
    if (versionId === bibleVersionId) {
      setShowVersionPicker(false);
      return;
    }
    setLoading(true);
    try {
      setVersionSwitching(true);
      setShowVersionPicker(false);
      setShowDrawer(false);
      await setBibleVersion(versionId);
    } finally {
      setVersionSwitching(false);
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Action modal
  // ─────────────────────────────────────────────────────────────────────────────

  const dismissModal = () => setModal({ ...modal, status: false });

  const selectChapterFromModal = (ch: number) => {
    setLoading(true);
    setVersesReady(false);
    setVerses({});
    setSelectedVerses([]);
    setCurrentChapter(ch);
  };

  const selectBookFromModal = (book: string) => {
    setLoading(true);
    setVersesReady(false);
    setVerses({});
    setSelectedVerses([]);
    setCurrentBook(book);
    setCurrentChapter(1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────────

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
    pendingVerses,
    setPendingVerses,
    activeVersion,
    bibleVersionId,
    currentBook,
    currentChapter,
    setCurrentBook,
    setCurrentChapter,
    fontSize,
    setFontSize,
    loading,
    searchLoading,
    versionSwitching,
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
    setShowAudioPlayer,
    showChapterOverlay,
    activeAudioVerse,
    activeAudioVerseText,
    activeVerseWordMap,
    audioPlaylist,
    audioScope,
    afterPlayBehaviour,
    audioVerseIndex,
    isAudioPaused,
    searchQuery,
    searchResults,
    handleSearch,
    goToVerse,
    closeSearch,
    verseExplanationMap,
    getverseExplanation,
    clearVerseExplanation,
    clearVerseExplanationForVerse,
    noteText,
    setNoteText,
    noteSaving,
    openNoteModal,
    closeNoteModal,
    saveNote,
    startReadingSelectedVerses,
    startReadingChapter,
    handleAudioTogglePlayPause,
    handleAudioStop,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    collapseChapterOverlay,
    handleAudioScopeChange,
    handleAfterPlayChange,
    highlightedVerse,
    highlightAnim,
    fadeAnim,
    flatListRef,
    toggleVerseSelection,
    setVerseRangeSelection,
    clearSelection,
    addReadHistory,
    addFavorite,
    highlightVerses,
    removeHighlight,
    shareVerses,
    copyVerses,
    goToChapter,
    handleVersionChange,
    modal,
    dismissModal,
    selectChapterFromModal,
    selectBookFromModal,
    onRefresh,
    refreshing,
    setRefreshing,
  };
}
