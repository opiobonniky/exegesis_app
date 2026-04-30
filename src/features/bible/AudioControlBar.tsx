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
  Repeat,
  Repeat1,
  Square,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
} from 'lucide-react-native';
import { getColors, FONT_SIZES, SPACING } from '../../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AudioScope = 'verse' | 'selection' | 'chapter';
export type AfterPlayBehaviour = 'continue' | 'repeat' | 'repeat_one' | 'stop';

export interface AudioControlBarProps {
  isPlaying: boolean;
  isPaused?: boolean;
  nowPlayingLabel: string;
  scope: AudioScope;
  afterPlay: AfterPlayBehaviour;
  isRepeat: boolean;
  verseIndex: number;
  verseCount: number;
  isDark: boolean;

  onPrev: () => void;
  onNext: () => void;
  onRepeatToggle: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onScopeChange: (scope: AudioScope) => void;
  onAfterPlayChange: (behaviour: AfterPlayBehaviour) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CtrlBtn: Modernized Icon Button
// ─────────────────────────────────────────────────────────────────────────────

function CtrlBtn({
  onPress,
  children,
  active,
  accent,
  size = 40,
  disabled = false,
  isDark,
}: {
  onPress: () => void;
  children: React.ReactNode;
  active?: boolean;
  accent: string;
  size?: number;
  disabled?: boolean;
  isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      disabled={disabled}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <Animated.View
        style={[
          ctrlStyles.btn,
          {
            width: size,
            height: size,
            borderRadius: 14,
            backgroundColor: active
              ? `${accent}25`
              : isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
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

  const translateY = useRef(new Animated.Value(200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying || isPaused) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 200,
          duration: 250,
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

  const progress = verseCount > 0 ? (verseIndex + 1) / verseCount : 0;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const toggleRepeat = () => {
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
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isPlaying || isPaused ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={isDark ? ['#2C2C2E', '#1C1C1E'] : ['#F2F2F7', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* ── Progress Bar (Integrated) ─────────────────────────────────── */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
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
          {/* ── Info & Mode Row ────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.metaInfo}>
              <View style={[styles.iconRing, { borderColor: `${accent}40` }]}>
                <Music size={14} color={accent} strokeWidth={2.5} />
              </View>
              <Text style={[styles.modeLabel, { color: accent }]}>
                {scope === 'chapter' ? 'CHAPTER' : 'SELECTION'}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.1)',
                  },
                ]}
              />
              <Text style={[styles.counterLabel, { color: COLORS.muted }]}>
                {verseIndex + 1} of {verseCount}
              </Text>
            </View>

            <TouchableOpacity
              onPress={toggleContinue}
              activeOpacity={0.7}
              style={[
                styles.autoPlayBtn,
                {
                  backgroundColor:
                    afterPlay === 'continue' ? `${accent}15` : 'transparent',
                  borderColor:
                    afterPlay === 'continue'
                      ? `${accent}30`
                      : isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.1)',
                },
              ]}
            >
              <Text
                style={[
                  styles.autoPlayText,
                  { color: afterPlay === 'continue' ? accent : COLORS.muted },
                ]}
              >
                {afterPlay === 'continue' ? 'AUTOPLAY ON' : 'AUTOPLAY OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Now Playing Label ────────────────────────────────────────── */}
          <View style={styles.titleRow}>
            <Text
              style={[styles.nowPlayingText, { color: COLORS.text }]}
              numberOfLines={1}
            >
              {nowPlayingLabel}
            </Text>
          </View>

          {/* ── Controls Row ────────────────────────────────────────────── */}
          <View style={styles.controlsRow}>
            <View style={styles.sideGroup}>
              <CtrlBtn
                onPress={toggleRepeat}
                accent={accent}
                isDark={isDark}
                active={afterPlay === 'repeat' || afterPlay === 'repeat_one'}
              >
                {afterPlay === 'repeat_one' ? (
                  <Repeat1 size={18} color={accent} strokeWidth={2.5} />
                ) : (
                  <Repeat
                    size={18}
                    color={afterPlay === 'repeat' ? accent : COLORS.muted}
                    strokeWidth={2}
                  />
                )}
              </CtrlBtn>

              <CtrlBtn
                onPress={onPrev}
                accent={accent}
                isDark={isDark}
                disabled={verseIndex <= 0}
              >
                <SkipBack
                  size={20}
                  color={COLORS.text}
                  fill={isDark ? 'transparent' : 'transparent'}
                  strokeWidth={2}
                />
              </CtrlBtn>
            </View>

            <TouchableOpacity
              onPress={onPlayPause}
              activeOpacity={0.9}
              style={[styles.mainPlayBtn, { backgroundColor: accent }]}
            >
              {isPaused ? (
                <Play size={26} color="#FFF" fill="#FFF" />
              ) : (
                <Pause size={26} color="#FFF" fill="#FFF" />
              )}
            </TouchableOpacity>

            <View style={styles.sideGroup}>
              <CtrlBtn
                onPress={onNext}
                accent={accent}
                isDark={isDark}
                disabled={
                  verseIndex >= verseCount - 1 && afterPlay !== 'continue'
                }
              >
                <SkipForward size={20} color={COLORS.text} strokeWidth={2} />
              </CtrlBtn>

              <CtrlBtn onPress={onStop} accent={accent} isDark={isDark}>
                <Square size={16} color="#FF3B30" fill="#FF3B30" />
              </CtrlBtn>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 92 : 82,
    left: 14,
    right: 14,
    borderRadius: 28,
    zIndex: 1000,
    // Modern deep shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  innerContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  counterLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  autoPlayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  autoPlayText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  titleRow: {
    marginBottom: 18,
  },
  nowPlayingText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainPlayBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    // Inner Glow
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
