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
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import VerseCard from './VerseCard';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { StrongsWordData } from '../../../services/strongsService';

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────

function ShimmerBar({
  width,
  height = 12,
  shimmerX,
  containerWidth,
  style,
}: {
  width: string | number;
  height?: number;
  shimmerX: Animated.Value;
  containerWidth: number;
  style?: object;
}) {
  return (
    <View
      style={[
        shimmerStyles.barBase,
        { width, height, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          shimmerStyles.shimmerHighlight,
          {
            width: containerWidth * 0.55,
            transform: [{ translateX: shimmerX }],
          },
        ]}
      />
    </View>
  );
}

const shimmerStyles = StyleSheet.create({
  barBase: {
    overflow: 'hidden',
    backgroundColor: 'rgba(150,150,150,0.13)',
  },
  shimmerHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 99,
  },
});

function SkeletonCard({
  shimmerX,
  lineWidths,
  colors,
}: {
  shimmerX: Animated.Value;
  lineWidths: string[];
  colors: any;
}) {
  const CONTAINER_WIDTH = 340;
  return (
    <View
      style={[
        skeletonStyles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      <ShimmerBar
        width={32}
        height={10}
        shimmerX={shimmerX}
        containerWidth={CONTAINER_WIDTH}
        style={{ marginBottom: 10 }}
      />
      {lineWidths.map((w, i) => (
        <ShimmerBar
          key={i}
          width={w}
          height={11}
          shimmerX={shimmerX}
          containerWidth={CONTAINER_WIDTH}
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

function SkeletonLoader({ colors }: { colors: any }) {
  const shimmerX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 400,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm }}>
      {SKELETON_CONFIGS.map((lines, i) => (
        <SkeletonCard
          key={i}
          shimmerX={shimmerX}
          lineWidths={lines}
          colors={colors}
        />
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
   * Keyed by verse NUMBER (not a string key). Matches useBible's
   * Record<number, {colorId, color}> state.
   */
  highlights: Record<number, { colorId?: number; color?: string }>;
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
  onExplain?: (verseNumber: number) => void;
  onShare?: (verseNumber: number) => void;
  onCopy?: (verseNumber: number) => void;
  onLongPress?: (verseNumber: number) => void;
  onDoubleTap?: (verseNumber: number) => void;
  onCloseExplanation?: (verseNumber: number) => void;
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
  onExplain,
  onShare,
  onCopy,
  onDoubleTap,
  onLongPress,
  onCloseExplanation,
  explanationMap,
  verseJournalPrompts = {},
  navigation,
  onDailyVerse,
  onCloseDailyVerse,
  dailyVerseRefMap,
  explainingVerse,
  verseWordMap,
  onWordPress,
}: VerseListProps) {
  if (loading) {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SkeletonLoader colors={colors} />
      </Animated.View>
    );
  }

  const renderVerseItem = ({
    item,
  }: {
    item: { num: number; text: string };
  }) => {
    const { num, text } = item;
    const verseNum = num;
    const verseNumber = verseNum;
    const key = `${currentBook} ${currentChapter}:${verseNum}`;
    const isSelected = selectedVerses.includes(verseNumber);
    // favorites is Set<number> from useBible — check by verse number directly.
    const isFavorite = (favorites as unknown as Set<number>).has(verseNumber);
    // highlights is Record<number, {colorId, color}> from useBible — key by verse number.
    const highlight = (
      highlights as unknown as Record<number, { color?: string }>
    )[verseNumber];
    const highlightColor = highlight?.color;
    const isTargetHighlight = highlightedVerse === verseNumber;
    const isActiveAudio = activeAudioVerse === verseNumber;
    const explanationData = explanationMap?.[verseNumber] ?? null;
    const dvData = dailyVerseRefMap?.[verseNumber];
    const shouldShowDvPanel = !!dvData;

    const showActions = selectedVerses.length === 1 && isSelected;
    const isExplaining = explainingVerse === verseNumber;

    return (
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
        onShare={onShare ? () => onShare(verseNumber) : undefined}
        onCopy={onCopy ? () => onCopy(verseNumber) : undefined}
        onDoubleTap={onDoubleTap ? () => onDoubleTap(verseNumber) : undefined}
        onLongPress={onLongPress ? () => onLongPress(verseNumber) : undefined}
        onExplain={
          onExplain
            ? () => {
                onExplain(verseNumber);
              }
            : undefined
        }
        onCloseStart={
          onCloseExplanation
            ? () => {
                const index = versesArray.findIndex(v => v.num === verseNumber);
                if (index !== -1) {
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0,
                  });
                }
              }
            : undefined
        }
        onCloseExplanation={
          onCloseExplanation
            ? () => onCloseExplanation(verseNumber)
            : undefined
        }
        explanationData={explanationData}
        onDailyVerse={onDailyVerse ? () => onDailyVerse(verseNumber) : undefined}
        onCloseDailyVerse={onCloseDailyVerse ? () => onCloseDailyVerse(verseNumber) : undefined}
        showDailyVerse={shouldShowDvPanel}
        dailyVerseData={dvData}
        journalPrompts={verseJournalPrompts[verseNumber] || []}
        navigation={navigation}
        currentBook={currentBook}
        currentChapter={currentChapter}
        verseWords={verseWordMap?.[verseNumber]}
        onWordPress={onWordPress}
      />
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
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <FlatList
        ref={flatListRef}
        data={versesArray}
        extraData={[selectedVerses, activeAudioVerse, explanationMap, dailyVerseRefMap, verseJournalPrompts]}
        renderItem={renderVerseItem}
        keyExtractor={item => String(item.num)}
        contentContainerStyle={[
          styles.scrollContent,
          versesArray.length === 0 && { flex: 1 },
        ]}
        refreshControl={refreshControl}
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
  );
}
