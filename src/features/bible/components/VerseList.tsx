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
  verseNum: string;
  text: string;
};

export type VerseListProps = {
  versesArray: VerseItem[];
  selectedVerses: number[];
  highlights: Record<string, { color?: string }>;
  favorites: Set<string>;
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
  onCloseExplanation?: (verseNumber: number) => void;
  explanationMap?: Record<number, string>;
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
  onCloseExplanation,
  explanationMap,
}: VerseListProps) {
  if (loading) {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SkeletonLoader colors={colors} />
      </Animated.View>
    );
  }

  const renderVerseItem = ({ item }: { item: VerseItem }) => {
    const { verseNum, text } = item;
    const verseNumber = parseInt(verseNum, 10);
    const key = `${currentBook} ${currentChapter}:${verseNum}`;
    const isSelected = selectedVerses.includes(verseNumber);
    const isFavorite = favorites.has(key);
    const highlight = highlights[key];
    const highlightColor = highlight?.color;
    const isTargetHighlight = highlightedVerse === verseNumber;
    const isActiveAudio = activeAudioVerse === verseNumber;
    const showExp = isSelected && selectedVerses.length === 1;
    const expText = explanationMap?.[verseNumber];
    // Show the panel if verse is selected (to show Explain button) OR has explanation text
    const shouldShowExpPanel = showExp || !!expText;

    return (
      <VerseCard
        verseNum={verseNum}
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
        onPress={() => onVersePress(verseNumber)}
        onRemoveHighlight={onRemoveHighlight}
        onExplain={onExplain ? () => onExplain(verseNumber) : undefined}
        onCloseExplanation={
          onCloseExplanation ? () => onCloseExplanation(verseNumber) : undefined
        }
        showExplanation={shouldShowExpPanel}
        explanationText={expText}
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
        extraData={[selectedVerses, activeAudioVerse]}
        renderItem={renderVerseItem}
        keyExtractor={item => item.verseNum}
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
