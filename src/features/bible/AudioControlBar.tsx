import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronFirst,
  ChevronLast,
  Repeat,
  Square,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { getColors, FONT_SIZES, SPACING } from '../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AudioScope = 'verse' | 'selection' | 'chapter';
export type AfterPlayBehaviour = 'continue' | 'repeat' | 'stop';

export interface AudioControlBarProps {
  /** Whether audio is actively playing (bar visible when true) */
  isPlaying: boolean;
  /** Whether audio is paused (playing started but paused) */
  isPaused?: boolean;
  /** Display label – e.g. "Genesis 1:3" or "Genesis 1:3–7" */
  nowPlayingLabel: string;
  /** Current scope: play this verse / selection / whole chapter */
  scope: AudioScope;
  /** What happens when the current unit finishes */
  afterPlay: AfterPlayBehaviour;
  /** Is repeat mode active */
  isRepeat: boolean;
  /** Index of the currently-playing verse inside the active set (0-based) */
  verseIndex: number;
  /** Total verses in the active set */
  verseCount: number;
  isDark: boolean;

  // ── Callbacks ──────────────────────────────────────────────────────────────
  onPrev: () => void;
  onNext: () => void;
  onRepeatToggle: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onScopeChange: (scope: AudioScope) => void;
  onAfterPlayChange: (behaviour: AfterPlayBehaviour) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small animated icon-button
// ─────────────────────────────────────────────────────────────────────────────

function CtrlBtn({
  onPress,
  children,
  active,
  accent,
  size = 48,
  disabled = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  active?: boolean;
  accent: string;
  size?: number;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.84,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 10,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      disabled={disabled}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Animated.View
        style={[
          ctrlStyles.btn,
          { width: size, height: size, borderRadius: size / 2 },
          active && {
            backgroundColor: `${accent}22`,
            borderColor: `${accent}55`,
          },
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const ctrlStyles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Pill chip (scope / after-play selector)
// ─────────────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  accent,
  textColor,
  mutedColor,
  surfaceColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        chipStyles.chip,
        selected
          ? { backgroundColor: accent, borderColor: accent }
          : {
              backgroundColor: surfaceColor,
              borderColor: 'rgba(255,255,255,0.15)',
            },
      ]}
    >
      <Text
        style={[chipStyles.label, { color: selected ? '#fff' : mutedColor }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Verse-progress dots
// ─────────────────────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  accent,
  muted,
}: {
  total: number;
  current: number;
  accent: string;
  muted: string;
}) {
  // Only render dots when the set is small enough to be useful
  const MAX_DOTS = 12;
  if (total <= 1 || total > MAX_DOTS) return null;

  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current
              ? { backgroundColor: accent, width: 16 }
              : { backgroundColor: muted },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    marginTop: 6,
  },
  dot: {
    height: 4,
    width: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AudioControlBar({
  isPlaying,
  isPaused = false,
  nowPlayingLabel,
  scope,
  afterPlay,
  isRepeat,
  verseIndex,
  verseCount,
  isDark,
  onPrev,
  onNext,
  onRepeatToggle,
  onPlayPause,
  onStop,
  onScopeChange,
  onAfterPlayChange,
}: AudioControlBarProps) {
  const COLORS = getColors(isDark);
  const accent = COLORS.accent ?? COLORS.primary;

  // ── Slide-in / slide-out animation ────────────────────────────────────────
  const translateY = useRef(new Animated.Value(220)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying || isPaused) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 5,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 220,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPlaying, isPaused]);

  // ── Breathing glow behind the play button ─────────────────────────────────
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    glowLoop.current?.stop();
    glowLoop.current = null;

    if (isPlaying && !isPaused) {
      glowAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      glowLoop.current = loop;
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    return () => glowLoop.current?.stop();
  }, [isPlaying, isPaused]);

  const surfaceChip = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const surface2 = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const muteColor = COLORS.muted;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: COLORS.cardBackground,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isPlaying || isPaused ? 'auto' : 'none'}
    >
      {/* Top accent stripe */}
      <View style={[styles.topStripe, { backgroundColor: accent }]} />

