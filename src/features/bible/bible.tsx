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
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
  ScrollView,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import { useSubscription } from '../../hooks/useSubscription';
import { showToast } from '../../helpers/Toash.helper';
import { createBibleStyles } from './bibleStyle';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { useBible } from './hooks/useBible';
import BottomTab from '../../component/navigations/BottomTab';
import ActionModal from '../../reusable/ActionModal';
import { AppContext } from '../../common/AppContext';
import GuestBanner from '../auth/GuestBanner';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
} from 'lucide-react-native';
import {
  useLanguage,
  isRtlLanguage,
} from '../../component/language-translation/LanguageProvider';
import LinearGradient from 'react-native-linear-gradient';
import { bibleApi } from '../../services/bibleApi';
import {
  getVerseWords,
  getStrongsEntry,
  StrongsWordData,
  StrongsEntry,
} from '../../services/strongsService';
import WordStudyBottomSheet from './components/WordStudyBottomSheet';
import BookSelectorScreen from './components/BookSelectorScreen';
import ChapterSelectorScreen from './components/ChapterSelectorScreen';

import {
  BibleHeader,
  ChapterNavigation,
  VerseList,
  AudioControlBar,
  VerseSideMenu,
  ChapterStudyToolsSheet,
  SkeletonLoader,
} from './components';

import {
  HighlightPickerModal,
  DrawerMenu,
  NoteModal,
  TranslationPickerModal,
} from './modals';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface VerseRef {
  ref: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
}

type Segment = string | VerseRef;

