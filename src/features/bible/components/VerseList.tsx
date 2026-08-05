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

import React from 'react';
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
