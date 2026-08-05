import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import {
  BookMarked,
  ClipboardList,
  ChevronRight,
  Share2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

interface CompletedStageProps {
  styles: any;
  colors: any;
  onViewLegacyLedger: () => void;
  onDownloadEntry: () => void;
  onCopyEntry: () => void;
  onStartNewStudy: () => void;
}

export default function CompletedStage({
  styles,
  colors,
  onViewLegacyLedger,
  onDownloadEntry,
  onCopyEntry,
  onStartNewStudy,
}: CompletedStageProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopy = async () => {
    await onCopyEntry();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await onDownloadEntry();
    } catch {}
    setTimeout(() => setSharing(false), 1500);
  };

  return (
    <View style={[styles.stageContainer, styles.completedContainer]}>
      {/* ── Celebration badge ────────────────────────────────────────────── */}
      <View style={styles.completedBadgeWrap}>
        <View style={[styles.completedBadgeOuter, { borderColor: `${colors.success}33` }]}>
          <View style={[styles.completedBadgeInner, { backgroundColor: `${colors.success}20` }]}>
            <CheckCircle2 size={56} color={colors.success} />
          </View>
        </View>
        <View style={[styles.completedSparkle, { backgroundColor: colors.accent }]}>
          <Sparkles size={14} color="#FFFFFF" />
        </View>
      </View>

      <Text style={[styles.completedTitle, { color: colors.text }]}>Study Complete!</Text>
      <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
        Your exegesis has been saved to the Legacy Ledger. Export, share, or start a new study.
      </Text>

      {/* ── Saved to Legacy Ledger card ──────────────────────────────────── */}
      <View
        style={[
          styles.completedSavedCard,
          {
            backgroundColor: `${colors.success}10`,
            borderColor: `${colors.success}28`,
          },
        ]}
      >
        <View style={[styles.completedSavedIcon, { backgroundColor: `${colors.success}20` }]}>
          <BookMarked size={18} color={colors.success} />
        </View>
        <View style={styles.completedSavedTextWrap}>
          <Text style={[styles.completedSavedTitle, { color: colors.text }]}>
            Saved to Legacy Ledger
          </Text>
          <Text style={[styles.completedSavedSubtitle, { color: colors.textSecondary }]}>
            View, edit, or export it anytime.
          </Text>
        </View>
        <CheckCircle2 size={18} color={colors.success} />
      </View>

      {/* ── Action buttons row ───────────────────────────────────────────── */}
      <View style={styles.completedActionsRow}>
        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            styles.completedActionBtn,
            { borderColor: copied ? colors.success : colors.primary, marginVertical: 0 },
          ]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          {copied ? (
            <CheckCircle2 size={14} color={colors.success} />
          ) : (
            <ClipboardList size={14} color={colors.primary} />
          )}
          <Text style={[styles.secondaryBtnText, { color: copied ? colors.success : colors.primary, fontSize: 11 }]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, styles.completedActionBtn, { borderColor: colors.primary, marginVertical: 0 }]}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Share2 size={14} color={colors.primary} />
          )}
          <Text style={[styles.secondaryBtnText, { color: colors.primary, fontSize: 11 }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, styles.completedPrimaryBtn, { backgroundColor: colors.accent }]}
        onPress={onViewLegacyLedger}
        activeOpacity={0.8}
      >
        <BookMarked size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Open Legacy Ledger</Text>
        <ChevronRight size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: colors.primary, marginTop: 4 }]}
        onPress={onStartNewStudy}
        activeOpacity={0.7}
      >
        <Sparkles size={16} color={colors.primary} />
        <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Start Another Study</Text>
      </TouchableOpacity>
    </View>
  );
}