const VERSE_REGEX =
  /\b((?:\d\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+):(\d+)\b/g;

function parseVerseRefs(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  VERSE_REGEX.lastIndex = 0;

  while ((match = VERSE_REGEX.exec(text)) !== null) {
    const [full, bookName, chapterStr, verseStr] = match;
    const start = match.index;

    if (start > lastIndex) {
      segments.push(text.slice(lastIndex, start));
    }

    segments.push({
      ref: full,
      bookName: bookName.trim(),
      chapter: parseInt(chapterStr, 10),
      verseNumber: parseInt(verseStr, 10),
    });

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Bible() {
  const app = useContext(AppContext);
  const routeParams = useRoute<any>().params || {};

  const reflectionQuestions = routeParams.reflectionQuestions ?? [];
  const hasReflections = reflectionQuestions.length > 0;
  const isFromReadingPlan = hasReflections;
  const dayTitle = routeParams.dayTitle;
  const planTitle = routeParams.planTitle;
  const { hasAccess } = useSubscription();

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const reflectionOpenRef = useRef(false);

  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  const toggleReflection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !reflectionOpenRef.current;
    reflectionOpenRef.current = next;
    setReflectionOpen(next);
  };

  const handleScroll = useCallback(
    (event: any) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      const direction = currentOffset > scrollY.current ? 'down' : 'up';
      const shouldShow = direction === 'up' || currentOffset <= 0;

      if (shouldShow !== bottomTabVisible) {
        setBottomTabVisible(shouldShow);
        Animated.timing(tabBarAnimation, {
          toValue: shouldShow ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }

      scrollY.current = currentOffset;
    },
    [bottomTabVisible, tabBarAnimation],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        if (reflectionOpenRef.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          reflectionOpenRef.current = false;
          setReflectionOpen(false);
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        if (reflectionOpenRef.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          reflectionOpenRef.current = false;
          setReflectionOpen(false);
        }
        return false;
      },
    }),
  ).current;

  // const isGuest = !!app?.userInfo ?? false;
  const isGuest = !app?.userInfo;

  const {
    setCurrentBook,
    setCurrentChapter,
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
    goToVerse,
    handleVersionChange,
    getverseExplanation,
    clearVerseExplanationForVerse,
    activeVerseWordMap,
    modal,
    dismissModal,
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
    onSpeedReset,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    handleAudioTogglePlayPause,
    verseJournalPrompts,
    chapterJournalPrompts,
    loadChapterPrompts,
    dailyVerseRefMap,
    getDailyVerseRef,
    clearDailyVerseRef,
    explainingVerse,
    isOnline,
  } = useBible();

  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);

  const [freeTranslationsOnly, setFreeTranslationsOnly] = useState(false);
  const settingsFetchedRef = useRef(false);

  // ── Strong's Concordance (word study) state ──────────────────────────────
  const [verseWordMap, setVerseWordMap] = useState<
    Record<number, StrongsWordData[]>
  >({});
  const [showWordStudy, setShowWordStudy] = useState(false);
  const [selectedWord, setSelectedWord] = useState<StrongsWordData | null>(
    null,
  );
  const [selectedWordEntry, setSelectedWordEntry] =
    useState<StrongsEntry | null>(null);
  const [wordStudyLoading, setWordStudyLoading] = useState(false);

  const handleWordPress = useCallback(async (word: StrongsWordData) => {
    if (!hasAccess('legacy_sower')) {
      showToast('warning', 'Word Study requires a Legacy Sower subscription');
      setTimeout(() => navigation.navigate(route.sower), 1200);
      return;
    }
    setSelectedWord(word);
    setShowWordStudy(true);
    setWordStudyLoading(true);
    setSelectedWordEntry(null);
    if (word.strongsId && word.hasData) {
      try {
        const res = await getStrongsEntry(word.strongsId);
        if (res?.returnData) {
          setSelectedWordEntry(res.returnData);
        }
      } catch (e) {
        console.error('Failed to fetch Strongs entry:', e);
      }
    }
    setWordStudyLoading(false);
  }, [hasAccess, navigation]);

  // Fetch Strong's word data when chapter changes
  const fetchVerseWords = useCallback(async () => {
    if (!currentBook || !currentChapter) return;
    try {
      const res = await getVerseWords(
        currentBook,
        currentChapter,
        undefined,
        activeVersion.id,
      );

      if (!res?.returnData) return;
      const grouped: Record<number, StrongsWordData[]> = {};
      for (const w of res.returnData) {
        if (!grouped[w.verseNumber!]) grouped[w.verseNumber!] = [];
        grouped[w.verseNumber!].push(w);
      }
      setVerseWordMap(grouped);
    } catch (e) {
      console.error('Failed to fetch verse word data:', e);
    }
  }, [currentBook, currentChapter, activeVersion?.id]);

  useEffect(() => {
    fetchVerseWords();
  }, [fetchVerseWords]);

  // ── Entry flow: book → chapter → reader ──────────────────────────────
  const [selectionStage, setSelectionStage] = useState<
    'book' | 'chapter' | 'reading'
  >('book');
  const [initialLoading, setInitialLoading] = useState(true);
  const hasEnteredReadingRef = useRef(false);
  const BIBLE_POSITION_KEY = 'bible_last_position';

  // On mount: check route params first, then AsyncStorage for saved position
  useEffect(() => {
    const init = async () => {
      const { bookName, chapter } = routeParams;
      if (bookName && chapter) {
        setCurrentBook(bookName);
        setCurrentChapter(chapter);
        setSelectionStage('reading');
        hasEnteredReadingRef.current = true;
      } else {
        try {
          const saved = await AsyncStorage.getItem(BIBLE_POSITION_KEY);
          if (saved) {
            const pos = JSON.parse(saved);
            if (pos.bookName && pos.chapter) {
              setCurrentBook(pos.bookName);
              setCurrentChapter(pos.chapter);
              setSelectionStage('reading');
              hasEnteredReadingRef.current = true;
            }
          }
        } catch {
          // ignore parse errors, fall through to entry flow
        }
      }
      setInitialLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist position whenever book/chapter changes (after initial load)
  useEffect(() => {
    if (initialLoading) return;
    if (!currentBook || !currentChapter) return;
    AsyncStorage.setItem(
      BIBLE_POSITION_KEY,
      JSON.stringify({ bookName: currentBook, chapter: currentChapter }),
    ).catch(() => {});
  }, [currentBook, currentChapter, initialLoading]);

  const handleEntrySelectBook = useCallback(
    (bookName: string) => {
      setCurrentBook(bookName);
      setCurrentChapter(1);
      setSelectionStage('chapter');
    },
    [],
  );

  const handleEntrySelectChapter = useCallback(
    (chapter: number) => {
      setCurrentChapter(chapter);
      setSelectionStage('reading');
      hasEnteredReadingRef.current = true;
    },
    [],
  );

  const handleEntryBackFromBooks = useCallback(() => {
    setSelectionStage('reading');
  }, []);

  const handleEntryBackToBooks = useCallback(() => {
    setSelectionStage('book');
  }, []);

  // ── Load translation settings from backend ───────────────────────────
  useEffect(() => {
    const load = async () => {
      if (settingsFetchedRef.current) return;
      settingsFetchedRef.current = true;
      try {
        const settings = await bibleApi.getTranslationSettings();
        setFreeTranslationsOnly(settings.freeTranslationsOnly);
        if (
          settings.defaultTranslationId &&
          settings.defaultTranslationId !== bibleVersionId
        ) {
          handleVersionChange(settings.defaultTranslationId);
        }
      } catch (e) {
        console.error('Failed to load translation settings:', e);
      }
    };
    load();
  }, []);

  // ── Load chapter journal prompts whenever book/chapter/auth changes ─────────
  // (must live here — after useBible() — so currentBook, currentChapter,
  //  loadChapterPrompts, and isGuest are all initialised before the deps array
  //  is evaluated, avoiding the Hermes TDZ ReferenceError)
  useEffect(() => {
    if (!isGuest) {
      loadChapterPrompts();
    }
  }, [currentBook, currentChapter, isGuest]);



  const COLORS = getColors(isDark);
  const styles = useMemo(
    () => createBibleStyles(isDark, isRtl),
    [isDark, isRtl],
  );
  const rpStyles = useMemo(
    () => (isFromReadingPlan ? useRpStyles(isRtl) : null),
    [isRtl, isFromReadingPlan],
  );

  // ── Guest gate state ──────────────────────────────────────────────────────
  const [gateVisible, setGateVisible] = useState(false);
  const [gateMessage, setGateMessage] = useState('');

  const showGate = (msg: string) => {
    clearSelection();
    setGateMessage(msg);
    setGateVisible(true);
  };

  const hideGate = () => setGateVisible(false);

  /** Runs callback if authenticated; shows gate banner with msg if guest */
  const guard = (msg: string, callback: () => void) => {
    if (isGuest) {
      showGate(msg);
      return;
    }
    callback();
  };

  // ── Verse Side Menu state ─────────────────────────────────────────────────
  const [verseMenuVisible, setVerseMenuVisible] = useState(false);
  const [verseMenuVerse, setVerseMenuVerse] = useState<number | null>(null);

  const openVerseMenu = useCallback((verseNumber: number) => {
    setVerseMenuVerse(verseNumber);
    setVerseMenuVisible(true);
  }, []);

  const getVerseMenuSelection = useCallback(() => {
    if (
      selectedVerses.length > 0 &&
      (!verseMenuVerse || selectedVerses.includes(verseMenuVerse))
    ) {
      return [...selectedVerses];
    }
    return verseMenuVerse ? [verseMenuVerse] : [];
  }, [selectedVerses, verseMenuVerse]);

  const closeVerseMenu = useCallback(() => {
    setVerseMenuVisible(false);
    setVerseMenuVerse(null);
  }, []);

  // ── Study Tools state ──────────────────────────────────────────────────────
  const [showStudyTools, setShowStudyTools] = useState(false);
  const [studyToolsSelectedVerses, setStudyToolsSelectedVerses] = useState<number[]>([]);
  const [studyToolHighlights, setStudyToolHighlights] = useState<Record<number, { label: string; color: string }>>({});

  useEffect(() => {
    setStudyToolHighlights({});
  }, [currentBook, currentChapter]);

  /** Guest action triggered from within VerseSideMenu (modal closes first, then gate) */
  const handleVerseMenuGuestAction = useCallback(
    (msg: string) => {
      showGate(msg);
    },
    [showGate],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        handleAudioStop();
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      {/* Offline banner */}
      {isOnline === false && (
        <View style={{ backgroundColor: '#F59E0B', paddingVertical: 6, paddingHorizontal: 16 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
            You are offline — showing cached or local content
          </Text>
        </View>
      )}

      {initialLoading ? (
        <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <BibleHeader
        book={currentBook}
        chapter={currentChapter}
        version={activeVersion}
        isDark={isDark}
        isRtl={isRtl}
        onMenuPress={() => {}}
        onBookPress={() => {}}
        onSearchPress={() => {}}
        onVersionPress={() => {}}
        onStudyToolsPress={() => {}}
      />

      {/* ── Chapter Navigation ───────────────────────────────────────────── */}
      <ChapterNavigation
        currentChapter={currentChapter}
        maxChapters={maxChapters}
        isDark={isDark}
        isAudioPlaying={false}
        onPrev={() => {}}
        onNext={() => {}}
        onSelectChapter={() => {}}
        onAudioChapter={() => {}}
      />

      <View style={{ flex: 1 }}>
        <SkeletonLoader colors={COLORS} />
      </View>
        </>
      ) : selectionStage === 'book' ? (
        <BookSelectorScreen
          books={books}
          isDark={isDark}
          onSelectBook={handleEntrySelectBook}
          onBack={hasEnteredReadingRef.current ? handleEntryBackFromBooks : undefined}
        />
      ) : selectionStage === 'chapter' ? (
        <ChapterSelectorScreen
          bookName={currentBook}
          maxChapters={maxChapters}
          isDark={isDark}
          onSelectChapter={handleEntrySelectChapter}
          onBack={handleEntryBackToBooks}
        />
      ) : (
        <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <BibleHeader
        book={currentBook}
        chapter={currentChapter}
        version={activeVersion}
        isDark={isDark}
        isRtl={isRtl}
        onMenuPress={() => {
          clearSelection();
          setShowDrawer(true);
        }}
        onBookPress={() => {
          clearSelection();
          setSelectionStage('book');
        }}
        onSearchPress={() => navigation.navigate(route.search)}
        onVersionPress={() => setShowTranslationPicker(true)}
        onStudyToolsPress={() => {
          setStudyToolsSelectedVerses([]);
          setShowStudyTools(true);
        }}
      />

      {/* ── Chapter Navigation ───────────────────────────────────────────── */}
      <ChapterNavigation
        currentChapter={currentChapter}
        maxChapters={maxChapters}
        isDark={isDark}
        isAudioPlaying={showAudioPlayer}
        onPrev={() => goToChapter('prev')}
        onNext={() => goToChapter('next')}
        onSelectChapter={() => setSelectionStage('chapter')}
        onAudioChapter={() =>
          guard('Audio narration requires a free account.', () => {
            if (showAudioPlayer) handleAudioStop();
            else startReadingChapter();
          })
        }
      />

      {/* ── Chapter Journal Prompts ───────────────────────────────────────── */}
      {chapterJournalPrompts.length > 0 && !isGuest && (
        <View
          style={[
            styles.chapterPromptsContainer,
            { backgroundColor: COLORS.surface },
          ]}
        >
          <View style={styles.chapterPromptsHeader}>
            <Text
              style={[styles.chapterPromptsTitle, { color: COLORS.primary }]}
            >
              {translations?.bible?.chapterReflections || 'Chapter Reflections'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate(route.journalEntry, {
                  bookName: currentBook,
                  chapter: currentChapter,
                });
              }}
              style={[
                styles.addJournalBtn,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <Text style={styles.addJournalBtnText}>
                + {translations?.bible?.add || 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsScroll}
          >
            {chapterJournalPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={prompt.id || idx}
                style={[
                  styles.chapterPromptChip,
                  { borderColor: COLORS.border },
                ]}
                onPress={() => {
                  navigation.navigate(route.journalEntry, {
                    bookName: currentBook,
                    chapter: currentChapter,
                    promptText: prompt.prompt,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chapterPromptText, { color: COLORS.text }]}
                  numberOfLines={2}
                >
                  {prompt.prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Verses List ──────────────────────────────────────────────────── */}
      {isFromReadingPlan ? (
        <View
          style={{ flex: 1, marginBottom: -80 }}
          {...panResponder.panHandlers}
        >
          <VerseList
            versesArray={versesArray}
            selectedVerses={selectedVerses}
            highlights={highlights}
            favorites={favorites}
            highlightedVerse={highlightedVerse}
            activeAudioVerse={activeAudioVerse}
            activeVerseWordMap={activeVerseWordMap}
            highlightAnim={highlightAnim}
            fadeAnim={fadeAnim}
            fontSize={fontSize}
            currentBook={currentBook}
            currentChapter={currentChapter}
            colors={COLORS}
            styles={styles}
            flatListRef={flatListRef as React.RefObject<any>}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onVersePress={verseNumber => {
              if (isGuest || showAudioPlayer) return;
              //make it handle the strong words when tapple to open the word study bottom sheet apply on word not the verse
            }}
            onRemoveHighlight={removeHighlight}
            onExplain={async vn => {
              if (isGuest) {
                showGate('Sign in to see explanations.');
                return;
              }
              const found = await getverseExplanation(
                [vn],
                currentBook,
                currentChapter,
              );
              if (found) clearSelection();
            }}
            onShare={vn => shareVerses([vn])}
            onCopy={vn => copyVerses([vn])}
            onDoubleTap={verseNumber => {
              openVerseMenu(verseNumber);
            }}
            onLongPress={vn =>
              guard(
                'Highlights are saved to your account. Sign in to use this feature.',
                () => {
                  setPendingVerses([vn]);
                  toggleVerseSelection(vn);
                  setShowHighlightPicker(true);
                },
              )
            }
            onCloseExplanation={vn => {
              clearVerseExplanationForVerse(vn);
            }}
            explanationMap={verseExplanationMap}
            onDailyVerse={vn => {
              getDailyVerseRef(vn, currentBook, currentChapter);
            }}
            onCloseDailyVerse={vn => {
              clearDailyVerseRef(vn);
            }}
            dailyVerseRefMap={dailyVerseRefMap}
            verseJournalPrompts={verseJournalPrompts}
            explainingVerse={explainingVerse}
            navigation={navigation}
            verseWordMap={verseWordMap}
            onWordPress={handleWordPress}
            studyToolHighlights={studyToolHighlights}
        />
      </View>
    ) : (
      <VerseList
          versesArray={versesArray}
          selectedVerses={selectedVerses}
          highlights={highlights}
          favorites={favorites}
          highlightedVerse={highlightedVerse}
          activeAudioVerse={activeAudioVerse}
          activeVerseWordMap={activeVerseWordMap}
          highlightAnim={highlightAnim}
          fadeAnim={fadeAnim}
          fontSize={fontSize}
          navigation={navigation}
          currentBook={currentBook}
          currentChapter={currentChapter}
          colors={COLORS}
          styles={styles}
          flatListRef={flatListRef as React.RefObject<any>}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onVersePress={verseNumber => {
            if (isGuest || showAudioPlayer) return;
            toggleVerseSelection(verseNumber);
            addReadHistory(verseNumber);
          }}
          onRemoveHighlight={removeHighlight}
          onExplain={async vn => {
            if (isGuest) {
              showGate('Sign in to see explanations.');
              return;
            }
            const found = await getverseExplanation(
              [vn],
              currentBook,
              currentChapter,
            );
            if (found) clearSelection();
          }}
          onShare={vn => shareVerses([vn])}
          onCopy={vn => copyVerses([vn])}
          onDoubleTap={verseNumber => {
            openVerseMenu(verseNumber);
          }}
          onCloseExplanation={vn => {
            clearVerseExplanationForVerse(vn);
          }}
          explanationMap={verseExplanationMap}
          onDailyVerse={vn => {
            getDailyVerseRef(vn, currentBook, currentChapter);
          }}
          onCloseDailyVerse={vn => {
            clearDailyVerseRef(vn);
          }}
          dailyVerseRefMap={dailyVerseRefMap}
          verseJournalPrompts={verseJournalPrompts}
          explainingVerse={explainingVerse}
          verseWordMap={verseWordMap}
          onWordPress={handleWordPress}
          studyToolHighlights={studyToolHighlights}
        />
      )}

      {/* ── Reflection Questions Panel (from Reading Plan) ──────────────── */}
      {isFromReadingPlan && rpStyles && (
        <View style={rpStyles.wrapper}>
          {/* Toggle bar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={toggleReflection}
            style={[
              rpStyles.toggleButton,
              reflectionOpen && {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              },
            ]}
          >
            <View style={rpStyles.toggleLeft}>
              <View style={rpStyles.iconCircle}>
                <Lightbulb size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rpStyles.toggleTitle}>
                  {planTitle ||
                    translations?.bible?.readingPlan ||
                    'Reading Plan'}{' '}
                  — {translations?.bible?.reflections || 'Reflections'}
                </Text>
                <Text style={rpStyles.toggleSubtitle}>
                  {dayTitle ||
                    `${translations?.bible?.day || 'Day'} ${routeParams.day || ''}`}
                </Text>
              </View>
            </View>
            <View style={rpStyles.toggleArrow}>
              {reflectionOpen ? (
                <ChevronDown size={20} color="#FFFFFF" />
              ) : (
                <ChevronUp size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded reflection cards */}
          {reflectionOpen && (
            <ScrollView
              style={rpStyles.listContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {reflectionQuestions.map((q: string, idx: number) => (
                <View
                  key={idx}
                  style={[
                    rpStyles.card,
                    {
                      backgroundColor: COLORS.cardBackground,
                      borderColor: COLORS.border,
                    },
                  ]}
                >
                  <View style={rpStyles.cardTopRow}>
                    <View style={rpStyles.numBadge}>
                      <Text style={rpStyles.numText}>{idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate(route.journalEntry, {
                          bookName: currentBook,
                          chapter: currentChapter,
                          promptText: q,
                        });
                      }}
                      style={[
                        rpStyles.journalLink,
                        { backgroundColor: COLORS.primary + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          rpStyles.journalLinkText,
                          { color: COLORS.primary },
                        ]}
                      >
                        {translations?.bible?.journal || 'Journal'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      rpStyles.questionText,
                      { color: COLORS.textSecondary },
                    ]}
                  >
                    {q}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <HighlightPickerModal
        visible={showHighlightPicker}
        onClose={() => {
          setShowHighlightPicker(false);
          setPendingVerses([]);
          clearSelection();
        }}
        isDark={isDark}
        selectedVerses={selectedVerses}
        totalVerses={Object.keys(verses).length}
        onSelectColor={(colorId, color, rangeStart, rangeEnd) => {
          setShowHighlightPicker(false);
          highlightVerses(colorId, color, rangeStart, rangeEnd);
          setPendingVerses([]);
          clearSelection();
        }}
      />

      {/* DrawerMenu — guests can only change version; nav items are gated inside */}
      <DrawerMenu
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        bibleVersionId={bibleVersionId}
        onVersionChange={handleVersionChange}
        showVersionPicker={showVersionPicker}
        onToggleVersionPicker={() => setShowVersionPicker(v => !v)}
        navigation={navigation}
        isDark={isDark}
        isGuest={isGuest}
        onGuestNavPress={() => {
          setShowDrawer(false);
          setTimeout(
            () =>
              showGate(
                'My Highlights, Notes, History and Favourites require a free account.',
              ),
            300,
          );
        }}
      />

      <NoteModal
        visible={showNoteModal}
        onClose={closeNoteModal}
        onSave={(rangeStart, rangeEnd) => saveNote(rangeStart, rangeEnd)}
        noteText={noteText}
        onNoteChange={setNoteText}
        saving={noteSaving}
        selectedVerses={selectedVerses}
        totalVerses={Object.keys(verses).length}
        currentBook={currentBook}
        currentChapter={currentChapter}
        isDark={isDark}
      />

      {/* ── Verse Side Menu ──────────────────────────────────────────────── */}
      <VerseSideMenu
        visible={verseMenuVisible}
        verseNumber={verseMenuVerse ?? 0}
        verseText={verseMenuVerse ? verses[verseMenuVerse]?.text ?? '' : ''}
        navigation={navigation}
        currentBook={currentBook}
        currentChapter={currentChapter}
        isDark={isDark}
        isRtl={isRtl}
        isGuest={isGuest}
        onClose={closeVerseMenu}
        onGuestAction={handleVerseMenuGuestAction}
        selectedCount={selectedVerses.length}
        selectedVerses={selectedVerses}
        totalVerses={Object.keys(verses).length}
        onRangeChange={(start, end) => setVerseRangeSelection(start, end)}
        onListen={() =>
          guard('Audio narration requires a free account.', () => {
            const current = getVerseMenuSelection();
            clearSelection();
            startReadingSelectedVerses(current);
          })
        }
        onJournal={() =>
          guard(
            'Journal entries are saved to your account. Sign in to use this feature.',
            () => {
              const verses = getVerseMenuSelection();
              const v = verses[0] ?? 1;
              clearSelection();
              navigation.navigate(route.journalEntry, {
                bookName: currentBook,
                chapter: currentChapter,
                verseStart: v,
                verseEnd: v,
              });
            },
          )
        }
        onExplain={async () => {
          const verses = getVerseMenuSelection();
          if (verses.length > 0) {
            await getverseExplanation(verses, currentBook, currentChapter);
          }
        }}
        onHighlight={() =>
          guard(
            'Highlights are saved to your account. Sign in to use this feature.',
            () => {
              const verses = getVerseMenuSelection();
              setPendingVerses(verses);
              if (verses.length === 1) setVerseRangeSelection(verses[0], verses[0]);
              setShowHighlightPicker(true);
            },
          )
        }
        onNote={() =>
          guard(
            'Notes are saved to your account. Sign in to use this feature.',
            () => {
              const verses = getVerseMenuSelection();
              setPendingVerses(verses);
              if (verses.length === 1) setVerseRangeSelection(verses[0], verses[0]);
              openNoteModal();
            },
          )
        }
        onFavorite={() =>
          guard(
            'Favourites are saved to your account. Sign in to use this feature.',
            () => {
              const verses = getVerseMenuSelection();
              clearSelection();
              addFavorite(verses);
            },
          )
        }
        onShare={() =>
          guard('Sharing requires a free account.', () => {
            const verses = getVerseMenuSelection();
            clearSelection();
            shareVerses(verses);
          })
        }
        onCopy={() =>
          guard('Copying requires a free account.', () => {
            const verses = getVerseMenuSelection();
            clearSelection();
            copyVerses(verses);
          })
        }
        onOpenNoteModal={(verseNumber) => {
          guard(
            'Notes are saved to your account. Sign in to use this feature.',
            () => {
              setPendingVerses([verseNumber]);
              setVerseRangeSelection(verseNumber, verseNumber);
              openNoteModal();
            },
          );
        }}
        onOpenHighlightPicker={(verseNumber) => {
          guard(
            'Highlights are saved to your account. Sign in to use this feature.',
            () => {
              setPendingVerses([verseNumber]);
              setVerseRangeSelection(verseNumber, verseNumber);
              setShowHighlightPicker(true);
            },
          );
        }}
        onOpenWordStudy={(verseNumber) => {
          const words = verseWordMap[verseNumber];
          if (words && words.length > 0) {
            handleWordPress(words[0]);
          }
        }}
        onOpenStudyTools={(verses) => {
          setStudyToolsSelectedVerses(verses);
          setShowStudyTools(true);
        }}
      />

      {/* ── Word Study Bottom Sheet (Strong's Concordance) ──────────────── */}
      <WordStudyBottomSheet
        visible={showWordStudy}
        word={selectedWord}
        entry={selectedWordEntry}
        loading={wordStudyLoading}
        isDark={isDark}
        onClose={() => setShowWordStudy(false)}
        onSearchAllUses={(strongsId, word) => {
          setShowWordStudy(false);
          const englishWord = (word ?? strongsId ?? '').trim();
          if (englishWord.length > 0) {
            navigation.navigate(route.search, { word: englishWord, scope: 'bible', strongsId: strongsId || undefined });
          } else if (strongsId) {
            navigation.navigate(route.search, { strongsId, scope: 'strongs' });
          }
        }}
        onSaveWord={entry => {
          // Future: persist saved word to user account
          setShowWordStudy(false);
        }}
      />

      {/* ── Chapter Study Tools Sheet ───────────────────────────────────── */}
      <ChapterStudyToolsSheet
        visible={showStudyTools}
        onClose={() => setShowStudyTools(false)}
        bookName={currentBook}
        chapter={currentChapter}
        selectedVerses={studyToolsSelectedVerses}
        onScrollToVerse={(verse) => {
          flatListRef.current?.scrollToIndex({
            index: Math.max(0, verse - 1),
            animated: true,
          });
        }}
        onOpenInLab={(bookName, chapter, verseRefs) => {
          if (!hasAccess('legacy_sower')) { navigation.navigate(route.sower); return; }
          navigation.navigate('LabFlow', {
            bookName,
            chapter,
            verseStart: verseRefs[0]?.verse ?? 1,
            verseEnd: verseRefs[verseRefs.length - 1]?.verse ?? 1,
          });
        }}
        onOpenBookContext={(bookName) => {
          if (!hasAccess('legacy_sower')) { navigation.navigate(route.sower); return; }
          navigation.navigate('LabFlow', {
            bookName,
            chapter: currentChapter,
            verseStart: 1,
            verseEnd: 1,
            stage: 'learn',
            learnTab: 'prologue',
          });
        }}
        onShowInReader={(label, color, verseRefs) => {
          const next = verseRefs.reduce((acc, ref) => {
            acc[ref.verse] = { label, color };
            return acc;
          }, {} as Record<number, { label: string; color: string }>);
          setStudyToolHighlights(next);
          const first = verseRefs[0]?.verse;
          if (first) {
            flatListRef.current?.scrollToIndex({
              index: Math.max(0, first - 1),
              animated: true,
            });
          }
        }}
      />

      {/* ── Translation Picker ──────────────────────────────────────────── */}
      <TranslationPickerModal
        visible={showTranslationPicker}
        onClose={() => setShowTranslationPicker(false)}
        currentVersionId={bibleVersionId}
        onSelectVersion={handleVersionChange}
        isDark={isDark}
        freeTranslationsOnly={freeTranslationsOnly}
      />

      {/* ── Guest banner (auto nudge + gated action trigger) ────────────── */}
      <GuestBanner
        triggered={gateVisible}
        triggerMessage={gateMessage}
        onTriggeredDismiss={hideGate}
      />

      {/* ── AudioControlBar ───────────────────────────────────────────────── */}
      <AudioControlBar
        isPlaying={showAudioPlayer}
        isPaused={isAudioPaused}
        nowPlayingLabel={`${currentBook} ${currentChapter}:${activeAudioVerse ?? ''}`}
        scope={audioScope}
        afterPlay={afterPlayBehaviour}
        isRepeat={
          afterPlayBehaviour === 'repeat' || afterPlayBehaviour === 'repeat_one'
        }
        verseIndex={audioVerseIndex}
        verseCount={audioPlaylist.length}
        isDark={isDark}
        speechRate={speechRate}
        sleepTimerRemaining={sleepTimerRemaining}
        onSpeedToggle={onSpeedToggle}
        onSpeedReset={onSpeedReset}
        onSleepTimerToggle={onSleepTimerToggle}
        onPrev={goToPreviousSelectedVerse}
        onNext={goToNextSelectedVerse}
        onRepeatToggle={() => {
          // Cycle through: stop → repeat_one → repeat → continue → stop
          const current = afterPlayBehaviour;
          if (current === 'stop') handleAfterPlayChange('repeat_one');
          else if (current === 'repeat_one') handleAfterPlayChange('repeat');
          else if (current === 'repeat') handleAfterPlayChange('continue');
          else handleAfterPlayChange('stop');
        }}
        onPlayPause={handleAudioTogglePlayPause}
        onStop={handleAudioStop}
        onScopeChange={handleAudioScopeChange}
        onAfterPlayChange={handleAfterPlayChange}
      />

      {/* ── App feedback modal ───────────────────────────────────────────── */}
      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal?.severity}
        onConfirm={dismissModal}
      />
      </>
      )}

      {/* ── Bottom Tab — navigation gated for guests ─────────────────────── */}
      {!isFromReadingPlan && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            transform: [
              {
                translateY: tabBarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: tabBarAnimation,
          }}
        >
          <BottomTab
            activeTab="bible"
            setActiveTab={() => {}}
            isGuest={isGuest}
            onGuestTabPress={() =>
              showGate(
                'login or create a free account to access Home, Favourites, Plans and your Profile.',
              )
            }
          />
        </Animated.View>
      )}

    </View>
  );
}

function VerseRefText({
  text,
  onPress,
  COLORS,
  isDark,
  isRtl,
}: {
  text: string;
  onPress: (ref: VerseRef) => void;
  COLORS: ReturnType<typeof getColors>;
  isDark: boolean;
  isRtl?: boolean;
}) {
  const segments = useMemo(() => parseVerseRefs(text), [text]);

  return (
    <View
      style={[
        vrStyles.container,
        { flexDirection: isRtl ? 'row-reverse' : 'row' },
      ]}
    >
      {segments.map((seg, idx) => {
        if (typeof seg === 'string') {
          return (
            <Text key={idx} style={[vrStyles.base, { color: COLORS.text }]}>
              {seg}
            </Text>
          );
        }

        return (
          <TouchableOpacity
            key={idx}
            onPress={() => onPress(seg)}
            activeOpacity={0.7}
            style={[
              vrStyles.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(240,180,41,0.15)'
                  : 'rgba(155,106,0,0.10)',
                borderColor: isDark
                  ? 'rgba(240,180,41,0.45)'
                  : 'rgba(155,106,0,0.35)',
              },
            ]}
          >
            <BookOpen
              size={11}
              color={isDark ? '#F0B429' : '#9B6A00'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                vrStyles.chipText,
                { color: isDark ? '#F0B429' : '#9B6A00' },
              ]}
            >
              {seg.ref}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const vrStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  base: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm + 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: FONT_SIZES.xs + 1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

function BibleSkeleton({ isDark }: { isDark: boolean }) {
  const c = getColors(isDark);
  const mutedBg = isDark ? '#2A2A2A' : '#E5E5E5';

  const skeletonLine = (h: number, w: string | number, style?: any) => (
    <View
      style={[{ height: h, width: w as any, borderRadius: 6, backgroundColor: mutedBg, opacity: 0.5 }, style]}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 50 }}>
      {/* Header skeleton */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {skeletonLine(32, 32, { borderRadius: 8 })}
          <View style={{ gap: 4 }}>
            {skeletonLine(14, 120)}
            {skeletonLine(10, 80)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {skeletonLine(32, 32, { borderRadius: 8 })}
          {skeletonLine(32, 32, { borderRadius: 8 })}
        </View>
      </View>

      {/* Chapter nav skeleton */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {skeletonLine(28, 28, { borderRadius: 14 })}
        <View style={{ alignItems: 'center', gap: 3 }}>
          {skeletonLine(12, 100)}
          {skeletonLine(9, 60)}
        </View>
        {skeletonLine(28, 28, { borderRadius: 14 })}
      </View>

      {/* Verse cards skeleton */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {skeletonLine(18, 24, { borderRadius: 4 })}
              <View style={{ flex: 1, gap: 6 }}>
                {skeletonLine(14, '95%')}
                {skeletonLine(14, '75%')}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function useRpStyles(isRtl: boolean) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      zIndex: 100,
      elevation: 10,
    },
    toggleButton: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F59E0B',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderTopRightRadius: BORDER_RADIUS.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    toggleLeft: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    },
    toggleArrow: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: isRtl ? 0 : SPACING.sm,
      marginRight: isRtl ? SPACING.sm : 0,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    toggleSubtitle: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '600',
      marginTop: 2,
    },
    listContent: {
      maxHeight: 320,
      backgroundColor: '#F59E0B',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
      gap: SPACING.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
    },
    card: {
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    cardTopRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    numBadge: {
      width: 24,
      height: 24,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
    },
    numText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    journalLink: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.round,
    },
    journalLinkText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },
    questionText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '500',
      lineHeight: 22,
    },
  });
}
