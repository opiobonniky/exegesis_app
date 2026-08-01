import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MessageSquareQuote,
  Save,
  Share2,
  Timer,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { showToast } from '../../../helpers/Toash.helper';

interface PassageVerse {
  verseNumber: number;
  text: string;
}

interface LookStageProps {
  styles: any;
  colors: any;
  prompts: string[];
  currentPromptIdx: number;
  setCurrentPromptIdx: React.Dispatch<React.SetStateAction<number>>;
  passageRef: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  passageVerses: PassageVerse[];
  passageVersesLoading: boolean;
  lookNotes: string;
  setLookNotes: (value: string) => void;
  saving: boolean;
  savingProgress: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onSaveProgress: () => void;
  onContinue: () => void;
  renderChangePassageActions: () => React.ReactNode;
  renderHighlightedVerseText: (verse: PassageVerse) => React.ReactNode;
}

export default function LookStage({
  styles,
  colors,
  prompts,
  currentPromptIdx,
  setCurrentPromptIdx,
  passageRef,
  bookName,
  chapter,
  verseStart,
  passageVerses,
  passageVersesLoading,
  lookNotes,
  setLookNotes,
  saving,
  savingProgress,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onSaveProgress,
  onContinue,
  renderChangePassageActions,
  renderHighlightedVerseText,
}: LookStageProps) {
  const [copied, setCopied] = useState(false);

  // User-typed notes per prompt index (used for the answered-count badge)
  const promptNotesRef = useRef<Record<number, string>>({});

  // ── Auto-save debounce + "Saved" flash (matches web Look stage) ──────────
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<number>(0);
  const savedFlashRef = useRef<number>(0);

  const handleTextChange = (text: string) => {
    setLookNotes(text);
    promptNotesRef.current[currentPromptIdx] = text;
    setSaved(false);
    // Debounce the "Saved" flash like the web stage (600ms after typing stops).
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSaved(true);
      clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(savedTimerRef.current);
      clearTimeout(savedFlashRef.current);
    };
  }, []);

  // Switch prompt, persisting the current prompt's typed notes per-index so
  // the answered-count badge stays accurate across navigation.
  const switchPrompt = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= prompts.length) return;
    promptNotesRef.current[currentPromptIdx] = lookNotes;
    const nextNotes = promptNotesRef.current[nextIdx] ?? '';
    setLookNotes(nextNotes);
    setCurrentPromptIdx(nextIdx);
    setSaved(false);
    // Clear any pending debounce so a stale timer can't flash "Saved"
    // for content in the newly-loaded prompt that wasn't typed.
    clearTimeout(savedTimerRef.current);
  };

  // Answered-count badge (matches web Look stage). The current prompt's live
  // field is folded in so persisted/resumed notes count immediately without
  // requiring the user to type or switch first.
  const mergedNotes = {
    ...promptNotesRef.current,
    [currentPromptIdx]: lookNotes,
  };
  const answeredCount = Object.keys(mergedNotes).filter(
    k => (mergedNotes[Number(k)] || '').trim().length > 0,
  ).length;
  const hasAnswer = answeredCount > 0;

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

  const handleSharePassage = async () => {
    const text = passageVerses.map(v => `${v.verseNumber} ${v.text}`).join('\n');
    if (!text) return;
    try {
      await Share.share({
        message: `${passageRef || `${bookName} ${chapter}`}\n\n${text}\n\nvia Exegesis Bible App`,
        title: passageRef || `${bookName} ${chapter}`,
      });
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        console.error('Share failed:', e);
        showToast('error', 'Could not share passage');
      }
    }
  };

  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View style={[styles.stageBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Eye size={20} color={colors.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: colors.accent }]}>Step 1 of 4</Text>
        <Text style={[styles.stageTitle, { color: colors.text }]}>Look</Text>
        <Text style={[styles.stageSubtitle, { color: colors.textSecondary }]}>What does the text say?</Text>
        <View style={[styles.passageChip, { backgroundColor: `${colors.accent}10`, marginTop: 6, marginBottom: 4 }]}>
          <Timer size={10} color={colors.accent} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>
            8–12 min
          </Text>
        </View>
        {passageRef && (
          <View style={[styles.passageChip, { backgroundColor: `${colors.primary}15` }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>{passageRef}</Text>
          </View>
        )}
        {renderChangePassageActions()}
      </View>

      {passageVersesLoading ? (
        <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : passageVerses.length > 0 ? (
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
              {passageRef || `${bookName} ${chapter}`}
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
                onPress={handleSharePassage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Share passage text"
                style={[
                  styles.copyPassageBtn,
                  {
                    backgroundColor: `${colors.surface}`,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Share2 size={14} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
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
              {renderHighlightedVerseText(v)}
            </View>
          ))}
        </View>
      ) : null}

      {/* ── SCRIPTURE ── */}
      <View
        style={[
          styles.promptCard,
          { backgroundColor: colors.cardBackground, borderLeftColor: colors.accent },
        ]}
      >
        <View style={styles.promptHeaderRow}>
          <MessageSquareQuote size={16} color={colors.accent} />
          <View style={styles.promptHeaderActions}>
            {hasAnswer && (
              <View
                style={[
                  styles.answeredBadge,
                  {
                    backgroundColor: `${colors.success}12`,
                    borderColor: `${colors.success}35`,
                  },
                ]}
              >
                <CheckCheck size={11} color={colors.success} strokeWidth={2.5} />
                <Text style={[styles.answeredBadgeText, { color: colors.success }]}>
                  {answeredCount}/{prompts.length}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.promptText, { color: colors.text }]}>{prompts[currentPromptIdx]}</Text>
        <View style={styles.promptNav}>
          <TouchableOpacity
            onPress={() => switchPrompt(currentPromptIdx - 1)}
            disabled={currentPromptIdx === 0}
          >
            <ChevronLeft
              size={28}
              color={currentPromptIdx === 0 ? colors.muted : colors.accent}
            />
          </TouchableOpacity>
          <Text style={[styles.promptCounter, { color: colors.muted }]}> 
            {currentPromptIdx + 1} / {prompts.length}
          </Text>
          <TouchableOpacity
            onPress={() => switchPrompt(currentPromptIdx + 1)}
            disabled={currentPromptIdx === prompts.length - 1}
          >
            <ChevronRight
              size={28}
              color={currentPromptIdx === prompts.length - 1 ? colors.muted : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      

      <View style={styles.textareaLabelRow}>
        <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
          Your Observations
        </Text>
        {saved && (
          <View style={styles.savedFlash}>
            <CheckCheck size={11} color={colors.success} strokeWidth={2.5} />
            <Text style={[styles.savedFlashText, { color: colors.success }]}>
              Saved
            </Text>
          </View>
        )}
      </View>
      <View style={styles.textareaWrap}>
        <TextInput
          style={[
            styles.textarea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Write what you observe in this passage..."
          placeholderTextColor={colors.muted}
          value={lookNotes}
          onChangeText={handleTextChange}
          multiline
          textAlignVertical="top"
        />
      </View>

      {lookNotes.trim() && (
        <View style={styles.promptTagRow}>
          <Text style={[styles.promptTag, { color: colors.muted }]}>
            Prompt {currentPromptIdx + 1}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveProgressBtn, { borderColor: colors.muted }]}
        onPress={onSaveProgress}
        disabled={savingProgress}
        activeOpacity={0.7}
      >
        {savingProgress ? (
          <ActivityIndicator size="small" color={colors.muted} />
        ) : (
          <>
            <Save size={14} color={colors.muted} />
            <Text style={[styles.saveProgressText, { color: colors.muted }]}>Save Progress</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        onPress={onContinue}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Continue to Listen</Text>
        )}
      </TouchableOpacity>

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
