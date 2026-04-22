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

  // Word-position map for the currently active verse.
  // Updated ONCE per verse (when the verse starts), not per word.
  // VerseCard subscribes to bibleTTS directly for per-word updates.
  const [activeVerseWordMap, setActiveVerseWordMap] = useState<
    Array<{ start: number; length: number }>
  >([]);

  // Pre-split words of the current verse for fast wordIndex → char-offset lookup.
  const verseWordMapRef = useRef<Array<{ start: number; length: number }>>([]);

  // Mutable refs — no re-render on change, safe inside closures
  const audioIndexRef = useRef(0);
  const audioPlaylistRef = useRef<Array<{ num: number; text: string }>>([]);
  // Set false to break the sequential reading for-loop (user tapped stop)
  const isReadingRef = useRef(false);

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

  // ── Verse jump after search ───────────────────────────────────────────────

  const [targetVerseAfterLoad, setTargetVerseAfterLoad] = useState<
    number | null
  >(null);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Action modal ──────────────────────────────────────────────────────────

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

  // Deep-link / navigation params
  useEffect(() => {
    if (isFocused) {
      if (bookName) setCurrentBook(bookName);
      if (chapter) setCurrentChapter(Number(chapter));
    }
  }, [isFocused, bookName, chapter]);

  // Load book list on mount
  useEffect(() => {
    const bibleBooks = getBibleBooks();
    setBooks(bibleBooks);
    const book = bibleBooks.find(b => b.name === currentBook);
    if (book) setMaxChapters(book.chapters);
  }, []);

  // Refresh book list on version change
  useEffect(() => {
    setBooks(getBibleBooks());
  }, [bibleVersionId]);

  // Reload verses when book / chapter / version changes
  useEffect(() => {
    // ✅ Force skeleton immediately and prevent "empty flash"
    setLoading(true);
    setVersesReady(false);

    loadVerses(); // sync (local)
    loadHighlights(); // async (remote) - should NOT control skeleton
    animateIn();

    const book = books.find(b => b.name === currentBook);
    if (book) setMaxChapters(book.chapters);
  }, [currentBook, currentChapter, books, bibleVersionId]);
  // Load favorites when drawer opens
  useEffect(() => {
    if (showDrawer) loadFavorites();
  }, [showDrawer]);

  useEffect(() => {
    if (versesReady) {
      setLoading(false);
    }
  }, [versesReady]);

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      isReadingRef.current = false;
      bibleTTS.stop();
    };
  }, []);

  // Stop audio whenever the screen loses focus (user navigates away).
  // bibleTTS.stop() alone is not enough — it unblocks the pending speak
  // promise, but the for-loop in startReadingChapter / startReadingSelectedVerses
  // checks isReadingRef.current and would immediately queue the next verse.
  // _stopAllAudio() sets the ref to false first, so the loop exits cleanly.
  useEffect(() => {
    if (!isFocused) {
      _stopAllAudio();
    }
    // _stopAllAudio is defined in this same scope; isFocused is the hook value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // Stop audio when the user navigates to a different chapter / book
  useEffect(() => {
    if (showAudioPlayer || showChapterOverlay) {
      _stopAllAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBook, currentChapter]);

  // ── Search-jump scroll & flash ────────────────────────────────────────────
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

    // Update the chapter text first
    setVerses(next);
    setSelectedVerses([]);

    // Mark ready in same render batch
    setVersesReady(true);
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      loadVerses(); // sync
      await loadHighlights(); // async
      await loadFavorites(); // async
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

      console.log('Highlights response:', JSON.stringify(res));

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
        setLoading(false); // ✅ Only set loading false after highlights are loaded
      }
    } catch (e) {
      console.error('Error loading highlights:', e);
      setLoading(false); // ✅ Don't forget to stop loading on error
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await sendPostRequest('bible', 'get-favorites', {});

      console.log('Favorites response:', JSON.stringify(res));

      if (res.returnCode === 200 && res.returnData) {
        setFavorites(
          new Set(
            res.returnData.favorites.map(
              (i: any) => `${i.bookName} ${i.chapter}:${i.verseNumber}`,
            ),
          ),
        );
      } else {
        console.error('Failed to load favorites:', res.returnMessage);
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

  const clearSelection = () => setSelectedVerses([]);

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
        console.log('Verse explanation response:', JSON.stringify(res));
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

  const addFavorite = async () => {
    try {
      const res = await sendPostRequest('bible', 'add-favorite', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumbers: selectedVerses,
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

  /** Scroll the FlatList so the narrated verse is visible */
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
   * Speaks one verse and WAITS until it finishes.
   * bibleTTS.speakVerses → bibleTTS.speak() now blocks via _pendingResolve,
   * so this function only returns once the native TTS fires tts-finish/cancel.
   * The for-loop in startReadingChapter advances to verse N+1 only after this.
   */
  const _playVerseAtIndex = async (
    index: number,
    playlist: Array<{ num: number; text: string }>,
  ) => {
    if (index < 0 || index >= playlist.length) return;
    const verse = playlist[index];

    audioIndexRef.current = index;
    audioPlaylistRef.current = playlist;

    // ── Build an ALIGNED word map: clean-text word index → original text offset
    //
    // WHY: bibleTTS speaks `prepareText(verse.text)` (the "clean" text), so
    //  tts-progress events and timer indices are relative to clean-text words.
    //  But VerseCard displays `verse.text` (original), so we must map indices
    //  back to original character positions.
    //
    //  prepareText can change word count (em-dashes, parentheticals, abbrevs),
    //  so we can't just assume clean word N === original word N.
    //
    //  Algorithm:
    //   1. Build originalWords[] with {word, start, length} from verse.text.
    //   2. Build cleanWords[] from prepareText(verse.text).
    //   3. Align greedily: for each clean word, find the nearest original word
    //      whose normalised form matches, searching in a small window.
    //   4. Store aligned positions as verseWordMapRef.current.

    // Step 1 — original word positions
    const originalWords: Array<{
      word: string;
      start: number;
      length: number;
    }> = [];
    {
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(verse.text)) !== null) {
        originalWords.push({ word: m[0], start: m.index, length: m[0].length });
      }
    }

    // Step 2 — clean word list (what TTS actually speaks for the verse portion)
    const cleanVerseText = bibleTTS.prepareText(verse.text);
    const cleanWords: string[] = cleanVerseText.match(/\S+/g) ?? [];

    // Step 3 — greedy alignment
    const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Track the last matched original index to prevent backward jumps
    let lastOrigIdx = 0;
    const wordMap: Array<{ start: number; length: number }> = cleanWords.map(
      (cw, ci) => {
        const cn = normalize(cw);
        // Search forward from lastOrigIdx in a window of ±4
        const lo = Math.max(lastOrigIdx, 0);
        const hi = Math.min(lo + 6, originalWords.length - 1);
        for (let j = lo; j <= hi; j++) {
          const on = normalize(originalWords[j].word);
          // Accept exact normalised match, or prefix match for long words
          if (
            on === cn ||
            (cn.length >= 4 && on.startsWith(cn.slice(0, 4))) ||
            (on.length >= 4 && cn.startsWith(on.slice(0, 4)))
          ) {
            lastOrigIdx = j + 1;
            return {
              start: originalWords[j].start,
              length: originalWords[j].length,
            };
          }
        }
        // Fallback: proportional index (keeps highlighting roughly in sync even
        // when alignment fails, e.g. heavily transformed text)
        const pi = Math.round((ci / cleanWords.length) * originalWords.length);
        const fb = originalWords[Math.min(pi, originalWords.length - 1)];
        return fb
          ? { start: fb.start, length: fb.length }
          : { start: 0, length: 0 };
      },
    );

    // ── Fire speak() FIRST — before any React state updates ────────────────
    //
    // Each setState triggers a re-render. Running them before speakVerses was
    // adding ~30-80 ms of render latency to every inter-verse gap.
    // Now speak() hands text to Tts.speak() synchronously on the JS thread
    // before React has a chance to schedule any renders.
    verseWordMapRef.current = wordMap;

    const speakPromise = bibleTTS.speakVerses(
      [verse],
      currentBook,
      currentChapter,
      { announceLocation: index === 0 },
    );

    // State updates happen after — native layer already has the audio queued.
    setActiveAudioVerse(verse.num);
    setActiveVerseWordMap(wordMap);
    setActiveAudioVerseText(verse.text);
    _scrollToVerse(verse.num);
    addReadHistory(verse.num);

    await speakPromise;
  };

  /** Reset everything to silent / hidden */
  const _stopAllAudio = async () => {
    isReadingRef.current = false; // breaks the for-loop
    await bibleTTS.stop(); // unblocks _pendingResolve so loop exits
    setShowAudioPlayer(false);
    setShowChapterOverlay(false);
    setActiveAudioVerse(null);
    setActiveAudioVerseText(null);
    setAudioPlaylist([]);
    audioPlaylistRef.current = [];
    audioIndexRef.current = 0;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio — public API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * VERSE MODE — plays selected verses sequentially.
   * The for-loop advances only after each verse fully finishes speaking.
   */
  const startReadingSelectedVerses = async () => {
    if (selectedVerses.length === 0) return;
    const playlist = [...selectedVerses]
      .sort((a, b) => a - b)
      .map(num => ({ num, text: verses[num] }));

    isReadingRef.current = true;
    audioPlaylistRef.current = playlist;
    audioIndexRef.current = 0;
    setAudioPlaylist(playlist);
    setShowChapterOverlay(false);
    setShowAudioPlayer(true);

    for (let i = 0; i < playlist.length; i++) {
      if (!isReadingRef.current) break; // stop() was called
      audioIndexRef.current = i;
      await _playVerseAtIndex(i, playlist);
    }

    if (isReadingRef.current) {
      isReadingRef.current = false;
      setShowAudioPlayer(false);
      setActiveAudioVerse(null);
      setActiveAudioVerseText(null);
    }
  };

  /**
   * CHAPTER MODE — reads every verse from first to last.
   * verse N+1 never starts until verse N is completely spoken.
   */
  const startReadingChapter = async () => {
    const chapterVerses = getVersesForChapter(currentBook, currentChapter);
    const playlist = Object.entries(chapterVerses)
      .map(([num, text]) => ({ num: Number(num), text }))
      .sort((a, b) => a.num - b.num);

    if (!playlist.length) return;

    isReadingRef.current = true;
    audioPlaylistRef.current = playlist;
    audioIndexRef.current = 0;
    setAudioPlaylist(playlist);
    setShowAudioPlayer(true);
    setShowChapterOverlay(true);

    for (let i = 0; i < playlist.length; i++) {
      if (!isReadingRef.current) break; // stop() was called
      audioIndexRef.current = i;
      await _playVerseAtIndex(i, playlist);
    }

    if (isReadingRef.current) {
      isReadingRef.current = false;
      setShowAudioPlayer(false);
      setShowChapterOverlay(false);
      setActiveAudioVerse(null);
      setActiveAudioVerseText(null);
      audioPlaylistRef.current = [];
      audioIndexRef.current = 0;
    }
  };

  /**
   * Skip forward: stop current speech, the for-loop will naturally advance
   * to the next verse since _playVerseAtIndex will return after stop().
   */
  const goToNextSelectedVerse = async () => {
    const next = audioIndexRef.current + 1;
    if (next >= audioPlaylistRef.current.length) return;
    // Bump the index so when the loop increments (i++) it lands on `next`
    audioIndexRef.current = next - 1;
    await bibleTTS.stop(); // unblocks the current await in _playVerseAtIndex
  };

  /**
   * Skip backward: stop current speech, the for-loop will re-read from prev.
   */
  const goToPreviousSelectedVerse = async () => {
    const prev = audioIndexRef.current - 1;
    if (prev < 0) return;
    audioIndexRef.current = Math.max(0, prev - 1);
    await bibleTTS.stop();
  };

  /**
   * Pause → Resume → Restart (cycles).
   */
  const handleAudioTogglePlayPause = async () => {
    const s = bibleTTS.getState();
    if (s.isPlaying && !s.isPaused) {
      await bibleTTS.pause();
    } else if (s.isPaused) {
      await bibleTTS.resume();
    } else {
      // Session ended or never started — restart current verse
      const playlist = audioPlaylistRef.current;
      if (playlist.length === 0) return;
      await _playVerseAtIndex(audioIndexRef.current, playlist);
    }
  };

  /**
   * Full stop — hides all audio UI, clears state, clears selection.
   */
  const handleAudioStop = async () => {
    await _stopAllAudio();
    clearSelection();
  };

  /**
   * Collapse the chapter overlay WITHOUT stopping audio.
   * FloatingAudioBar takes over as the minimal indicator.
   */
  const collapseChapterOverlay = () => {
    setShowChapterOverlay(false);
    setShowAudioPlayer(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Notes
  // ─────────────────────────────────────────────────────────────────────────────

  const openNoteModal = () => {
    if (selectedVerses.length === 0) {
      showToast(
        'error',

        'Please select at least one verse to add a note.',
      );
      return;
    }
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setNoteText('');
  };

  const saveNote = async () => {
    if (!noteText.trim()) {
      showToast('warning', 'Empty Note: Please enter some text for your note.');
      return;
    }
    try {
      setNoteSaving(true);
      const res = await sendPostRequest('bible', 'add-verse-note', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumbers: selectedVerses,
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

  const highlightVerses = async (colorId: number, color: string) => {
    try {
      for (const verseNum of selectedVerses) {
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

  const shareVerses = async () => {
    const text = selectedVerses
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

  const copyVerses = () => {
    const text = selectedVerses
      .sort((a, b) => a - b)
      .map(v => `${currentBook} ${currentChapter}:${v}\n${verses[v]}`)
      .join('\n\n');
    Clipboard.setString(text);
    // showToast('success', 'Copied to Clipboard', 'Selected verses copied.');
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

  // ✅ Used by Book/Chapter selector modals (no search side-effects)
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
    // Theme / navigation
    isDark,
    navigation,

    // Data
    books,
    maxChapters,
    verses,
    versesArray,
    highlights,
    favorites,
    selectedVerses,
    activeVersion,
    bibleVersionId,
    currentBook,
    currentChapter,
    setCurrentBook,
    setCurrentChapter,

    // UI
    fontSize,
    setFontSize,
    loading,
    searchLoading,
    versionSwitching,

    // Modal visibility
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

    // Audio state
    showAudioPlayer,
    setShowAudioPlayer,
    showChapterOverlay,
    activeAudioVerse,
    activeAudioVerseText,
    activeVerseWordMap, // replaces activeWordOffset — updated once per verse, not per word

    // Search
    searchQuery,
    searchResults,
    handleSearch,
    goToVerse,
    closeSearch,

    // Explanation
    verseExplanationMap,
    getverseExplanation,
    clearVerseExplanation,
    clearVerseExplanationForVerse,

    // Note
    noteText,
    setNoteText,
    noteSaving,
    openNoteModal,
    closeNoteModal,
    saveNote,

    // Audio controls
    startReadingSelectedVerses, // verse mode
    startReadingChapter, // chapter mode  ← NEW
    handleAudioTogglePlayPause,
    handleAudioStop,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    collapseChapterOverlay, // hides overlay, keeps audio  ← NEW

    // Verse search-jump animation
    highlightedVerse,
    highlightAnim,
    fadeAnim,

    // Refs
    flatListRef,

    // Actions
    toggleVerseSelection,
    clearSelection,
    addReadHistory,
    addFavorite,
    highlightVerses,
    removeHighlight,
    shareVerses,
    copyVerses,
    goToChapter,
    handleVersionChange,

    // Feedback modal
    modal,
    dismissModal,
    selectChapterFromModal,
    selectBookFromModal,

    //refresh control    refreshing,
    onRefresh,
    refreshing,
    setRefreshing,
  };
}
