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
  Ear,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { LISTEN_OPTIONS } from '../constants';

interface ListenStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  passageVersesCount: number;
  selectedRepeats: number;
  setSelectedRepeats: (value: number) => void;
  repeatCount: number;
  listenComplete: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  audioStarting: boolean;
  saving: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: any;
  screenWidth: number;
  renderChangePassageActions: () => React.ReactNode;
  onStart: () => void;
  onToggle: () => void;
  onReset: () => void;
  onReplay: () => void;
  onAdvance: () => void;
}

export default function ListenStage({
  styles,
  colors,
  passageRef,
  passageVersesCount,
  selectedRepeats,
  setSelectedRepeats,
  repeatCount,
  listenComplete,
  isPlaying,
  isPaused,
  audioStarting,
  saving,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  renderChangePassageActions,
  onStart,
  onToggle,
  onReset,
  onReplay,
  onAdvance,
}: ListenStageProps) {
  const isPreparingAudio = audioStarting && !isPlaying && !isPaused;
  const selectedLabel =
    LISTEN_OPTIONS.find(o => o.value === selectedRepeats)?.label || `${selectedRepeats}x`;

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

      {!listenComplete ? (
        <>
          {/* Before playing — repeat selection */}
          {!isPlaying && !audioStarting && (
            <>
              {repeatCount > 0 ? (
                <View style={[styles.learnContent, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', marginBottom: SPACING.md }]}>
                  <Text style={[styles.learnText, { color: colors.textSecondary, textAlign: 'center' }]}>
                    You completed {repeatCount} of {selectedRepeats} readings
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: SPACING.sm, marginBottom: 0 }]}
                    onPress={onStart}
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
              ) : (
                <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
                  How many times would you like to hear the passage?
                </Text>
              )}

              <View style={styles.durationRow}>
                {LISTEN_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.durationChip,
                      selectedRepeats === opt.value
                        ? { backgroundColor: colors.accent, borderColor: colors.accent }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setSelectedRepeats(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        { color: selectedRepeats === opt.value ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {repeatCount === 0 && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                  onPress={onStart}
                  disabled={isPreparingAudio}
                  activeOpacity={0.8}
                >
                  {isPreparingAudio ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Play size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {isPreparingAudio ? 'Preparing Reader...' : `Begin ${selectedLabel} Reading`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Playing / paused state */}
          {(isPlaying || audioStarting) && (
            <View style={{ alignItems: 'center', paddingTop: SPACING.xl }}>
              {/* Now Playing info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.lg }}>
                <Volume2 size={18} color={colors.accent} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  {isPaused ? 'Paused' : 'Now Playing'}
                </Text>
              </View>

              {/* Repeat progress dots */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.xl }}>
                {Array.from({ length: selectedRepeats }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      borderWidth: 3,
                      borderColor: i < repeatCount
                        ? colors.accent
                        : i === repeatCount
                          ? colors.accent
                          : colors.border,
                      backgroundColor: i < repeatCount
                        ? colors.accent
                        : i === repeatCount
                          ? `${colors.accent}30`
                          : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: i < repeatCount ? '#FFFFFF' : i === repeatCount ? colors.text : colors.muted,
                        fontSize: 13,
                        fontWeight: '800',
                      }}
                    >
                      {i + 1}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Audio loading indicator */}
              {audioStarting && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.lg }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    Loading audio...
                  </Text>
                </View>
              )}

              {/* Play/Pause button */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
                {!audioStarting && (
                  <TouchableOpacity
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.surface,
                      borderWidth: 2,
                      borderColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={onToggle}
                    activeOpacity={0.7}
                  >
                    {isPaused ? (
                      <Play size={32} color={colors.accent} style={{ marginLeft: 3 }} />
                    ) : (
                      <Pause size={32} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                )}

                {/* Reset button */}
                {!audioStarting && (
                  <TouchableOpacity
                    style={{
                      height: 44,
                      paddingHorizontal: SPACING.lg,
                      borderRadius: 22,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={onReset}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '700' }}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Repeat count label */}
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: SPACING.md }}>
                Reading {repeatCount + 1} of {selectedRepeats}
              </Text>
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
            You have dwelled in the Word.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: SPACING.lg }}>
            The passage was read {repeatCount} time{repeatCount !== 1 ? 's' : ''}.
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
              onPress={onReplay}
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
            onPress={onAdvance}
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
