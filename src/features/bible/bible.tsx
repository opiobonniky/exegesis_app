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
} from 'react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
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
import LinearGradient from 'react-native-linear-gradient';

import {
  BibleHeader,
  ChapterNavigation,
  SelectionActionBar,
  VerseList,
  AudioControlBar,
} from './components';

import {
  BookSelectorModal,
  ChapterSelectorModal,
  HighlightPickerModal,
  SearchModal,
  DrawerMenu,
  NoteModal,
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

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const reflectionOpenRef = useRef(false);

  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  const closeReflection = useCallback(() => {
    if (!reflectionOpenRef.current) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reflectionOpenRef.current = false;
    setReflectionOpen(false);
  }, []);

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
  } = useBible();

  // ── Load chapter journal prompts whenever book/chapter/auth changes ─────────
  // (must live here — after useBible() — so currentBook, currentChapter,
  //  loadChapterPrompts, and isGuest are all initialised before the deps array
  //  is evaluated, avoiding the Hermes TDZ ReferenceError)
  useEffect(() => {
    if (!isGuest) {
      loadChapterPrompts();
    }
  }, [currentBook, currentChapter, isGuest]);

  const handleVerseRefPress = useCallback(
    (ref: VerseRef) => {
      navigation.navigate(route.fullVerseExplanation, {
        bookName: ref.bookName,
        chapter: ref.chapter,
        verseNumber: ref.verseNumber,
      });
    },
    [navigation],
  );

  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  // ── Guest gate state ──────────────────────────────────────────────────────
  const [gateVisible, setGateVisible] = useState(false);
  const [gateMessage, setGateMessage] = useState('');
  const [explanationOpen, setExplanationOpen] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      return () => {
        handleAudioStop();
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <BibleHeader
        book={currentBook}
        chapter={currentChapter}
        version={activeVersion}
        isDark={isDark}
        onMenuPress={() => {
          clearSelection();
          setShowDrawer(true);
        }}
        onBookPress={() => setShowBookSelector(true)} // ✅ allowed
        onSearchPress={() =>
          guard('Search requires an account to save your search history.', () =>
            setShowSearchModal(true),
          )
        }
      />

      {/* ── Chapter Navigation ───────────────────────────────────────────── */}
      <ChapterNavigation
        currentChapter={currentChapter}
        maxChapters={maxChapters}
        isDark={isDark}
        isAudioPlaying={showAudioPlayer}
        onPrev={() => goToChapter('prev')} // ✅ allowed
        onNext={() => goToChapter('next')} // ✅ allowed
        onSelectChapter={() => setShowChapterSelector(true)} // ✅ allowed
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
              Chapter Reflections
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
              <Text style={styles.addJournalBtnText}>+ Add</Text>
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

      {/* ── Selection Action Bar ─────────────────────────────────────────── */}
      {selectedVerses.length > 0 && !explanationOpen && (
        <SelectionActionBar
          selectedCount={selectedVerses.length}
          selectedVerses={selectedVerses}
          totalVerses={Object.keys(verses).length}
          onRangeChange={(start, end) => setVerseRangeSelection(start, end)}
          isDark={isDark}
          onListen={() =>
            guard('Audio narration requires a free account.', () => {
              const current = [...selectedVerses];
              clearSelection();
              startReadingSelectedVerses(current);
            })
          }
          onHighlight={() =>
            guard(
              'Highlights are saved to your account. Sign in to use this feature.',
              () => {
                setPendingVerses([...selectedVerses]);
                clearSelection();
                setShowHighlightPicker(true);
              },
            )
          }
          onNote={() =>
            guard(
              'Notes are saved to your account. Sign in to use this feature.',
              () => {
                setPendingVerses([...selectedVerses]);
                clearSelection();
                openNoteModal();
              },
            )
          }
          onFavorite={() =>
            guard(
              'Favourites are saved to your account. Sign in to use this feature.',
              () => {
                const current = [...selectedVerses];
                clearSelection();
                addFavorite(current);
              },
            )
          }
          onShare={() =>
            guard('Sharing requires a free account.', () => {
              const current = [...selectedVerses];
              clearSelection();
              shareVerses(current);
            })
          }
          onCopy={() =>
            guard('Copying requires a free account.', () => {
              const current = [...selectedVerses];
              clearSelection();
              copyVerses(current);
            })
          }
          onClear={() => {
            clearSelection();
            setExplanationOpen(false);
          }}
          onJournal={() =>
            guard(
              'Journal entries are saved to your account. Sign in to use this feature.',
              () => {
                const current = [...selectedVerses];
                const startVerse = Math.min(...current);
                const endVerse = Math.max(...current);
                clearSelection();
                navigation.navigate(route.journalEntry, {
                  bookName: currentBook,
                  chapter: currentChapter,
                  verseStart: startVerse,
                  verseEnd: current.length > 1 ? endVerse : startVerse,
                });
              },
            )
          }
        />
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
              if (isGuest) return;
              toggleVerseSelection(verseNumber);
              addReadHistory(verseNumber);
            }}
            onRemoveHighlight={removeHighlight}
            onExplain={vn => {
              getverseExplanation([vn], currentBook, currentChapter);
            }}
            onCloseExplanation={vn => {
              clearVerseExplanationForVerse(vn);
              setExplanationOpen(false);
            }}
            onExplainOpen={() => setExplanationOpen(true)}
            explanationMap={verseExplanationMap}
            verseJournalPrompts={verseJournalPrompts}
            navigation={navigation}
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
            if (isGuest) return;
            toggleVerseSelection(verseNumber);
            addReadHistory(verseNumber);
          }}
          onRemoveHighlight={removeHighlight}
          onExplain={vn => {
            getverseExplanation([vn], currentBook, currentChapter);
          }}
          onCloseExplanation={vn => {
            clearVerseExplanationForVerse(vn);
            setExplanationOpen(false);
          }}
          onExplainOpen={() => setExplanationOpen(true)}
          explanationMap={verseExplanationMap}
          verseJournalPrompts={verseJournalPrompts}
          navigation={navigation}
        />
      )}

      {/* ── Modals (book/chapter selectors always open for guests) ────────── */}

      <BookSelectorModal
        visible={showBookSelector}
        onClose={() => setShowBookSelector(false)}
        books={books}
        currentBook={currentBook}
        isDark={isDark}
        onSelectBook={book => selectBookFromModal(book)}
      />

      <ChapterSelectorModal
        visible={showChapterSelector}
        onClose={() => setShowChapterSelector(false)}
        maxChapters={maxChapters}
        currentChapter={currentChapter}
        isDark={isDark}
        onSelectChapter={ch => selectChapterFromModal(ch)}
      />

      <HighlightPickerModal
        visible={showHighlightPicker}
        onClose={() => setShowHighlightPicker(false)}
        isDark={isDark}
        selectedVerses={selectedVerses}
        totalVerses={Object.keys(verses).length}
        onSelectColor={(colorId, color, rangeStart, rangeEnd) => {
          setShowHighlightPicker(false);
          highlightVerses(colorId, color, rangeStart, rangeEnd);
        }}
      />

      <SearchModal
        visible={showSearchModal}
        onClose={closeSearch}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        searchResults={searchResults}
        onSelectResult={goToVerse}
        loading={searchLoading}
        versionName={activeVersion.name}
        versionAbbreviation={activeVersion.abbreviation}
        isDark={isDark}
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
        nowPlayingLabel={`${currentBook} ${currentChapter}:${audioPlaylist[audioVerseIndex]?.num || ''}`}
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
        severity={modal.severity}
        onConfirm={dismissModal}
      />
    </View>
  );
}

function VerseRefText({
  text,
  onPress,
  COLORS,
  isDark,
}: {
  text: string;
  onPress: (ref: VerseRef) => void;
  COLORS: ReturnType<typeof getColors>;
  isDark: boolean;
}) {
  const segments = useMemo(() => parseVerseRefs(text), [text]);

  return (
    <View style={vrStyles.container}>
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

const rpStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F59E0B',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  listContent: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
    gap: SPACING.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  cardTopRow: {
    flexDirection: 'row',
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
});