      {/* ── Now-playing label ──────────────────────────────────────────────── */}
      <View style={styles.nowPlayingRow}>
        <View style={[styles.liveIndicator, { backgroundColor: accent }]} />
        <Text
          style={[styles.nowPlayingText, { color: COLORS.text }]}
          numberOfLines={1}
        >
          {nowPlayingLabel}
        </Text>
        {isPaused && (
          <View style={[styles.pausedBadge, { backgroundColor: surfaceChip }]}>
            <Text style={[styles.pausedBadgeText, { color: muteColor }]}>
              PAUSED
            </Text>
          </View>
        )}
      </View>

      {/* ── Verse-progress dots ─────────────────────────────────────────────── */}
      <ProgressDots
        total={verseCount}
        current={verseIndex}
        accent={accent}
        muted={`${muteColor}55`}
      />

      {/* ── Playback-scope chips ────────────────────────────────────────────── */}
      <View style={styles.chipRow}>
        <Text style={[styles.chipSectionLabel, { color: muteColor }]}>
          PLAY
        </Text>
        {(['verse', 'selection', 'chapter'] as AudioScope[]).map(s => (
          <Chip
            key={s}
            label={
              s === 'selection'
                ? 'Selection'
                : s === 'chapter'
                  ? 'Chapter'
                  : 'Verse'
            }
            selected={scope === s}
            onPress={() => onScopeChange(s)}
            accent={accent}
            textColor={COLORS.text}
            mutedColor={muteColor}
            surfaceColor={surfaceChip}
          />
        ))}
      </View>

      {/* ── After-play behaviour chips ──────────────────────────────────────── */}
      <View style={styles.chipRow}>
        <Text style={[styles.chipSectionLabel, { color: muteColor }]}>
          THEN
        </Text>
        {(
          [
            { key: 'continue', label: 'Continue →' },
            { key: 'repeat', label: '↺ Repeat' },
            { key: 'stop', label: '⏹ Stop' },
          ] as { key: AfterPlayBehaviour; label: string }[]
        ).map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            selected={afterPlay === key}
            onPress={() => onAfterPlayChange(key)}
            accent={accent}
            textColor={COLORS.text}
            mutedColor={muteColor}
            surfaceColor={surfaceChip}
          />
        ))}
      </View>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: COLORS.border }]} />

      {/* ── Transport controls ──────────────────────────────────────────────── */}
      <View style={styles.controls}>
        {/* Previous */}
        <CtrlBtn
          onPress={onPrev}
          accent={accent}
          disabled={verseIndex <= 0 && scope !== 'chapter'}
        >
          <SkipBack size={22} color={muteColor} strokeWidth={2} />
        </CtrlBtn>

        {/* Repeat toggle */}
        <CtrlBtn onPress={onRepeatToggle} accent={accent} active={isRepeat}>
          <Repeat
            size={20}
            color={isRepeat ? accent : muteColor}
            strokeWidth={2.2}
          />
        </CtrlBtn>

        {/* Play / Pause — large centre button */}
        <View style={styles.playBtnWrap}>
          {/* Breathing glow ring */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.glowRing,
              {
                borderColor: accent,
                opacity: glowAnim,
              },
            ]}
          />
          <TouchableOpacity
            onPress={onPlayPause}
            activeOpacity={0.85}
            style={[styles.playBtn, { backgroundColor: accent }]}
          >
            {isPaused ? (
              <Play size={28} color="#fff" fill="#fff" strokeWidth={0} />
            ) : (
              <Pause size={26} color="#fff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Next */}
        <CtrlBtn
          onPress={onNext}
          accent={accent}
          disabled={verseIndex >= verseCount - 1 && scope !== 'chapter'}
        >
          <SkipForward size={22} color={muteColor} strokeWidth={2} />
        </CtrlBtn>

        {/* Stop */}
        <CtrlBtn onPress={onStop} accent={accent}>
          <Square size={18} color={muteColor} strokeWidth={2} />
        </CtrlBtn>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.xl,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.xl,
    zIndex: 200,
    // Rich shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 28,
    overflow: 'hidden',
  },

  topStripe: {
    height: 3,
    width: 48,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: SPACING.md,
    opacity: 0.7,
  },

  // Now-playing
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  nowPlayingText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pausedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  chipSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    width: 34,
  },

  divider: {
    height: 1,
    opacity: 0.5,
    marginVertical: SPACING.md,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },

  // Play button
  playBtnWrap: {
    position: 'relative',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    borderRadius: 40,
    borderWidth: 2,
    margin: -4,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});
