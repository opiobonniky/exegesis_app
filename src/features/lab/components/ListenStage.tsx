import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ear,
  Languages,
  Pause,
  Play,
  ScrollText,
  Volume2,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { LISTEN_OPTIONS } from '../constants';
import WaveformAnimation from '../../../components/WaveformAnimation';
import { showToast } from '../../../helpers/Toash.helper';
import StageHeader from './StageHeader';
import { TTSVoice } from '../../../services/ttsService';
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
  onStart: () => void;
  onToggle: () => void;
  onReset: () => void;
  onAdvance: () => void;
  /** Stop audio and move to the next stage (skip remaining repeats). */
  onSkip: () => void;
  /** Stop audio and move back to the previous stage (Look). */
  onBack: () => void;
  /** Available narration voices (same list as the Bible reader's audio bar). */
  voiceList: TTSVoice[];
  currentVoiceId?: string;
  onVoiceSelect?: (voiceId: string) => void;
}

export default function ListenStage({
  styles,
  colors,
  passageRef,
  bookName,
  chapter,
  verseStart,
  passageVerses,
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
  onStart,
  onToggle,
  onReset,
  onAdvance,
  onSkip,
  onBack,
  voiceList,
  currentVoiceId,
  onVoiceSelect,
}: ListenStageProps) {
  const isPreparingAudio = audioStarting && !isPlaying && !isPaused;
  const selectedLabel =
    LISTEN_OPTIONS.find(o => o.value === selectedRepeats)?.label || `${selectedRepeats}x`;
  const [copied, setCopied] = useState(false);
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState('');

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

  const [studyExpanded, setStudyExpanded] = useState(false);
  const [translations, setTranslations] = useState<TranslationComparisonEntry[] | null>(null);
  const [verseResources, setVerseResources] = useState<VerseResourceData | null>(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [copiedCommentary, setCopiedCommentary] = useState(false);
  const copiedCommentaryTimerRef = useRef<number>(0);

  useEffect(() => {
    return () => clearTimeout(copiedCommentaryTimerRef.current);
  }, []);

  useEffect(() => {
    setStudyExpanded(false);
    setTranslations(null);
    setVerseResources(null);
    setStudyLoading(false);
    setCopiedCommentary(false);
  }, [bookName, chapter, verseStart]);

  const toggleStudyTools = () => {
    setStudyExpanded(!studyExpanded);
    if (!translations && !verseResources && !studyLoading && bookName && chapter) {
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

  const handleCopyCommentary = (text: string, author: string, title: string) => {
    const ref = passageRef || `${bookName} ${chapter}:${verseStart}`;
    const attribution = `${text}\n\n— ${author}, ${title} (commentary on ${ref})`;
    try {
      Clipboard.setString(attribution);
      setCopiedCommentary(true);
      showToast('success', 'Commentary copied with attribution');
      clearTimeout(copiedCommentaryTimerRef.current);
      copiedCommentaryTimerRef.current = setTimeout(() => setCopiedCommentary(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
      showToast('error', 'Could not copy commentary');
    }
  };

  return (
    <View style={styles.stageContainer}>
      {/* ── Stage Header ─────────────────────────────────────────────────── */}
      <StageHeader
        Icon={Ear}
        step={2}
        total={5}
        title="Listen"
        subtitle="Be still and dwell in the Word"
        timeLabel="5–15 min"
        colors={colors}
        accentColor={colors.accent}
      />

      {/* ── Passage Text Card ────────────────────────────────────────────── */}
      {passageVerses.length > 0 && (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: colors.surface,
              borderColor: `${colors.primaryOnSurface ?? colors.primary}40`,
            },
          ]}
        >
          <View style={[styles.passageTextHeader, { borderBottomColor: `${colors.primaryOnSurface ?? colors.primary}20` }]}>
            <BookOpen size={15} color={colors.primaryOnSurface ?? colors.primary} strokeWidth={2.2} />
            <Text style={[styles.passageTextLabel, { color: colors.primaryOnSurface ?? colors.primary }]}>
              {passageRef || 'Passage'}
            </Text>
            <View style={styles.passageTextHeaderRight}>
              {verseRange && (
                <View
                  style={[
                    styles.verseRangeChip,
                    {
                      backgroundColor: `${colors.primaryOnSurface ?? colors.primary}15`,
                      borderColor: `${colors.primaryOnSurface ?? colors.primary}30`,
                    },
                  ]}
                >
                  <Text style={[styles.verseRangeChipText, { color: colors.primaryOnSurface ?? colors.primary }]}>
                    {verseRange}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleCopyPassage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.copyPassageBtn,
                  {
                    backgroundColor: copied ? 'rgba(34,197,94,0.12)' : colors.surface,
                    borderColor: copied ? 'rgba(34,197,94,0.4)' : colors.border,
                  },
                ]}
              >
                {copied ? (
                  <Check size={18} color="#22C55E" strokeWidth={2.2} />
                ) : (
                  <Copy size={18} color={colors.primaryOnSurface ?? colors.primary} strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {passageVerses.map(v => (
            <View key={v.verseNumber} style={styles.passageVerseRow}>
              <Text style={[styles.passageVerseNum, { color: colors.primaryOnSurface ?? colors.primary }]}>
                {v.verseNumber}
              </Text>
              <Text style={[styles.passageVerseText, { color: colors.text, flex: 1 }]}>
                {v.text}
              </Text>
            </View>
          ))}

          {/* ── Translations & Commentary (expandable) ──────────────────── */}
          <View style={[styles.listenStudySection, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={toggleStudyTools}
              activeOpacity={0.7}
              style={styles.listenStudyHeader}
            >
              <Languages size={14} color={colors.primaryOnSurface ?? colors.primary} strokeWidth={2.5} />
              <Text style={[styles.listenStudyLabel, { color: colors.primaryOnSurface ?? colors.primary }]}>
                Translations & Commentary
              </Text>
              {studyLoading ? (
                <ActivityIndicator size="small" color={colors.primaryOnSurface ?? colors.primary} />
              ) : (
                <ChevronDown
                  size={15}
                  color={colors.primaryOnSurface ?? colors.primary}
                  style={{ transform: [{ rotate: studyExpanded ? '180deg' : '0deg' }] }}
                />
              )}
            </TouchableOpacity>
            {studyExpanded && (
              <View style={[styles.listenStudyBody, { borderTopColor: colors.border }]}>
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
                              { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primaryOnSurface ?? colors.primary },
                            ]}
                          >
                            <View style={[styles.translationBadge, { backgroundColor: `${colors.primaryOnSurface ?? colors.primary}15` }]}>
                              <Text style={[styles.translationBadgeText, { color: colors.primaryOnSurface ?? colors.primary }]}>
                                {t.abbreviation}
                              </Text>
                            </View>
                            <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>{t.version}</Text>
                            <Text style={[styles.translationText, { color: colors.textSecondary }]}>
                              “{t.text}”
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {verseResources && verseResources.commentaries.length > 0 && (
                      <View>
                        <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Commentary</Text>
                        {verseResources.commentaries.map((c, i) => (
                          <View
                            key={i}
                            style={[
                              styles.resourceCard,
                              { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.accent },
                            ]}
                          >
                            <View style={styles.commentaryHeaderRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.resourceCardAuthor, { color: colors.text }]}>{c.author}</Text>
                                <Text style={[styles.resourceCardTitle, { color: colors.textSecondary }]}>{c.title}</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleCopyCommentary(c.text, c.author, c.title)}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                  styles.commentaryCopyBtn,
                                  {
                                    backgroundColor: copiedCommentary ? 'rgba(34,197,94,0.12)' : colors.surface,
                                    borderColor: copiedCommentary ? 'rgba(34,197,94,0.4)' : colors.border,
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
                      (!verseResources || verseResources.commentaries.length === 0) && (
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
          {/* ── Reading Voice + Stage navigation (always available) ─────── */}
          {voiceList.length > 0 && (
            <TouchableOpacity
              onPress={() => setVoicePickerVisible(true)}
              activeOpacity={0.7}
              style={[
                styles.listenVoiceRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.listenVoiceIcon,
                  { backgroundColor: `${colors.accent}18` },
                ]}
              >
                <Volume2 size={17} color={colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listenVoiceLabel, { color: colors.muted }]}>
                  Reading Voice
                </Text>
                <Text style={[styles.listenVoiceName, { color: colors.text }]} numberOfLines={1}>
                  {voiceList.find(v => v.voiceId === currentVoiceId)?.name || 'Select voice'}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
          )}

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

          {(isPlaying || audioStarting) && (
            <View style={{ alignItems: 'center', paddingTop: SPACING.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.lg }}>
                <Volume2 size={18} color={colors.accent} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  {isPaused ? 'Paused' : 'Now Playing'}
                </Text>
              </View>

              <WaveformAnimation active={!isPaused} barCount={10} size={16} color={colors.accent} mutedColor={colors.muted} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.xl }}>
                {Array.from({ length: selectedRepeats }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: 16, borderWidth: 3,
                      borderColor: i < repeatCount ? colors.accent : i === repeatCount ? colors.accent : colors.border,
                      backgroundColor: i < repeatCount ? colors.accent : i === repeatCount ? `${colors.accent}30` : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: i < repeatCount ? '#FFFFFF' : i === repeatCount ? colors.text : colors.muted, fontSize: 13, fontWeight: '800' }}>
                      {i + 1}
                    </Text>
                  </View>
                ))}
              </View>

              {audioStarting && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.lg }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Loading audio...</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
                {!audioStarting && (
                  <TouchableOpacity
                    style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
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
                {!audioStarting && (
                  <TouchableOpacity
                    style={{ height: 44, paddingHorizontal: SPACING.lg, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
                    onPress={onReset}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '700' }}>Reset</Text>
                  </TouchableOpacity>
                )}
                {!audioStarting && (
                  <TouchableOpacity
                    style={{ height: 44, paddingHorizontal: SPACING.lg, borderRadius: 22, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: `${colors.accent}15`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                    onPress={onSkip}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <>
                        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>
                          Skip &amp; Continue
                        </Text>
                        <ChevronRight size={16} color={colors.accent} strokeWidth={2.4} />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: SPACING.md }}>
                Reading {repeatCount + 1} of {selectedRepeats}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.amenContainer}>
          <View style={[styles.amenCircle, { backgroundColor: `${colors.accent}20` }]}>
            <CheckCircle2 size={48} color={colors.accent} />
          </View>
          <Text style={[styles.amenText, { color: colors.text }]}>Amen</Text>
          <Text style={[styles.amenSubtext, { color: colors.textSecondary }]}>
            You have dwelled in the Word.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: SPACING.lg }}>
            The passage was read {repeatCount} time{repeatCount !== 1 ? 's' : ''}.
          </Text>

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

          {/* ── Replay option (re-read the passage) ─────────────────────── */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: colors.accent,
                marginTop: SPACING.md,
              },
            ]}
            onPress={onStart}
            disabled={isPreparingAudio}
            activeOpacity={0.8}
          >
            {isPreparingAudio ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Play size={18} color={colors.accent} />
                <Text style={[styles.primaryBtnText, { color: colors.accent }]}>
                  Replay the Passage
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onReset}
            activeOpacity={0.7}
            style={{ marginTop: SPACING.md }}
          >
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>
              Change reading times
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stage navigation (back to Look / forward to Learn) ──────────── */}
      <View style={styles.listenStageNav}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={[
            styles.listenStageNavBtn,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <ChevronLeft size={17} color={colors.textSecondary} strokeWidth={2.4} />
          <Text style={[styles.listenStageNavText, { color: colors.textSecondary }]}>
            Look
          </Text>
        </TouchableOpacity>
        <Text style={[styles.listenStageNavTitle, { color: colors.muted }]}>
          Step 2 of {stageOrder.length}
        </Text>
        <TouchableOpacity
          onPress={onSkip}
          disabled={saving}
          activeOpacity={0.7}
          style={[
            styles.listenStageNavBtn,
            { borderColor: `${colors.accent}60`, backgroundColor: `${colors.accent}12` },
          ]}
        >
          <Text style={[styles.listenStageNavText, { color: colors.accent }]}>
            Learn
          </Text>
          <ChevronRight size={17} color={colors.accent} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* ── Voice picker (mirrors the Bible reader's audio bar) ─────────── */}
      <Modal visible={voicePickerVisible} transparent animationType="slide">
        <View style={localStyles.overlay}>
          <View
            style={[
              localStyles.sheet,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={localStyles.sheetHeader}>
              <Text style={[localStyles.sheetTitle, { color: colors.text }]}>
                Select Reading Voice
              </Text>
              <TouchableOpacity onPress={() => setVoicePickerVisible(false)}>
                <Text style={[localStyles.sheetClose, { color: colors.muted }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                localStyles.searchBox,
                { backgroundColor: `${colors.muted}15` },
              ]}
            >
              <TextInput
                style={[localStyles.searchInput, { color: colors.text }]}
                value={voiceSearch}
                onChangeText={setVoiceSearch}
                placeholder="Search voices…"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={voiceSearch.trim()
                ? voiceList.filter(v =>
                    v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                    v.voiceId.toLowerCase().includes(voiceSearch.toLowerCase()),
                  )
                : voiceList}
              keyExtractor={item => item.voiceId}
              renderItem={({ item }) => {
                const active = currentVoiceId === item.voiceId;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onVoiceSelect?.(item.voiceId);
                      setVoicePickerVisible(false);
                      setVoiceSearch('');
                    }}
                    style={[
                      localStyles.item,
                      {
                        backgroundColor: active
                          ? `${colors.accent}14`
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={localStyles.itemContent}>
                      <Text
                        style={[
                          localStyles.itemName,
                          { color: active ? colors.accent : colors.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[localStyles.itemId, { color: colors.muted }]}>
                        {item.voiceId}
                      </Text>
                    </View>
                    {active && (
                      <View
                        style={[
                          localStyles.check,
                          { backgroundColor: colors.accent },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={localStyles.list}
            />
          </View>
        </View>
      </Modal>

      {/* ── Page Indicator Dots ─────────────────────────────────────────── */}
      <View style={styles.pageIndicator}>
        {stageOrder.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor: idx === pageIndex ? colors.accent : colors.muted,
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

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '68%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetClose: {
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