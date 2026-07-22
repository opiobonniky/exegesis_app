import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
  ChevronDown,
} from 'lucide-react-native';
import { getColors } from '../../constants/theme';
import LinearGradient from 'react-native-linear-gradient';
import { TTSVoice } from '../../services/ttsService';

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
  currentVoiceId?: string;
  voiceList?: TTSVoice[];
  onVoiceSelect?: (voiceId: string) => void;
}

function VoicePickerModal({
  visible,
  onClose,
  voiceList,
  currentVoiceId,
  onVoiceSelect,
  colors,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  voiceList: TTSVoice[];
  currentVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
  colors: ReturnType<typeof getColors>;
  isDark: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      search.trim()
        ? voiceList.filter(
            v =>
              v.name.toLowerCase().includes(search.toLowerCase()) ||
              v.voiceId.toLowerCase().includes(search.toLowerCase()),
          )
        : voiceList,
    [voiceList, search],
  );

  const accent = colors.accent ?? colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={voiceModalStyles.overlay}>
        <View
          style={[
            voiceModalStyles.sheet,
            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
          ]}
        >
          <View style={voiceModalStyles.header}>
            <Text style={[voiceModalStyles.title, { color: colors.text }]}>
              Select Voice
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text
                style={[voiceModalStyles.closeBtn, { color: colors.muted }]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              voiceModalStyles.searchBox,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.05)',
              },
            ]}
          >
            <TextInput
              style={[voiceModalStyles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search voices…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.voiceId}
            renderItem={({ item }) => {
              const active = currentVoiceId === item.voiceId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onVoiceSelect(item.voiceId);
                    onClose();
                  }}
                  style={[
                    voiceModalStyles.item,
                    {
                      backgroundColor: active ? `${accent}14` : 'transparent',
                    },
                  ]}
                >
                  <View style={voiceModalStyles.itemContent}>
                    <Text
                      style={[
                        voiceModalStyles.itemName,
                        { color: active ? accent : colors.text },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[voiceModalStyles.itemId, { color: colors.muted }]}
                    >
                      {item.voiceId}
                    </Text>
                  </View>
                  {active && (
                    <View
                      style={[
                        voiceModalStyles.check,
                        { backgroundColor: accent },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={voiceModalStyles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const voiceModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    fontSize: 15,
    fontWeight: '700',
  },
  searchBox: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: {
    fontSize: 15,
    paddingVertical: 10,
  },
  list: {
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemId: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

function CtrlBtn({
  onPress,
  children,
  disabled = false,
  isDark,
  size = 48,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  isDark: boolean;
  size?: number;
  accessibilityLabel?: string;
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
  onScopeChange,
  onAfterPlayChange,
  currentVoiceId,
  voiceList,
  onVoiceSelect,
}: AudioControlBarProps) {
  const COLORS = getColors(isDark);
  const accent = COLORS.accent ?? COLORS.primary;
  const [expanded, setExpanded] = useState(false);
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);

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
  }, [isPlaying, isPaused, opacity, translateY]);

  const disablePrev = verseIndex <= 0;
  const disableNext = verseIndex >= verseCount - 1;

  const progress = verseCount > 0 ? (verseIndex + 1) / verseCount : 0;
  const progressPct = Math.min(1, Math.max(0, progress));

  const scopeLabel = () => {
    if (scope === 'chapter') return 'CHAPTER';
    if (scope === 'verse') return 'VERSE';
    return 'SELECTION';
  };

  const repeatIcon = () => {
    if (afterPlay === 'repeat_one')
      return <Repeat1 size={18} color={accent} strokeWidth={2.2} />;
    if (afterPlay === 'repeat')
      return <Repeat size={17} color={accent} strokeWidth={2.2} />;
    if (afterPlay === 'continue')
      return <Repeat size={17} color={accent} strokeWidth={2.2} />;
    return <Repeat size={17} color={COLORS.muted} strokeWidth={2} />;
  };

  const repeatLabel = () => {
    if (afterPlay === 'repeat') return 'All';
    if (afterPlay === 'repeat_one') return 'One';
    if (afterPlay === 'continue') return 'Auto';
    return 'None';
  };

  const afterPlayLabel = () => {
    if (afterPlay === 'continue') return 'Continue';
    if (afterPlay === 'repeat') return 'Repeat all';
    if (afterPlay === 'repeat_one') return 'Repeat one';
    return 'Stop';
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
        <Text style={[styles.sleepText, { color: '#F59E0B' }]}>{`${v}s`}</Text>
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
          {/* Top row: mode badge + reference + expand */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.badge,
                { borderColor: `${accent}50`, backgroundColor: `${accent}12` },
              ]}
            >
              <Music size={11} color={accent} strokeWidth={2.5} />
              <Text style={[styles.badgeText, { color: accent }]}>
                {scopeLabel()}
              </Text>
            </View>

            <Text style={[styles.counter, { color: COLORS.muted }]}>
              {verseIndex + 1} / {verseCount}
            </Text>

            <TouchableOpacity
              onPress={() => setExpanded(prev => !prev)}
              style={[
                styles.expandBadge,
                {
                  backgroundColor: expanded ? `${accent}14` : 'transparent',
                  borderColor: expanded
                    ? `${accent}30`
                    : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.1)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? 'Hide audio options' : 'Show audio options'
              }
            >
              <ChevronDown
                size={15}
                color={expanded ? accent : COLORS.muted}
                style={{
                  transform: [{ rotate: expanded ? '180deg' : '0deg' }],
                }}
              />
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

          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: COLORS.muted }]}>
              {afterPlayLabel()} after playback
            </Text>
            <Text
              style={[
                styles.statusText,
                { color: sleepTimerRemaining > 0 ? '#F59E0B' : COLORS.muted },
              ]}
            >
              {sleepTimerRemaining > 0
                ? 'Sleep timer on'
                : `${speechRate}x speed`}
            </Text>
          </View>

          {/* Primary controls */}
          <View style={styles.controlsRow}>
            <CtrlBtn
              onPress={onPrev}
              isDark={isDark}
              disabled={disablePrev}
              accessibilityLabel="Previous verse"
            >
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
              accessibilityRole="button"
              accessibilityLabel={isPaused ? 'Play audio' : 'Pause audio'}
            >
              {isPaused ? (
                <Play size={30} color="#FFF" fill="#FFF" />
              ) : (
                <Pause size={30} color="#FFF" fill="#FFF" />
              )}
            </TouchableOpacity>

            <CtrlBtn
              onPress={onNext}
              isDark={isDark}
              disabled={disableNext}
              accessibilityLabel="Next verse"
            >
              <SkipForward
                size={20}
                color={disableNext ? COLORS.muted : COLORS.text}
                strokeWidth={2.2}
              />
            </CtrlBtn>

            <CtrlBtn
              onPress={onStop}
              isDark={isDark}
              accessibilityLabel="Stop reading"
            >
              <Square size={14} color="#FF3B30" fill="#FF3B30" />
            </CtrlBtn>
          </View>

          {expanded && (
            <View
              style={[
                styles.optionsTray,
                {
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.07)',
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.035)'
                    : 'rgba(0,0,0,0.025)',
                },
              ]}
            >
              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: COLORS.muted }]}>
                  Mode
                </Text>
                <View style={styles.chipRow}>
                  {(['verse', 'selection', 'chapter'] as AudioScope[]).map(
                    item => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => onScopeChange(item)}
                        style={[
                          styles.chip,
                          {
                            borderColor:
                              scope === item ? `${accent}55` : 'transparent',
                            backgroundColor:
                              scope === item
                                ? `${accent}16`
                                : isDark
                                  ? 'rgba(255,255,255,0.07)'
                                  : 'rgba(0,0,0,0.04)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: scope === item ? accent : COLORS.text },
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: COLORS.muted }]}>
                  After
                </Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      ['stop', 'Stop'],
                      ['continue', 'Continue'],
                      ['repeat_one', 'One'],
                      ['repeat', 'All'],
                    ] as [AfterPlayBehaviour, string][]
                  ).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => onAfterPlayChange(value)}
                      style={[
                        styles.chip,
                        {
                          borderColor:
                            afterPlay === value ? `${accent}55` : 'transparent',
                          backgroundColor:
                            afterPlay === value
                              ? `${accent}16`
                              : isDark
                                ? 'rgba(255,255,255,0.07)'
                                : 'rgba(0,0,0,0.04)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: afterPlay === value ? accent : COLORS.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {voiceList && voiceList.length > 0 && (
                <View style={styles.optionRow}>
                  <Text style={[styles.optionLabel, { color: COLORS.muted }]}>
                    Voice
                  </Text>
                  <TouchableOpacity
                    onPress={() => setVoicePickerVisible(true)}
                    style={[
                      styles.voiceSelect,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.07)'
                          : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <Text
                      style={[styles.voiceSelectText, { color: COLORS.text }]}
                      numberOfLines={1}
                    >
                      {voiceList.find(v => v.voiceId === currentVoiceId)
                        ?.name ?? 'Select voice'}
                    </Text>
                    <ChevronDown size={14} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
              )}

              <VoicePickerModal
                visible={voicePickerVisible}
                onClose={() => setVoicePickerVisible(false)}
                voiceList={voiceList ?? []}
                currentVoiceId={currentVoiceId}
                onVoiceSelect={onVoiceSelect ?? (() => {})}
                colors={COLORS}
                isDark={isDark}
              />

              <View style={styles.utilityRow}>
                <View style={styles.btnWithLabel}>
                  <CtrlBtn
                    onPress={onRepeatToggle}
                    isDark={isDark}
                    size={44}
                    accessibilityLabel="Change repeat mode"
                  >
                    {repeatIcon()}
                  </CtrlBtn>
                  <Text style={[styles.btnLabel, { color: COLORS.muted }]}>
                    {repeatLabel()}
                  </Text>
                </View>

                <View style={styles.btnWithLabel}>
                  <CtrlBtn
                    onPress={onSpeedToggle ?? (() => {})}
                    isDark={isDark}
                    size={44}
                    accessibilityLabel="Change reading speed"
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
                    <TouchableOpacity
                      onPress={onSpeedReset ?? (() => {})}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.btnLabel, { color: accent }]}>
                        reset
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.btnLabel, { color: COLORS.muted }]}>
                      Normal
                    </Text>
                  )}
                </View>

                <View style={styles.btnWithLabel}>
                  <CtrlBtn
                    onPress={onSleepTimerToggle ?? (() => {})}
                    isDark={isDark}
                    size={44}
                    accessibilityLabel="Sleep timer"
                  >
                    {sleepIcon()}
                  </CtrlBtn>
                  <Text
                    style={[
                      styles.btnLabel,
                      {
                        color:
                          sleepTimerRemaining > 0 ? '#F59E0B' : COLORS.muted,
                      },
                    ]}
                  >
                    {sleepLabel()}
                  </Text>
                </View>
              </View>
            </View>
          )}
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
  expandBadge: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -6,
    marginBottom: 12,
    gap: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  optionsTray: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  optionRow: {
    gap: 8,
  },
  optionLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  voiceSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  voiceSelectText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 2,
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
    justifyContent: 'center',
    gap: 16,
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
