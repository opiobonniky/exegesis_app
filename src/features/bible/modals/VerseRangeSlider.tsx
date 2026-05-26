/**
 * VerseRangeSlider.tsx
 *
 * A dual-thumb range slider that lets the user expand or shrink the verse
 * selection before highlighting / adding a note.
 *
 * • Two draggable thumbs clamp to valid verse numbers.
 * • The track between the thumbs is filled with the accent colour.
 * • Verse chips below the track show all selected verses; tapping one
 *   selects only that verse (quick single-verse mode).
 * • Zero external dependencies — PanResponder + Animated only.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VerseRangeSliderProps = {
  /** Total verse numbers available (1-based, contiguous) */
  totalVerses: number;
  /** Currently active start verse (1-based inclusive) */
  startVerse: number;
  /** Currently active end verse (1-based inclusive) */
  endVerse: number;
  /** Fired whenever the range changes */
  onRangeChange: (start: number, end: number) => void;
  isDark: boolean;
  /** Optional accent colour override (e.g. the chosen highlight colour) */
  accentColor?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/** Convert a verse number to an X position within trackWidth */
function verseToX(verse: number, total: number, trackWidth: number): number {
  if (total <= 1) return 0;
  return ((verse - 1) / (total - 1)) * trackWidth;
}

/** Convert an X position back to a verse number */
function xToVerse(x: number, total: number, trackWidth: number): number {
  if (trackWidth === 0 || total <= 1) return 1;
  const ratio = clamp(x / trackWidth, 0, 1);
  return Math.round(ratio * (total - 1)) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VerseRangeSlider({
  totalVerses,
  startVerse,
  endVerse,
  onRangeChange,
  isDark,
  accentColor,
}: VerseRangeSliderProps) {
  const { translations } = useLanguage();
  const COLORS = getColors(isDark);
  const accent = accentColor ?? COLORS.primary;

  const [trackWidth, setTrackWidth] = useState(0);

  // Animated positions (pixel offsets from track left edge)
  const startAnim = useRef(new Animated.Value(0)).current;
  const endAnim = useRef(new Animated.Value(0)).current;

  // Mutable refs so PanResponder closures always see current values
  const startRef = useRef(startVerse);
  const endRef = useRef(endVerse);
  const trackWidthRef = useRef(0);

  // Sync animated values when props or trackWidth change
  useEffect(() => {
    if (trackWidth === 0) return;
    startRef.current = startVerse;
    endRef.current = endVerse;
    startAnim.setValue(verseToX(startVerse, totalVerses, trackWidth));
    endAnim.setValue(verseToX(endVerse, totalVerses, trackWidth));
  }, [startVerse, endVerse, totalVerses, trackWidth]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  }, []);

  // ── Start thumb PanResponder ───────────────────────────────────────────────
  const startBase = useRef(0);

  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startBase.current = verseToX(
          startRef.current,
          totalVerses,
          trackWidthRef.current,
        );
      },
      onPanResponderMove: (_, gs) => {
        const raw = startBase.current + gs.dx;
        const maxX = verseToX(
          endRef.current - 1,
          totalVerses,
          trackWidthRef.current,
        );
        const clamped = clamp(raw, 0, Math.max(0, maxX));
        startAnim.setValue(clamped);
        const newVerse = xToVerse(clamped, totalVerses, trackWidthRef.current);
        if (newVerse !== startRef.current) {
          startRef.current = newVerse;
          onRangeChange(newVerse, endRef.current);
        }
      },
      onPanResponderRelease: () => {
        // Snap to exact verse position
        const snapX = verseToX(
          startRef.current,
          totalVerses,
          trackWidthRef.current,
        );
        Animated.spring(startAnim, {
          toValue: snapX,
          useNativeDriver: false,
          speed: 40,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  // ── End thumb PanResponder ────────────────────────────────────────────────
  const endBase = useRef(0);

  const endPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        endBase.current = verseToX(
          endRef.current,
          totalVerses,
          trackWidthRef.current,
        );
      },
      onPanResponderMove: (_, gs) => {
        const raw = endBase.current + gs.dx;
        const minX = verseToX(
          startRef.current + 1,
          totalVerses,
          trackWidthRef.current,
        );
        const clamped = clamp(
          raw,
          Math.min(minX, trackWidthRef.current),
          trackWidthRef.current,
        );
        endAnim.setValue(clamped);
        const newVerse = xToVerse(clamped, totalVerses, trackWidthRef.current);
        if (newVerse !== endRef.current) {
          endRef.current = newVerse;
          onRangeChange(startRef.current, newVerse);
        }
      },
      onPanResponderRelease: () => {
        const snapX = verseToX(
          endRef.current,
          totalVerses,
          trackWidthRef.current,
        );
        Animated.spring(endAnim, {
          toValue: snapX,
          useNativeDriver: false,
          speed: 40,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  // ── Derived: fill bar left/width from animated values ─────────────────────
  const fillLeft = startAnim;
  const fillWidth = Animated.subtract(endAnim, startAnim);

  // ── Verse chips ───────────────────────────────────────────────────────────
  const verseRange = useMemo(() => {
    const arr: number[] = [];
    for (let v = startVerse; v <= endVerse; v++) arr.push(v);
    return arr;
  }, [startVerse, endVerse]);

  const isSingleVerse = startVerse === endVerse;

  return (
    <View style={styles.container}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: COLORS.muted }]}>
          {translations?.bible?.verseRangeLabel || 'Verse range'}
        </Text>
        <Text style={[styles.rangeText, { color: accent }]}>
          {isSingleVerse ? `v${startVerse}` : `v${startVerse} – v${endVerse}`}
          <Text style={[styles.countText, { color: COLORS.muted }]}>
            {' '}
            ({endVerse - startVerse + 1} {translations?.bible?.verses || 'verse'}
            {endVerse - startVerse + 1 !== 1 ? 's' : ''})
          </Text>
        </Text>
      </View>

      {/* Track + thumbs */}
      <View style={styles.sliderRow}>
        {/* Start verse label */}
        <Text style={[styles.endLabel, { color: COLORS.muted }]}>1</Text>

        {/* Track container */}
        <View style={styles.trackContainer} onLayout={onTrackLayout}>
          {/* Background track */}
          <View
            style={[
              styles.track,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.10)',
              },
            ]}
          />

          {/* Filled range */}
          {trackWidth > 0 && (
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: accent,
                  left: Animated.add(startAnim, THUMB_SIZE / 2),
                  width: fillWidth,
                  opacity: 0.85,
                },
              ]}
            />
          )}

          {/* Start thumb */}
          {trackWidth > 0 && (
            <Animated.View
              {...startPan.panHandlers}
              style={[
                styles.thumb,
                {
                  backgroundColor: COLORS.cardBackground,
                  borderColor: accent,
                  left: startAnim,
                },
              ]}
            >
              <View style={[styles.thumbInner, { backgroundColor: accent }]} />
            </Animated.View>
          )}

          {/* End thumb */}
          {trackWidth > 0 && (
            <Animated.View
              {...endPan.panHandlers}
              style={[
                styles.thumb,
                {
                  backgroundColor: COLORS.cardBackground,
                  borderColor: accent,
                  left: endAnim,
                },
              ]}
            >
              <View style={[styles.thumbInner, { backgroundColor: accent }]} />
            </Animated.View>
          )}
        </View>

        {/* End verse label */}
        <Text style={[styles.endLabel, { color: COLORS.muted }]}>
          {totalVerses}
        </Text>
      </View>

      {/* Verse chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {verseRange.map(v => (
          <TouchableOpacity
            key={v}
            onPress={() => onRangeChange(v, v)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  isSingleVerse && v === startVerse ? accent : `${accent}22`,
                borderColor:
                  isSingleVerse && v === startVerse ? accent : `${accent}55`,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSingleVerse && v === startVerse ? '#fff' : accent,
                },
              ]}
            >
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  rangeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  countText: {
    fontWeight: '400',
    fontSize: FONT_SIZES.xs,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  endLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  trackContainer: {
    flex: 1,
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB_SIZE / 2,
    right: THUMB_SIZE / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    top: (THUMB_SIZE - TRACK_HEIGHT) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the thumb above the track
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.9,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
