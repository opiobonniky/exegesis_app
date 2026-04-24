import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Heart, X, Lightbulb } from 'lucide-react-native';
import ExpandableText from '../../bible/ExpandableText';
import { bibleTTS } from '../../../utilits/bibleTTS';

// ── Types ─────────────────────────────────────────────────────────────────────

type WordSpan = { start: number; length: number };

type VerseCardProps = {
  verseNum: string;
  verseNumber: number;
  text: string;
  isSelected: boolean;
  isFavorite: boolean;
  highlightColor?: string;
  isTargetHighlight: boolean;
  isActiveAudio: boolean;
  wordMap: WordSpan[] | null;
  highlightAnim: Animated.Value;
  fontSize: number;
  colors: any;
  styles: any;
  onPress: () => void;
  onRemoveHighlight: (verseNumber: number) => void;
  onExplain?: () => void;
  onCloseExplanation?: () => void;
  showExplanation?: boolean;
  explanationText?: string;
};

export default function VerseCard({
  verseNum,
  verseNumber,
  text,
  isSelected,
  isFavorite,
  highlightColor,
  isTargetHighlight,
  isActiveAudio,
  wordMap,
  highlightAnim,
  fontSize,
  colors,
  styles,
  onPress,
  onRemoveHighlight,
  onExplain,
  onCloseExplanation,
  showExplanation,
  explanationText,
}: VerseCardProps) {
  const accent = colors.accent;

  // ── Subscribe to bibleTTS directly — only THIS card re-renders per word ────
  //
  // KEY PERF FIX: previously `activeWordOffset` lived in useBible state and
  // sat in FlatList extraData. Every word change re-rendered ALL visible cards
  // (~15), congesting the JS thread and causing visible lag.
  //
  // Now: word offset state lives here. Only the active card subscribes.
  // All other cards never re-render for word changes. JS thread stays free.
  //
  const [activeWordOffset, setActiveWordOffset] = useState<WordSpan | null>(
    null,
  );
  // Keep wordMap in a ref so the subscription closure always sees the latest
  // value without being re-created on every verse change.
  const wordMapRef = useRef<WordSpan[] | null>(null);
  wordMapRef.current = wordMap;

  useEffect(() => {
    if (!isActiveAudio) {
      setActiveWordOffset(null);
      return;
    }
    const unsub = bibleTTS.subscribe(s => {
      if (s.tier === 'idle' || s.wordIndex < 0) {
        setActiveWordOffset(null);
        return;
      }
      const map = wordMapRef.current;
      if (map && s.wordIndex < map.length) {
        setActiveWordOffset(map[s.wordIndex]);
      }
    });
    return unsub;
  }, [isActiveAudio]);

  // ── Verse text — with word highlight when a word offset is provided ────────
  const renderVerseText = () => {
    const lineHeight = Math.round(fontSize * 1.75);
    const numStyle = [
      styles.verseNumber,
      {
        fontSize: fontSize * 0.72,
        fontWeight: '800' as const,
        color: isActiveAudio ? accent : isSelected ? accent : colors.accent,
        lineHeight,
      },
    ];

    // No active word → plain render
    if (!isActiveAudio || !activeWordOffset) {
      return (
        <Text
          style={[
            styles.verseText,
            { fontSize, lineHeight, opacity: isActiveAudio ? 1 : 0.88 },
          ]}
        >
          <Text style={numStyle}>
            {verseNum}
            {'  '}
          </Text>
          {text}
        </Text>
      );
    }

    // Active word → split text into before / word / after
    const { start, length } = activeWordOffset;
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(start + length, text.length));
    const before = text.slice(0, safeStart);
    const word = text.slice(safeStart, safeEnd);
    const after = text.slice(safeEnd);

    return (
      <Text style={[styles.verseText, { fontSize, lineHeight, opacity: 1 }]}>
        <Text style={numStyle}>
          {verseNum}
          {'  '}
        </Text>
        {before}
        <Text style={wordStyles.highlight}>{word}</Text>
        {after}
      </Text>
    );
  };

  // ── Audio animations (all useNativeDriver: true) ──────────────────────────
  const audioPulse = useRef(new Animated.Value(0)).current;
  const audioScale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActiveAudio) {
      Animated.spring(audioScale, {
        toValue: 1.012,
        useNativeDriver: true,
        speed: 40,
        bounciness: 3,
      }).start();

      Animated.timing(borderOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(audioPulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(audioPulse, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      Animated.parallel([
        Animated.spring(audioScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 0,
        }),
        Animated.timing(audioPulse, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => pulseLoopRef.current?.stop();
  }, [isActiveAudio]);

  // ── Search-jump border (JS-driver, mirrors highlightAnim via listener) ────
  const searchBorderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTargetHighlight) {
      searchBorderOpacity.setValue(0);
      return;
    }
    const id = highlightAnim.addListener(({ value }) => {
      searchBorderOpacity.setValue(value);
    });
    return () => highlightAnim.removeListener(id);
  }, [isTargetHighlight, highlightAnim]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.verseTouchable,
        pressed && styles.versePressed,
      ]}
      onPress={onPress}
      android_ripple={{ color: `${accent}1A` }}
    >
      {/* OUTER plain View — no animated props, never claimed by any driver */}
      <View style={[styles.verseContainer, isSelected && styles.verseSelected]}>
        {/* INNER Animated.View — ONLY native-driver transform, fully isolated */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ scale: audioScale }] },
          ]}
        >
          {isActiveAudio && (
            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.fillOverlay,
                {
                  backgroundColor: accent,
                  opacity: audioPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.06, 0.16],
                  }),
                },
              ]}
            />
          )}

          {isActiveAudio && (
            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.audioActiveBorder,
                { backgroundColor: accent, opacity: borderOpacity },
              ]}
            />
          )}
        </Animated.View>

        {/* Search-jump yellow border — JS-driver, isolated node */}
        {isTargetHighlight && (
          <Animated.View
            pointerEvents="none"
            style={[
              localStyles.searchJumpBorder,
              { opacity: searchBorderOpacity },
            ]}
          />
        )}

        {isTargetHighlight && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.targetHighlightOverlay,
              { opacity: searchBorderOpacity },
            ]}
          />
        )}

        {highlightColor && (
          <View
            pointerEvents="none"
            style={[styles.highlightStrip, { backgroundColor: highlightColor }]}
          />
        )}

        {highlightColor && (
          <View
            pointerEvents="none"
            style={[
              styles.highlightOverlay,
              { backgroundColor: highlightColor },
            ]}
          />
        )}

        <View style={styles.verseContent}>
          <View style={styles.verseTextContainer}>
            {renderVerseText()}
            {showExplanation && (
              <View
                style={[
                  localStyles.inlineExpWrap,
                  { backgroundColor: `${colors.primary}08` },
                ]}
              >
                {explanationText ? (
                  <ExpandableText
                    text={explanationText}
                    initialLines={8}
                    stepLines={20}
                    expandLabel="Read more"
                    closeLabel="Close"
                    onClose={onCloseExplanation}
                    containerStyle={localStyles.expandableContainer}
                  />
                ) : onExplain ? (
                  <TouchableOpacity
                    onPress={onExplain}
                    activeOpacity={0.7}
                    style={localStyles.inlineExplainBtn}
                  >
                    <Lightbulb size={10} color={colors.primary} />
                    <Text
                      style={[
                        localStyles.inlineExplainBtnText,
                        { color: colors.primary },
                      ]}
                    >
                      Explain
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
          <View style={localStyles.rightColumn}>
            {isFavorite && (
              <View style={styles.verseRightIcons}>
                <Heart size={20} color={colors.accent} fill={colors.accent} />
              </View>
            )}
          </View>
        </View>

        {/* Remove highlight pill — bottom-left, tinted with the highlight colour */}
        {highlightColor && (
          <TouchableOpacity
            onPress={() => onRemoveHighlight(verseNumber)}
            activeOpacity={0.75}
            // hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
            style={[
              localStyles.removeHighlightPill,
              { backgroundColor: highlightColor },
            ]}
          >
            <X size={10} color="#fff" strokeWidth={2.8} />
            <Text style={localStyles.removeHighlightLabel}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  fillOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  audioActiveBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  searchJumpBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 193, 7, 0.85)',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  inlineExpWrap: {
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
  },
  expandableContainer: {
    marginTop: 0,
  },
  inlineExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineExplainBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  removeHighlightPill: {
    position: 'absolute',
    right: 8,
    bottom: 6,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  removeHighlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

const wordStyles = StyleSheet.create({
  highlight: {
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});
