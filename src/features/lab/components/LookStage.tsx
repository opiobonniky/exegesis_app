import React, { useRef, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MessageSquareQuote,
  NotebookPen,
  Save,
  Share2,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { showToast } from '../../../helpers/Toash.helper';
import StageHeader from './StageHeader';

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
  passageVerses: PassageVerse[];
  passageVersesLoading: boolean;
  lookNotes: string;
  setLookNotes: (value: string) => void;
  observations: string;
  setObservations: (value: string) => void;
  saving: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onSaveProgress: () => void;
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
  passageVerses,
  passageVersesLoading,
  lookNotes,
  setLookNotes,
  observations,
  setObservations,
  saving,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onSaveProgress,
  renderHighlightedVerseText,
}: LookStageProps) {
  const [copied, setCopied] = useState(false);

  const promptNotesRef = useRef<Record<number, string>>({});

  const handleTextChange = (text: string) => {
    setLookNotes(text);
    promptNotesRef.current[currentPromptIdx] = text;
  };

  const switchPrompt = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= prompts.length) return;
    promptNotesRef.current[currentPromptIdx] = lookNotes;
    const nextNotes = promptNotesRef.current[nextIdx] ?? '';
    setLookNotes(nextNotes);
    setCurrentPromptIdx(nextIdx);
  };

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
      {/* ── Stage Header ─────────────────────────────────────────────────── */}
      <StageHeader
        Icon={Eye}
        step={1}
        total={5}
        title="Look"
        subtitle="What does the text say?"
        timeLabel="8–12 min"
        colors={colors}
        accentColor={colors.primaryOnSurface ?? colors.primary}
      />

      {/* ── Scripture Passage Card ──────────────────────────────────────── */}
      {passageVersesLoading ? (
        <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : passageVerses.length > 0 ? (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: colors.surface,
              borderColor: `${colors.primaryOnSurface ?? colors.primary}40`,
            },
          ]}
        >
          <View
            style={[
              styles.passageTextHeader,
              {
                borderBottomColor: `${colors.primaryOnSurface ?? colors.primary}20`,
              },
            ]}
          >
            <BookOpen
              size={15}
              color={colors.primaryOnSurface ?? colors.primary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.passageTextLabel,
                { color: colors.primaryOnSurface ?? colors.primary },
              ]}
            >
              {`${bookName} ${chapter}`}
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
                  <Text
                    style={[
                      styles.verseRangeChipText,
                      { color: colors.primaryOnSurface ?? colors.primary },
                    ]}
                  >
                    {verseRange}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleSharePassage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.copyPassageBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Share2
                  size={18}
                  color={colors.primaryOnSurface ?? colors.primary}
                  strokeWidth={2.2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCopyPassage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.copyPassageBtn,
                  {
                    backgroundColor: copied
                      ? 'rgba(34,197,94,0.12)'
                      : colors.surface,
                    borderColor: copied ? 'rgba(34,197,94,0.4)' : colors.border,
                  },
                ]}
              >
                {copied ? (
                  <Check size={18} color="#22C55E" strokeWidth={2.2} />
                ) : (
                  <Copy
                    size={18}
                    color={colors.primaryOnSurface ?? colors.primary}
                    strokeWidth={2.2}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {passageVerses.map(v => (
            <View key={v.verseNumber} style={styles.passageVerseRow}>
              <Text
                style={[
                  styles.passageVerseNum,
                  { color: colors.primaryOnSurface ?? colors.primary },
                ]}
              >
                {v.verseNumber}
              </Text>
              {renderHighlightedVerseText(v)}
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Prompt Question Card ────────────────────────────────────────── */}
      <View
        style={[
          styles.promptCard,
          { backgroundColor: colors.surface, borderLeftColor: colors.accent },
        ]}
      >
        <View style={styles.promptHeaderRow}>
          <View
            style={[
              styles.promptQuoteIcon,
              { backgroundColor: `${colors.accent}22` },
            ]}
          >
            <MessageSquareQuote
              size={20}
              color={colors.accent}
              strokeWidth={2.2}
            />
          </View>
          <Text style={[styles.promptText, { color: colors.text }]}>
            {prompts[currentPromptIdx]}
          </Text>
        </View>
        <TextInput
          style={[
            styles.promptInput,
            {
              backgroundColor: colors.background,
              borderColor: `${colors.muted}40`,
              color: colors.text,
            },
          ]}
          placeholder="Write your answer here..."
          placeholderTextColor={colors.muted}
          value={lookNotes}
          onChangeText={handleTextChange}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.promptNav}>
          <TouchableOpacity
            style={[
              styles.promptNavBtn,
              { backgroundColor: colors.accent },
              currentPromptIdx === 0 && { opacity: 0.35 },
            ]}
            onPress={() => switchPrompt(currentPromptIdx - 1)}
            disabled={currentPromptIdx === 0}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={[styles.promptCounter, { color: colors.text }]}>
            {currentPromptIdx + 1} / {prompts.length}
          </Text>
          <TouchableOpacity
            style={[
              styles.promptNavBtn,
              { backgroundColor: colors.accent },
              currentPromptIdx === prompts.length - 1 && { opacity: 0.45 },
            ]}
            onPress={() => switchPrompt(currentPromptIdx + 1)}
            disabled={currentPromptIdx === prompts.length - 1}
            activeOpacity={0.7}
          >
            <ChevronRight size={22} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Your Observations ───────────────────────────────────────────── */}
      <View style={styles.obsLabelWrap}>
        <View
          style={[
            styles.obsIcon,
            {
              backgroundColor: `${colors.primaryOnSurface ?? colors.primary}18`,
            },
          ]}
        >
          <NotebookPen
            size={16}
            color={colors.primaryOnSurface ?? colors.primary}
            strokeWidth={2.3}
          />
        </View>
        <Text style={[styles.textareaLabel, { color: colors.text }]}>
          Your Observations
        </Text>
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
          value={observations}
          onChangeText={setObservations}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* ── Save Progress (blue footer, matches the design) ─────────────── */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={onSaveProgress}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Save size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Save Progress</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Page Indicator Dots ─────────────────────────────────────────── */}
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
