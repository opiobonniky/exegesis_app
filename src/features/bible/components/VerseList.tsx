/**
 * VerseList.tsx
 *
 * Changes vs original:
 *  1. Animated shimmer skeleton while loading.
 *  2. Pull-to-refresh via RefreshControl.
 *  3. activeWordOffset prop removed — word-level highlighting was removed
 *     because device TTS progress events are not accurate enough to stay
 *     in sync. Verse-level glow + scroll give reliable visual feedback.
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VerseCard from './VerseCard';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import {
  StrongsWordData,
  StrongsEntry,
} from '../../../services/strongsService';
import { BookPrologue } from '../../../services/bookProloguesApi';

// ─────────────────────────────────────────────────────────────────────────────
// Static skeleton (no Animated — avoids RN 0.76+ frozen JSI node crash)
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBar({
  width,
  height = 12,
  style,
}: {
  width: string | number;
  height?: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(150,150,150,0.15)',
          opacity: 0.5,
        },
        style,
      ]}
    />
  );
}

function SkeletonCard({ lineWidths, colors }: { lineWidths: string[]; colors: any }) {
  return (
    <View
      style={[
        skeletonStyles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      <SkeletonBar width={32} height={10} style={{ marginBottom: 10 }} />
      {lineWidths.map((w, i) => (
        <SkeletonBar
          key={i}
          width={w}
          height={11}
          style={{ marginBottom: i < lineWidths.length - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
});

// ── Section heading (centered, e.g. “The Garden of Eden”) ────────────────────
const headingStyles = StyleSheet.create({
  heading: {
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
});

const SKELETON_CONFIGS: string[][] = [
  ['90%', '75%', '60%'],
  ['85%', '100%'],
  ['70%', '88%', '55%'],
  ['95%', '80%'],
  ['78%', '92%', '65%'],
  ['88%', '72%'],
  ['100%', '84%', '58%'],
  ['76%', '90%'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Content-aware reading tracking.
// A verse is "read" once it has stayed visible for a duration scaled to its
// word count. This distinguishes genuine reading from a fast flick to the end
// (fast scrolls never accumulate enough view time) while letting long verses
// require proportionally more on-screen time.
// ─────────────────────────────────────────────────────────────────────────────
const READ_TICK_MS = 250; // how often we accumulate visible time
const MS_PER_WORD = 250; // nominal reading time per word (~240wpm)
const MIN_READ_MS = 1500; // floor for very short verses
const MAX_READ_MS = 20000; // ceiling for very long verses
// A verse only counts after it is BOTH mostly on screen AND stays there long
// enough to genuinely read it. waitForInteraction prevents counting anything
// before the user actually scrolls (no auto-marking on chapter open).
const VIEWABILITY_CONFIG = {
  // A verse counts once it covers a meaningful slice of the viewport. Fully
  // visible items are always considered viewable (handles short verses), and
  // tall/long verses still qualify once they cover half the screen.
  viewAreaCoveragePercentThreshold: 50,
  waitForInteraction: true,
  minimumViewTime: 500,
};

const computeReadThreshold = (words: number): number =>
  Math.min(MAX_READ_MS, Math.max(MIN_READ_MS, words * MS_PER_WORD));

type ReadProgress = {
  visible: boolean;
  accumulated: number;
  threshold: number;
  read: boolean;
};

export function SkeletonLoader({ colors }: { colors: any }) {
  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm }}>
      {SKELETON_CONFIGS.map((lines, i) => (
        <SkeletonCard key={i} lineWidths={lines} colors={colors} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type VerseItem = {
  num: number;
  text: string;
};

export type VerseListProps = {
  versesArray: { num: number; text: string }[];
  selectedVerses: number[];
  /**
   * Keyed by book, chapter, and verse so highlights do not leak across chapters.
   */
  highlights: Record<string, { colorId?: number; color?: string }>;
  /**
   * Set of verse NUMBERS. Matches useBible's Set<number> state.
   */
  favorites: Set<number>;
  highlightedVerse: number | null;
  activeAudioVerse: number | null;
  activeVerseWordMap: Array<{ start: number; length: number }> | null;
  highlightAnim: Animated.Value;
  fadeAnim: Animated.Value;
  fontSize: number;
  currentBook: string;
  currentChapter: number;
  /** Section headings keyed to the verse where they apply (from backend). */
  chapterHeadings?: Array<{ verse: number; heading: string }>;
  colors: any;
  styles: any;
  flatListRef: React.RefObject<FlatList<VerseItem>>;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  /** Fired once a verse has been visibly read for a content-aware dwell time. */
  onVerseRead?: (verseNumber: number) => void;
  /** When false, reading-time accumulation is paused (e.g. screen unfocused or audio playing). */
  isActive?: boolean;
  onVersePress: (verseNumber: number) => void;
  onRemoveHighlight: (verseNumber: number) => void;
  /** When true, the single-verse action card is suppressed (multi-select bar shows instead). */
  multiSelectMode?: boolean;
  onExplain?: (verseNumber: number) => void;
  /** Contextual action card handlers (Strong's, Background, Study Tools, Journal). */
  onStrongs?: (verseNumber: number) => void;
  onBackground?: (verseNumber: number) => void;
  onStudyTools?: (verseNumber: number) => void;
  onJournal?: (verseNumber: number) => void;
  onLongPress?: (verseNumber: number) => void;
  onDoubleTap?: (verseNumber: number) => void;
  explanationMap?: Record<number, { explanation: string; learnMore: string }>;
  verseJournalPrompts?: Record<number, any[]>;
  onDailyVerse?: (verseNumber: number) => void;
  onCloseDailyVerse?: (verseNumber: number) => void;
  dailyVerseRefMap?: Record<number, { reflection?: string; explanation?: string; learnMore?: string }>;
  navigation?: any;
  explainingVerse?: number | null;
  /** Word-level Strong's concordance data keyed by verse number */
  verseWordMap?: Record<number, StrongsWordData[]>;
  /** Called when user taps a word that has Strong's data */
  onWordPress?: (word: StrongsWordData) => void;
  studyToolHighlights?: Record<number, { label: string; color: string }>;
  /** Inline Strong's panel data keyed by verse number. */
  strongsMap?: Record<
    number,
    { word: StrongsWordData; entry: StrongsEntry | null; loading: boolean }
  >;
  onCloseStrongs?: (verseNumber: number) => void;
  /** Inline Background panel data keyed by verse number. */
  backgroundMap?: Record<
    number,
    {
      background: string | null;
      prologue: BookPrologue | null;
      loading: boolean;
    }
  >;
  onCloseBackground?: (verseNumber: number) => void;
  /** Verse number whose inline Journal panel is open (or null). */
  journalOpenVerse?: number | null;
  /** Chapter journal prompts used by the inline per-verse Journal panel. */
  chapterJournalPrompts?: Array<{ id: number; prompt: string }>;
  onCloseJournal?: (verseNumber: number) => void;
  onOpenFullJournal?: (verseNumber: number) => void;
  /** Optional element rendered after the last verse (e.g. end-of-chapter journaling). */
  listFooter?: React.ReactElement | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// VerseList
