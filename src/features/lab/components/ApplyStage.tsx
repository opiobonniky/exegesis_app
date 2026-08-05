import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Copy,
  Link,
  Target,
  CheckCircle2,
} from 'lucide-react-native';
import { showToast } from '../../../helpers/Toash.helper';
import StageHeader from './StageHeader';

interface PassageVerse {
  verseNumber: number;
  text: string;
}

interface ApplyStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  passageVerses: PassageVerse[];
  challengeText: string;
  setChallengeText: (value: string) => void;
  resultsText: string;
  setResultsText: (value: string) => void;
  saving: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onComplete: () => void;
  onOpenBibleReader: () => void;
  onOpenChallengeLibrary: () => void;
  onOpenPastChallenges: () => void;
}

export default function ApplyStage({
  styles,
  colors,
  passageRef,
  bookName,
  chapter,
  verseStart,
  passageVerses,
  challengeText,
  setChallengeText,
  resultsText,
  setResultsText,
  saving,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onComplete,
  onOpenBibleReader,
  onOpenChallengeLibrary,
  onOpenPastChallenges,
}: ApplyStageProps) {
  const [copied, setCopied] = useState(false);

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
    }
  };

  return (
    <View style={styles.stageContainer}>
      {/* ── Stage Header ─────────────────────────────────────────────────── */}
      <StageHeader
        Icon={CheckCircle2}
        step={5}
        total={5}
        title="Apply"
        subtitle="Live out what God has shown you"
        timeLabel="10–15 min"
        colors={colors}
        accentColor={colors.accent}
      />

      {/* ── Scripture Card ──────────────────────────────────────────────── */}
      {passageVerses.length > 0 && (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: colors.surface,
              borderColor: `${colors.primary}40`,
            },
          ]}
        >
          <View style={[styles.passageTextHeader, { borderBottomColor: colors.border }]}>
            <BookOpen size={14} color={colors.primaryOnSurface ?? colors.primary} />
            <Text style={[styles.passageTextLabel, { color: colors.primaryOnSurface ?? colors.primary }]}>
              {passageRef || `${bookName} ${chapter}:${verseStart}`}
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
        </View>
      )}

      {/* ── View in Context Link ────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.applyLinkRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={onOpenBibleReader}
      >
        <Link size={14} color={colors.primaryOnSurface ?? colors.primary} />
        <Text style={[styles.applyLinkText, { color: colors.primaryOnSurface ?? colors.primary }]}>
          View this verse in context
        </Text>
        <ChevronRight size={14} color={colors.muted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* ── Challenge Library Link ──────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.applyLinkRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={onOpenChallengeLibrary}
      >
        <ClipboardList size={14} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.applyLinkTitle, { color: colors.text }]}>
            This Week's Challenge Library
          </Text>
          <Text style={[styles.applyLinkSubtitle, { color: colors.muted }]}>
            Get ideas and examples to help you apply God's Word.
          </Text>
        </View>
        <ChevronRight size={14} color={colors.muted} />
      </TouchableOpacity>

      {/* ── Your Challenge Card ─────────────────────────────────────────── */}
      <View
        style={[
          styles.applyCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.applyCardHeader}>
          <View style={[styles.applyCardIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Target size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.applyCardTitle, { color: colors.text }]}>Your Challenge</Text>
            <Text style={[styles.applyCardSubtitle, { color: colors.muted }]}>
              Choose one practical way you will apply this verse to your life this week. Be specific and actionable.
            </Text>
          </View>
        </View>
        <TextInput
          style={[
            styles.applyInput,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Write your challenge here..."
          placeholderTextColor={colors.muted}
          value={challengeText}
          onChangeText={setChallengeText}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* ── Past Challenges Link ────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.applyLinkRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={onOpenPastChallenges}
      >
        <Link size={14} color={colors.muted} />
        <Text style={[styles.applyLinkText, { color: colors.muted }]}>
          View past challenges & inspiration
        </Text>
        <ChevronRight size={14} color={colors.muted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* ── My Results Card ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.applyCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.applyCardHeader}>
          <View style={[styles.applyCardIcon, { backgroundColor: `${colors.success}20` }]}>
            <CheckCircle size={16} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.applyCardTitle, { color: colors.text }]}>My Results</Text>
            <Text style={[styles.applyCardSubtitle, { color: colors.muted }]}>
              After taking action, reflect on what happened.
            </Text>
          </View>
        </View>
        <TextInput
          style={[
            styles.applyInput,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Write your results here..."
          placeholderTextColor={colors.muted}
          value={resultsText}
          onChangeText={setResultsText}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* ── Complete Button ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={onComplete}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Complete Verse Study</Text>
          </>
        )}
      </TouchableOpacity>

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