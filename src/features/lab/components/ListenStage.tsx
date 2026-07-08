import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Ear,
  Lock,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { LISTEN_OPTIONS } from '../constants';

interface ListenStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  passageVersesCount: number;
  selectedDuration: number;
  setSelectedDuration: (value: number) => void;
  timerRunning: boolean;
  timerPaused: boolean;
  timerElapsed: number;
  timerComplete: boolean;
  repeatCount: number;
  hasSavedProgress: boolean;
  animatedValue: Animated.Value;
  audioStarting: boolean;
  isTtsPlaying: boolean;
  isTtsPaused: boolean;
  saving: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  renderChangePassageActions: () => React.ReactNode;
  onBeginTimer: () => void;
  onResumeTimer: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onReplayPassageAudio: () => void;
  onContinue: () => void;
}

const formatTimeStr = (m: number, s: number) =>
  `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

export default function ListenStage({
  styles,
  colors,
  passageRef,
  passageVersesCount,
  selectedDuration,
  setSelectedDuration,
  timerRunning,
  timerPaused,
  timerElapsed,
  timerComplete,
  repeatCount,
  hasSavedProgress,
  animatedValue,
  audioStarting,
  isTtsPlaying,
  isTtsPaused,
  saving,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  renderChangePassageActions,
  onBeginTimer,
  onResumeTimer,
  onToggleTimer,
  onResetTimer,
  onReplayPassageAudio,
  onContinue,
}: ListenStageProps) {
  const remaining = selectedDuration - timerElapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = selectedDuration > 0 ? timerElapsed / selectedDuration : 0;
  const selectedDurationLabel =
    LISTEN_OPTIONS.find(o => o.value === selectedDuration)?.label || '';
  const isPreparingAudio = audioStarting && !isTtsPlaying && !isTtsPaused;

  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View
          style={[styles.stageBadge, { backgroundColor: `${colors.accent}20` }]}
        >
          <Ear size={20} color={colors.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: colors.accent }]}>
          Step 2 of 4
        </Text>
        <Text style={[styles.stageTitle, { color: colors.text }]}>Listen</Text>
        <Text style={[styles.stageSubtitle, { color: colors.textSecondary }]}>
          Be still and dwell in the Word
        </Text>
        {passageRef && (
          <View
            style={[
              styles.passageChip,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>
              {passageRef}
            </Text>
          </View>
        )}
        {renderChangePassageActions()}
      </View>

      {!timerComplete ? (
        <>
          {!timerRunning && !timerPaused && (
            <>
              {hasSavedProgress ? (
                <>
                  <View style={[styles.learnContent, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', marginBottom: SPACING.md }]}>
                    <Text style={[styles.learnText, { color: colors.textSecondary, textAlign: 'center' }]}>
                      You have {formatTimeStr(Math.floor(remaining / 60), remaining % 60)} remaining
                      {repeatCount > 0 ? ` · Read ${repeatCount}x` : ''}
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: SPACING.sm, marginBottom: 0 }]}
                      onPress={onResumeTimer}
                      disabled={isPreparingAudio}
                      activeOpacity={0.8}
                    >
                      {isPreparingAudio ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Play size={18} color="#FFFFFF" />
                      )}
                      <Text style={styles.primaryBtnText}>
                        {isPreparingAudio ? 'Preparing Reader...' : 'Resume Reading'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
                    Or choose a new duration
                  </Text>
                  <View style={styles.durationRow}>
                    {LISTEN_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.durationChip,
                          selectedDuration === opt.value
                            ? { backgroundColor: colors.accent, borderColor: colors.accent }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                        onPress={() => setSelectedDuration(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.durationChipText,
                            { color: selectedDuration === opt.value ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
                    How long would you like to dwell in the Word?
                  </Text>
                  <View style={styles.durationRow}>
                    {LISTEN_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.durationChip,
                          selectedDuration === opt.value
                            ? { backgroundColor: colors.accent, borderColor: colors.accent }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                        onPress={() => setSelectedDuration(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.durationChipText,
                            { color: selectedDuration === opt.value ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                    onPress={onBeginTimer}
                    disabled={isPreparingAudio}
                    activeOpacity={0.8}
                  >
                    {isPreparingAudio ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Play size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryBtnText}>
                      {isPreparingAudio ? 'Preparing Reader...' : `Begin ${selectedDurationLabel} Reading`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {(timerRunning || timerPaused) && (
            <View style={styles.timerContainer}>
              <View style={styles.swipeHintRow}>
                {timerRunning && !timerPaused ? (
                  <>
                    <Lock
                      size={12}
                      color={colors.muted}
                      style={{ opacity: 0.5 }}
                    />
                    <Text
                      style={[styles.swipeHintText, { color: colors.muted }]}
                    >
                      Focus mode — swipe locked while timer runs
                    </Text>
                  </>
                ) : (
                  <>
                    <ChevronLeft
                      size={12}
                      color={colors.muted}
                      style={{ opacity: 0.4 }}
                    />
                    <Text
                      style={[styles.swipeHintText, { color: colors.muted }]}
                    >
                      Swipe to explore other stages
                    </Text>
                    <ChevronRight
                      size={12}
                      color={colors.muted}
                      style={{ opacity: 0.4 }}
                    />
                  </>
                )}
              </View>

              <Animated.View
                style={[
                  styles.circleOuter,
                  {
                    borderColor: colors.accent,
                    opacity: animatedValue,
                    transform: [{ scale: animatedValue }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.circleInner,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <Text style={[styles.timerText, { color: colors.text }]}>
                    {formatTimeStr(minutes, seconds)}
                  </Text>
                  <Text style={[styles.timerLabel, { color: colors.muted }]}>
                    remaining
                  </Text>

                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: colors.accent,
                        },
                      ]}
                    />
                  </View>
                  {repeatCount > 0 && (
                    <Text style={[{ color: colors.muted, marginTop: 6, fontSize: 11, fontWeight: '600', textAlign: 'center' }]}>
                      Read {repeatCount}x
                    </Text>
                  )}
                </View>
              </Animated.View>

              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={[
                    styles.timerBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={onToggleTimer}
                  activeOpacity={0.7}
                >
                  {timerPaused || !timerRunning ? (
                    <Play size={24} color={colors.accent} />
                  ) : (
                    <Pause size={24} color={colors.accent} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timerBtnSmall,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={onResetTimer}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.timerBtnSmallText, { color: colors.error }]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.amenContainer}>
          <View
            style={[
              styles.amenCircle,
              { backgroundColor: `${colors.accent}20` },
            ]}
          >
            <CheckCircle2 size={48} color={colors.accent} />
          </View>
          <Text style={[styles.amenText, { color: colors.text }]}>Amen</Text>
          <Text style={[styles.amenSubtext, { color: colors.textSecondary }]}>
            You have dwelled in the Word for{' '}
            {formatTimeStr(
              Math.floor(selectedDuration / 60),
              selectedDuration % 60,
            )}
            .
          </Text>

          {passageVersesCount > 0 && (
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  borderColor: colors.accent,
                  marginBottom: SPACING.sm,
                  paddingHorizontal: SPACING.md,
                },
              ]}
              onPress={onReplayPassageAudio}
              disabled={audioStarting}
              activeOpacity={0.7}
            >
              {audioStarting ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <RotateCcw size={16} color={colors.accent} />
              )}
              <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
                {audioStarting ? 'Preparing Reader...' : 'Replay Passage'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={onContinue}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Brain size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Continue to Learn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.pageIndicator}>
        {stageOrder.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (idx - 1) * screenWidth,
              idx * screenWidth,
              (idx + 1) * screenWidth,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [
              (idx - 1) * screenWidth,
              idx * screenWidth,
              (idx + 1) * screenWidth,
            ],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor:
                    idx === pageIndex ? colors.accent : colors.muted,
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  width: idx === pageIndex ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
