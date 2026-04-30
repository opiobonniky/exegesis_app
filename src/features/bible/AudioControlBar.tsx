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
  Repeat1,
  Square,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react-native';
import { getColors, FONT_SIZES, SPACING } from '../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AudioScope = 'verse' | 'selection' | 'chapter';
export type AfterPlayBehaviour = 'continue' | 'repeat' | 'repeat_one' | 'stop';

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
  size = 44,
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
      toValue: 0.88,
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
      style={{ opacity: disabled ? 0.25 : 1 }}
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
  const translateY = useRef(new Animated.Value(250)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying || isPaused) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 250,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPlaying, isPaused]);

  const progress = verseCount > 0 ? (verseIndex + 1) / verseCount : 0;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const surfaceChip = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const muteColor = COLORS.muted;

  const toggleRepeat = () => {
    // Cycle: stop -> repeat -> repeat_one -> stop
    if (afterPlay === 'stop') onAfterPlayChange('repeat');
    else if (afterPlay === 'repeat') onAfterPlayChange('repeat_one');
    else onAfterPlayChange('stop');
  };

  const toggleContinue = () => {
    onAfterPlayChange(afterPlay === 'continue' ? 'stop' : 'continue');
  };

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          backgroundColor: COLORS.cardBackground,
          transform: [{ translateY }],
          opacity,
          borderColor: COLORS.border,
        },
      ]}
      pointerEvents={isPlaying || isPaused ? 'auto' : 'none'}
    >
      {/* ── Progress Bar ───────────────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: surfaceChip }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: accent,
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.innerContent}>
        {/* ── Info Row ─────────────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isPaused ? surfaceChip : `${accent}15` },
            ]}
          >
            {isPaused ? (
              <Pause size={18} color={muteColor} />
            ) : (
              <Volume2 size={18} color={accent} />
            )}
          </View>

          <View style={styles.labelCol}>
            <Text style={[styles.scopeLabel, { color: muteColor }]}>
              {scope === 'chapter' ? 'CHAPTER MODE' : 'SELECTION'}
            </Text>
            <View style={styles.titleRow}>
              <Text
                style={[styles.nowPlayingText, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {nowPlayingLabel}
              </Text>
              <TouchableOpacity
                onPress={toggleContinue}
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      afterPlay === 'continue' ? `${accent}15` : surfaceChip,
                    borderColor:
                      afterPlay === 'continue' ? `${accent}30` : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: afterPlay === 'continue' ? accent : muteColor,
                    },
                  ]}
                >
                  {afterPlay === 'continue' ? 'CONTINUE ON' : 'AUTO-STOP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.counterBox, { backgroundColor: surfaceChip }]}>
            <Text style={[styles.counterText, { color: COLORS.text }]}>
              {verseIndex + 1}
              <Text style={{ opacity: 0.4 }}>/{verseCount}</Text>
            </Text>
          </View>
        </View>

        {/* ── Controls Row ─────────────────────────────────────────────────── */}
        <View style={styles.controlsRow}>
          <View style={styles.leftGroup}>
            {/* Repeat Cycle Button */}
            <CtrlBtn
              onPress={toggleRepeat}
              accent={accent}
              active={afterPlay === 'repeat' || afterPlay === 'repeat_one'}
            >
              {afterPlay === 'repeat_one' ? (
                <Repeat1 size={20} color={accent} strokeWidth={2.5} />
              ) : (
                <Repeat
                  size={20}
                  color={afterPlay === 'repeat' ? accent : muteColor}
                  strokeWidth={2}
                />
              )}
              {afterPlay === 'repeat' && (
                <Text style={[styles.repeatAllTag, { color: accent }]}>
                  ALL
                </Text>
              )}
            </CtrlBtn>

            <CtrlBtn
              onPress={onPrev}
              accent={accent}
              disabled={verseIndex <= 0}
            >
              <SkipBack size={22} color={muteColor} strokeWidth={2} />
            </CtrlBtn>
          </View>

          {/* Main Play/Pause */}
          <TouchableOpacity
            onPress={onPlayPause}
            activeOpacity={0.85}
            style={[
              styles.playBtn,
              { backgroundColor: accent, shadowColor: accent },
            ]}
          >
            {isPaused ? (
              <Play size={24} color="#fff" fill="#fff" />
            ) : (
              <Pause size={24} color="#fff" strokeWidth={3} />
            )}
          </TouchableOpacity>

          <View style={styles.rightGroup}>
            <CtrlBtn
              onPress={onNext}
              accent={accent}
              disabled={
                verseIndex >= verseCount - 1 && afterPlay !== 'continue'
              }
            >
              <SkipForward size={22} color={muteColor} strokeWidth={2} />
            </CtrlBtn>

            <CtrlBtn onPress={onStop} accent={accent}>
              <Square size={18} color="#FF4B4B" fill="#FF4B4B" />
            </CtrlBtn>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 12,
    right: 12,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 1000,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
  },

  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },

  innerContent: {
    padding: 14,
    paddingTop: 10,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCol: {
    flex: 1,
    gap: 2,
  },
  scopeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nowPlayingText: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '60%',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  counterBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  repeatAllTag: {
    position: 'absolute',
    fontSize: 7,
    fontWeight: '900',
    bottom: 8,
  },
});
