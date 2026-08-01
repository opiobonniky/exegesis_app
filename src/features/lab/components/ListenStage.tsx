import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Ear,
  Languages,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Volume2,
  Timer,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { LISTEN_OPTIONS } from '../constants';
import WaveformAnimation from '../../../components/WaveformAnimation';
import { showToast } from '../../../helpers/Toash.helper';
import {
  getTranslationComparison,
  getVerseResources,
  TranslationComparisonEntry,
  VerseResourceData,
} from '../../../services/verseResourcesApi';

interface PassageVerse {
  verseNumber: number;
  text: string;
}

interface ListenStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  passageVerses: PassageVerse[];
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
  bookName,
  chapter,
  verseStart,
  passageVerses,
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
  const [copied, setCopied] = useState(false);

  const parsedVerse =
    passageVerses.length > 0 ? passageVerses[0].verseNumber : Number(verseStart) || 1;

  const verseRange =
    passageVerses.length === 0
      ? null
      : passageVerses[0].verseNumber ===
        passageVerses[passageVerses.length - 1].verseNumber
        ? `v. ${passageVerses[0].verseNumber}`
        : `vv. ${passageVerses[0].verseNumber}–${passageVerses[passageVerses.length - 1].verseNumber}`;

  const handleCopyPassage = () => {
    const text = passageVerses.map(v => `${v.verseNumber} ${v.text}`).join('\n');
    if (!text) return;
    try {
      Clipboard.setString(text);
      setCopied(true);
      showToast('success', 'Passage copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
      showToast('error', 'Could not copy passage');
    }
  };

  // ── Translations + commentary (expandable, lazy-loaded) ─────────────────
  const [studyExpanded, setStudyExpanded] = useState(false);
  const [translations, setTranslations] = useState<
    TranslationComparisonEntry[] | null
  >(null);
  const [verseResources, setVerseResources] = useState<VerseResourceData | null>(
    null,
  );
  const [studyLoading, setStudyLoading] = useState(false);
  const [copiedCommentary, setCopiedCommentary] = useState(false);
  const copiedCommentaryTimerRef = useRef<number>(0);

  useEffect(() => {
    return () => clearTimeout(copiedCommentaryTimerRef.current);
  }, []);

  // Reset the expandable study-tools state when the passage changes so a
  // new passage never shows the previous passage's translations/commentary.
  useEffect(() => {
    setStudyExpanded(false);
    setTranslations(null);
    setVerseResources(null);
    setStudyLoading(false);
    setCopiedCommentary(false);
  }, [bookName, chapter, verseStart]);

  const toggleStudyTools = () => {
    setStudyExpanded(!studyExpanded);
    if (
      !translations &&
      !verseResources &&
      !studyLoading &&
      bookName &&
      chapter
    ) {
      setStudyLoading(true);
      const ch = Number(chapter);
      const vs = parsedVerse;
      Promise.allSettled([
        getTranslationComparison(bookName, ch, vs),
        getVerseResources(bookName, ch, vs),
      ])
        .then(([tRes, rRes]) => {
          if (tRes.status === 'fulfilled' && tRes.value?.returnData) {
            setTranslations(tRes.value.returnData);
          }
          if (rRes.status === 'fulfilled' && rRes.value?.returnData) {
            setVerseResources(rRes.value.returnData);
          }
        })
        .catch(() => {})
        .finally(() => setStudyLoading(false));
    }
  };

  const handleCopyCommentary = (
    text: string,
    author: string,
    title: string,
  ) => {
    const ref = passageRef || `${bookName} ${chapter}:${verseStart}`;
    const attribution = `${text}\n\n— ${author}, ${title} (commentary on ${ref})`;
    try {
      Clipboard.setString(attribution);
      setCopiedCommentary(true);
      showToast('success', 'Commentary copied with attribution');
      clearTimeout(copiedCommentaryTimerRef.current);
      copiedCommentaryTimerRef.current = setTimeout(
        () => setCopiedCommentary(false),
        2000,
      );
    } catch (e) {
      console.error('Copy failed:', e);
      showToast('error', 'Could not copy commentary');
    }
  };

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
        <View style={[styles.passageChip, { backgroundColor: `${colors.accent}10`, marginTop: 6, marginBottom: 4 }]}>
          <Timer size={10} color={colors.accent} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>
            5–15 min
          </Text>
        </View>
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

      {/* Passage text (follow-along display) */}
      {passageVerses.length > 0 && (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.passageTextHeader, { borderBottomColor: colors.border }]}>
            <BookOpen size={14} color={colors.primary} />
            <Text style={[styles.passageTextLabel, { color: colors.primary }]}>
              {passageRef || 'Passage'}
            </Text>
            <View style={styles.passageTextHeaderRight}>
              {verseRange && (
                <View
                  style={[
                    styles.verseRangeChip,
                    {
                      backgroundColor: `${colors.primary}15`,
                      borderColor: `${colors.primary}30`,
                    },
                  ]}
                >
                  <Text style={[styles.verseRangeChipText, { color: colors.primary }]}>
                    {verseRange}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleCopyPassage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Copy passage text"
                style={[
                  styles.copyPassageBtn,
                  {
                    backgroundColor: copied ? 'rgba(34,197,94,0.12)' : `${colors.surface}`,
                    borderColor: copied ? 'rgba(34,197,94,0.4)' : colors.border,
                  },
                ]}
              >
                {copied ? (
                  <Check size={14} color="#22C55E" strokeWidth={2.5} />
                ) : (
                  <Copy size={14} color={colors.primary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {passageVerses.map(v => (
            <View key={v.verseNumber} style={styles.passageVerseRow}>
              <Text style={[styles.passageVerseNum, { color: colors.muted }]}>
                {v.verseNumber}
              </Text>
              <Text style={[styles.passageVerseText, { color: colors.text, flex: 1 }]}>
                {v.text}
              </Text>
            </View>
          ))}

          {/* ── Translations + Commentary (expandable, lazy-loaded) ── */}
          <View
            style={[
              styles.listenStudySection,
              { borderTopColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={toggleStudyTools}
              activeOpacity={0.7}
              style={styles.listenStudyHeader}
            >
              <Languages size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.listenStudyLabel, { color: colors.primary }]}>
                Translations & Commentary
              </Text>
              {studyLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <ChevronDown
                  size={15}
                  color={colors.primary}
                  style={{
                    transform: [
                      { rotate: studyExpanded ? '180deg' : '0deg' },
                    ],
                  }}
                />
              )}
            </TouchableOpacity>
            {studyExpanded && (
              <View
                style={[
                  styles.listenStudyBody,
                  { borderTopColor: colors.border },
                ]}
              >
                {studyLoading ? (
                  <Text style={[styles.aiTipText, { color: colors.muted, fontStyle: 'italic' }]}>
                    Loading translations...
                  </Text>
                ) : (
                  <>
                    {translations && translations.length > 0 && (
                      <View style={{ marginBottom: SPACING.md }}>
                        <Text style={[styles.learnSectionTitle, { color: colors.text }]}>
                          Translation Comparison
                        </Text>
                        {translations.map((t, i) => (
                          <View
                            key={i}
                            style={[
                              styles.resourceCard,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                borderLeftColor: colors.primary,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.translationBadge,
                                { backgroundColor: `${colors.primary}15` },
                              ]}
                            >
                              <Text style={[styles.translationBadgeText, { color: colors.primary }]}>
                                {t.abbreviation}
                              </Text>
                            </View>
                            <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>
                              {t.version}
                            </Text>
                            <Text style={[styles.translationText, { color: colors.textSecondary }]}>
                              “{t.text}”
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {verseResources && verseResources.commentaries.length > 0 && (
                      <View>
                        <Text style={[styles.learnSectionTitle, { color: colors.text }]}>
                          Commentary
                        </Text>
                        {verseResources.commentaries.map((c, i) => (
                          <View
                            key={i}
                            style={[
                              styles.resourceCard,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                borderLeftColor: colors.accent,
                              },
                            ]}
                          >
                            <View style={styles.commentaryHeaderRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.resourceCardAuthor, { color: colors.text }]}>
                                  {c.author}
                                </Text>
                                <Text style={[styles.resourceCardTitle, { color: colors.textSecondary }]}>
                                  {c.title}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() =>
                                  handleCopyCommentary(c.text, c.author, c.title)
                                }
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Copy commentary with attribution"
                                style={[
                                  styles.commentaryCopyBtn,
                                  {
                                    backgroundColor:
                                      copiedCommentary ? 'rgba(34,197,94,0.12)' : colors.surface,
                                    borderColor:
                                      copiedCommentary ? 'rgba(34,197,94,0.4)' : colors.border,
                                  },
                                ]}
                              >
                                {copiedCommentary ? (
                                  <Check size={13} color="#22C55E" strokeWidth={2.5} />
                                ) : (
                                  <Copy size={13} color={colors.muted} strokeWidth={2.5} />
                                )}
                              </TouchableOpacity>
                            </View>
                            <View style={[styles.dividerThin, { backgroundColor: colors.border }]} />
                            <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>
                              {c.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {(!translations || translations.length === 0) &&
                      (!verseResources ||
                        verseResources.commentaries.length === 0) && (
                        <View style={styles.listenStudyEmpty}>
                          <ScrollText size={18} color={colors.muted} />
                          <Text style={[styles.aiTipText, { color: colors.muted, fontStyle: 'italic' }]}>
                            No translations or commentary available for this passage.
                          </Text>
                        </View>
                      )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      )}

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

              {/* Waveform animation bars (visual feedback) */}
              <WaveformAnimation active={!isPaused} barCount={10} size={16} color={colors.accent} mutedColor={colors.muted} />


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