// ─────────────────────────────────────────────────────────────────────────────

export default function VerseList({
  versesArray,
  selectedVerses,
  highlights,
  favorites,
  highlightedVerse,
  activeAudioVerse,
  activeVerseWordMap,
  highlightAnim,
  fadeAnim,
  fontSize,
  currentBook,
  currentChapter,
  chapterHeadings = [],
  colors,
  styles,
  flatListRef,
  loading = false,
  refreshing = false,
  onRefresh,
  onScroll,
  scrollEventThrottle,
  onVerseRead,
  isActive = true,
  onVersePress,
  onRemoveHighlight,
  multiSelectMode = false,
  onExplain,
  onStrongs,
  onBackground,
  onStudyTools,
  onJournal,
  onDoubleTap,
  onLongPress,
  explanationMap,
  verseJournalPrompts = {},
  navigation,
  onDailyVerse,
  onCloseDailyVerse,
  dailyVerseRefMap,
  explainingVerse,
  verseWordMap,
  onWordPress,
  studyToolHighlights = {},
  strongsMap,
  onCloseStrongs,
  backgroundMap,
  onCloseBackground,
  journalOpenVerse,
  chapterJournalPrompts,
  onCloseJournal,
  onOpenFullJournal,
  listFooter,
}: VerseListProps) {
  // ── Content-aware reading tracker ─────────────────────────────────────────
  // Reset per chapter (new verses array => fresh progress map).
  const readProgressRef = useRef<Record<number, ReadProgress>>({});
  useEffect(() => {
    const progress: Record<number, ReadProgress> = {};
    for (const v of versesArray) {
      const words = v.text.trim().split(/\s+/).filter(Boolean).length;
      progress[v.num] = {
        visible: false,
        accumulated: 0,
        threshold: computeReadThreshold(words),
        read: false,
      };
    }
    readProgressRef.current = progress;
  }, [versesArray]);

  const onVerseReadRef = useRef(onVerseRead);
  onVerseReadRef.current = onVerseRead;

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const lastVerseNumRef = useRef<number | null>(null);
  lastVerseNumRef.current =
    versesArray.length > 0
      ? versesArray[versesArray.length - 1].num
      : null;

  const fireRead = (cb: ((n: number) => void) | undefined, num: number) => {
    // Only fire once per verse even if it leaves/re-enters repeatedly.
    const p = readProgressRef.current[num];
    if (!p || p.read) return;
    p.read = true;
    cb?.(num);
  };

  // A verse counts as read ONLY when it is scrolled past (leaves the view)
  // after it has spent at least its content-aware dwell time on screen. This
  // prevents a stationary screenful of verses from being marked read in
  // parallel — parking on a chapter no longer inflates the percentage.
  const viewableRef = useRef<{
    onViewableItemsChanged: ({ viewableItems }: any) => void;
  } | null>(null);
  if (!viewableRef.current) {
    viewableRef.current = {
      onViewableItemsChanged: ({ viewableItems }: any) => {
        const progress = readProgressRef.current;
        const cb = onVerseReadRef.current;
        const visible = new Set<number>();
        for (const v of viewableItems) {
          if (v?.isViewable && v.item?.num != null) visible.add(v.item.num);
        }
        for (const key of Object.keys(progress)) {
          const num = Number(key);
          const p = progress[num];
          if (p.visible && !visible.has(num)) {
            // Verse left the view — the user scrolled past it. Count it only
            // if enough time was actually spent dwelling on it, then reset so
            // a fast re-glance cannot double-count.
            if (p.accumulated >= p.threshold) {
              p.read = true;
              cb?.(num);
            }
            p.accumulated = 0; // restart if it comes back into view
          }
          p.visible = visible.has(num);
        }
      },
    };
  }

  // Accumulate view time every tick for verses still on screen. Paused while
  // the screen is inactive (unfocused or audio) so backgrounding never
  // inflates the counts. The only verses reported here are those left at the
  // very bottom of the chapter — the reader finishes and never scrolls past
  // the last verse, so it is counted once dwelled on.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isActiveRef.current) return;
      const progress = readProgressRef.current;
      const cb = onVerseReadRef.current;
      const lastNum = lastVerseNumRef.current;
      for (const key of Object.keys(progress)) {
        const num = Number(key);
        const p = progress[num];
        if (p.read || !p.visible) continue;
        p.accumulated += READ_TICK_MS;
        if (p.accumulated >= p.threshold && num === lastNum) {
          fireRead(cb, num);
        }
      }
    }, READ_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const renderVerseItem = ({
    item,
  }: {
    item: { num: number; text: string };
  }) => {
    const { num, text } = item;
    const verseNum = num;
    const verseNumber = verseNum;
    const isSelected = selectedVerses.includes(verseNumber);
    // favorites is Set<number> from useBible — check by verse number directly.
    const isFavorite = (favorites as unknown as Set<number>).has(verseNumber);
    // Scope by full reference so Genesis 1:4 does not highlight Genesis 2:4.
    const highlightKey = `${currentBook}-${currentChapter}-${verseNumber}`;
    const highlight = highlights[highlightKey];
    const highlightColor = highlight?.color;
    const isTargetHighlight = highlightedVerse === verseNumber;
    const isActiveAudio = activeAudioVerse === verseNumber;
    const explanationData = explanationMap?.[verseNumber] ?? null;
    const dvData = dailyVerseRefMap?.[verseNumber];
    const shouldShowDvPanel = !!dvData;

    const showActions =
      !multiSelectMode && selectedVerses.length === 1 && isSelected;
    const isExplaining = explainingVerse === verseNumber;
    const studyToolHighlight = studyToolHighlights[verseNumber] ?? null;
    const sectionHeading = chapterHeadings.find(h => h.verse === verseNumber);

    return (
      <View key={verseNumber}>
        {sectionHeading ? (
          <Text
            style={[
              headingStyles.heading,
              {
                color: colors.text,
                fontSize: Math.max(fontSize - 1, 15),
              },
            ]}
          >
            {sectionHeading.heading}
          </Text>
        ) : null}
      <VerseCard
        verseNum={String(verseNum)}
        verseNumber={verseNumber}
        text={text}
        isSelected={isSelected}
        isFavorite={isFavorite}
        highlightColor={highlightColor}
        isTargetHighlight={isTargetHighlight}
        isActiveAudio={isActiveAudio}
        wordMap={isActiveAudio ? activeVerseWordMap : null}
        highlightAnim={highlightAnim}
        fontSize={fontSize}
        colors={colors}
        styles={styles}
        showActions={showActions}
        isExplaining={isExplaining}
        onPress={() => onVersePress(verseNumber)}
        onRemoveHighlight={onRemoveHighlight}
        onDoubleTap={onDoubleTap ? () => onDoubleTap(verseNumber) : undefined}
        onLongPress={onLongPress ? () => onLongPress(verseNumber) : undefined}
        onExplain={
          onExplain
            ? () => {
                onExplain(verseNumber);
              }
            : undefined
        }
        onStrongs={onStrongs ? () => onStrongs(verseNumber) : undefined}
        onBackground={onBackground ? () => onBackground(verseNumber) : undefined}
        onStudyTools={onStudyTools ? () => onStudyTools(verseNumber) : undefined}
        onJournal={onJournal ? () => onJournal(verseNumber) : undefined}
        onCloseStart={() => {
          // Scroll the verse back into view when its explanation panel closes.
          const index = versesArray.findIndex(v => v.num === verseNumber);
          if (index !== -1) {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0,
            });
          }
        }}
        explanationData={explanationData}
        onDailyVerse={onDailyVerse ? () => onDailyVerse(verseNumber) : undefined}
        onCloseDailyVerse={onCloseDailyVerse ? () => onCloseDailyVerse(verseNumber) : undefined}
        showDailyVerse={shouldShowDvPanel}
        dailyVerseData={dvData}
        journalPrompts={verseJournalPrompts[verseNumber] || []}
        navigation={navigation}
        currentBook={currentBook}
        currentChapter={currentChapter}
        studyToolHighlight={studyToolHighlight}
        verseWords={verseWordMap?.[verseNumber]}
        onWordPress={onWordPress}
        strongsData={strongsMap?.[verseNumber] ?? null}
        onCloseStrongs={
          onCloseStrongs ? () => onCloseStrongs(verseNumber) : undefined
        }
        backgroundData={backgroundMap?.[verseNumber] ?? null}
        onCloseBackground={
          onCloseBackground ? () => onCloseBackground(verseNumber) : undefined
        }
        journalOpen={
          journalOpenVerse != null && journalOpenVerse === verseNumber
        }
        onCloseJournal={
          onCloseJournal ? () => onCloseJournal(verseNumber) : undefined
        }
        chapterPrompts={chapterJournalPrompts || []}
        onOpenFullJournal={
          onOpenFullJournal ? () => onOpenFullJournal(verseNumber) : undefined
        }
      />
      </View>
    );
  };

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.cardBackground}
    />
  ) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={flatListRef}
          data={versesArray}
          extraData={[selectedVerses, activeAudioVerse, explanationMap, dailyVerseRefMap, verseJournalPrompts, chapterHeadings, strongsMap, backgroundMap, journalOpenVerse, chapterJournalPrompts]}
          renderItem={renderVerseItem}
          keyExtractor={item => String(item.num)}
          contentContainerStyle={[
            styles.scrollContent,
            versesArray.length === 0 && { flex: 1 },
          ]}
          refreshControl={refreshControl}
          ListEmptyComponent={
            loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : null
          }
          ListFooterComponent={
            listFooter ? (
              <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
                {listFooter}
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={21}
          removeClippedSubviews={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={
            viewableRef.current?.onViewableItemsChanged
          }
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.4,
              });
            }, 500);
          }}
        />
      </Animated.View>
    </View>
  );
}
