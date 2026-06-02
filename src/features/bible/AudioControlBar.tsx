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
  Timer,
} from 'lucide-react-native';
import { getColors, FONT_SIZES } from '../../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

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
  speechRate?: number;
  sleepTimerRemaining?: number;
  onSpeedToggle?: () => void;
  onSpeedReset?: () => void;
  onSleepTimerToggle?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRepeatToggle: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onScopeChange: (scope: AudioScope) => void;
  onAfterPlayChange: (behaviour: AfterPlayBehaviour) => void;
}

function CtrlBtn({
  onPress,
  children,
  disabled = false,
  isDark,
  size = 48,
}: {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  isDark: boolean;
  size?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.25 : 1,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
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

export default function AudioControlBar({
  isPlaying,
  isPaused = false,
  nowPlayingLabel,
  scope,
  afterPlay,
  verseIndex,
  verseCount,
  isDark,
  speechRate = 1.0,
  sleepTimerRemaining = 0,
  onSpeedToggle,
  onSpeedReset,
  onSleepTimerToggle,
  onPrev,
  onNext,
  onRepeatToggle,
  onPlayPause,
  onStop,
  onAfterPlayChange,
}: AudioControlBarProps) {
  const COLORS = getColors(isDark);
  const accent = COLORS.accent ?? COLORS.primary;

  const afterPlayRef = useRef(afterPlay);
  const speechRateRef = useRef(speechRate);
  const lastLabelRef = useRef(nowPlayingLabel);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);
  useEffect(() => {
    afterPlayRef.current = afterPlay;
  }, [afterPlay]);
  useEffect(() => {
    lastLabelRef.current = nowPlayingLabel;
  }, [nowPlayingLabel]);

  const translateY = useRef(new Animated.Value(220)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying || isPaused) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 220,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPlaying, isPaused]);

  const disablePrev = verseIndex <= 0;
  const disableNext = verseIndex >= verseCount - 1;

  const progress = verseCount > 0 ? verseIndex / verseCount : 0;
  const progressPct = Math.min(1, Math.max(0, progress));

  const repeatIcon = () => {
    if (afterPlay === 'repeat_one')
      return <Repeat1 size={18} color={accent} strokeWidth={2.2} />;
    if (afterPlay === 'repeat')
      return <Repeat size={17} color={accent} strokeWidth={2.2} />;
    if (afterPlay === 'continue')
      return <Repeat size={17} color={accent} strokeWidth={2.2} />;
    return (
      <Repeat
        size={17}
        color={COLORS.muted}
        strokeWidth={2}
      />
    );
  };

  const repeatLabel = () => {
    if (afterPlay === 'repeat') return 'All';
    if (afterPlay === 'repeat_one') return 'One';
    return 'None';
  };

  const sleepIcon = () => {
    const v = sleepTimerRemaining;
    if (v > 0) {
      if (v >= 60) {
        const mins = Math.floor(v / 60);
        const secs = v % 60;
        return (
          <Text style={[styles.sleepText, { color: '#F59E0B' }]}>
            {mins}:{String(secs).padStart(2, '0')}
          </Text>
        );
      }
      return (
        <Text style={[styles.sleepText, { color: '#F59E0B' }]}>
          {`${v}s`}
        </Text>
      );
    }
    return <Timer size={16} color={COLORS.muted} />;
  };

  const sleepLabel = () => {
    if (sleepTimerRemaining <= 0) return 'Timer';
    return 'Sleep';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1A1A1E' : '#FFFFFF',
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isPlaying || isPaused ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={isDark ? ['#252528', '#1A1A1E'] : ['#FAFAFA', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Progress track */}
        <View style={styles.progressWrapper}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accent,
                  width: `${(progressPct * 100).toFixed(2)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Top row: mode badge + reference + autoplay */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.badge,
                { borderColor: `${accent}50`, backgroundColor: `${accent}12` },
              ]}
            >
              <Music size={11} color={accent} strokeWidth={2.5} />
              <Text style={[styles.badgeText, { color: accent }]}>
                {scope === 'chapter' ? 'CHAPTER' : 'SELECTION'}
              </Text>
            </View>

            <Text style={[styles.counter, { color: COLORS.muted }]}>
              {verseIndex + 1} / {verseCount}
            </Text>

            <TouchableOpacity
              onPress={() =>
                onAfterPlayChange(
                  afterPlay === 'continue' ? 'stop' : 'continue',
                )
              }
              style={[
                styles.autoplayBadge,
                {
                  backgroundColor:
                    afterPlay === 'continue' ? `${accent}14` : 'transparent',
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
                  styles.autoplayText,
                  { color: afterPlay === 'continue' ? accent : COLORS.muted },
                ]}
              >
                {afterPlay === 'continue' ? 'AUTOPLAY' : 'ONCE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Now playing */}
          <View style={styles.titleRow}>
            <Text
              style={[styles.nowPlaying, { color: COLORS.text }]}
              numberOfLines={1}
            >
              {nowPlayingLabel}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            {/* Left: repeat + speed + timer */}
            <View style={styles.leftGroup}>
              <View style={styles.btnWithLabel}>
                <CtrlBtn onPress={onRepeatToggle} isDark={isDark}>
                  {repeatIcon()}
                </CtrlBtn>
                <Text style={[styles.btnLabel, { color: COLORS.muted }]}>{repeatLabel()}</Text>
              </View>

              <View style={styles.btnWithLabel}>
                <CtrlBtn
                  onPress={onSpeedToggle ?? (() => {})}
                  isDark={isDark}
                  size={46}
                >
                <Text
                  style={[
                    styles.speedText,
                    { color: speechRate !== 1.0 ? accent : COLORS.muted },
                  ]}
                >
                  {speechRate === 1.0 ? '1x' : `${speechRate}x`}
                </Text>
                </CtrlBtn>
                {speechRate !== 1.0 ? (
                  <TouchableOpacity onPress={onSpeedReset ?? (() => {})} activeOpacity={0.6}>
                    <Text style={[styles.btnLabel, { color: accent }]}>
                      reset
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.btnLabel, { color: COLORS.muted }]}>
                    {speechRate === 1.0 ? 'Normal' : speechRate < 1.0 ? 'Slow' : 'Fast'}
                  </Text>
                )}
              </View>

              <View style={styles.btnWithLabel}>
                <CtrlBtn
                  onPress={onSleepTimerToggle ?? (() => {})}
                  isDark={isDark}
                >
                  {sleepIcon()}
                </CtrlBtn>
                <Text
                  style={[
                    styles.btnLabel,
                    { color: sleepTimerRemaining > 0 ? '#F59E0B' : COLORS.muted },
                  ]}
                >
                  {sleepLabel()}
                </Text>
              </View>
            </View>

            {/* Center: prev + play/pause + next */}
            <View style={styles.centerGroup}>
              <CtrlBtn onPress={onPrev} isDark={isDark} disabled={disablePrev}>
                <SkipBack
                  size={20}
                  color={disablePrev ? COLORS.muted : COLORS.text}
                  strokeWidth={2.2}
                />
              </CtrlBtn>

              <TouchableOpacity
                onPress={onPlayPause}
                activeOpacity={0.82}
                style={[styles.playBtn, { backgroundColor: accent }]}
              >
                {isPaused ? (
                  <Play size={30} color="#FFF" fill="#FFF" />
                ) : (
                  <Pause size={30} color="#FFF" fill="#FFF" />
                )}
              </TouchableOpacity>

              <CtrlBtn onPress={onNext} isDark={isDark} disabled={disableNext}>
                <SkipForward
                  size={20}
                  color={disableNext ? COLORS.muted : COLORS.text}
                  strokeWidth={2.2}
                />
              </CtrlBtn>
            </View>

            {/* Right: stop */}
            <View style={styles.rightGroup}>
              <CtrlBtn onPress={onStop} isDark={isDark}>
                <Square size={14} color="#FF3B30" fill="#FF3B30" />
              </CtrlBtn>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 88 : 78,
    left: 12,
    right: 12,
    borderRadius: 26,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  progressWrapper: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  counter: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  autoplayBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  autoplayText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  titleRow: {
    marginBottom: 12,
    marginTop: 2,
  },
  nowPlaying: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sleepText: {
    fontSize: 10,
    fontWeight: '800',
  },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  btnWithLabel: {
    alignItems: 'center',
    gap: 2,
  },
  btnLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
