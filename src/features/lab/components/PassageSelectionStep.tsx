import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react-native';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '../../../constants/theme';

interface PassageSelectionStepProps {
  colors: any;
  bookName: string;
  chapter: string;
  verseStart: string;
  verseEnd: string;
  loading: boolean;
  availableVerses: number[];
  availableVersesLoading: boolean;
  onBackToBooks: () => void;
  onVerseStartChange: (value: string) => void;
  onVerseEndChange: (value: string) => void;
  onSelectVerse: (verseNumber: number) => void;
  isVerseSelected: (verseNumber: number) => boolean;
  onBeginStudy: () => void;
}

export default function PassageSelectionStep({
  colors,
  bookName,
  chapter,
  verseStart,
  verseEnd,
  loading,
  availableVerses,
  availableVersesLoading,
  onBackToBooks,
  onVerseStartChange,
  onVerseEndChange,
  onSelectVerse,
  isVerseSelected,
  onBeginStudy,
}: PassageSelectionStepProps) {
  const styles = createStyles();

  return (
    <View style={styles.stageContainer}>
      <View style={styles.passageHeader}>
        <BookOpen size={24} color={colors.accent} />
        <Text style={[styles.passageTitle, { color: colors.text }]}>Choose Your Passage</Text>
        <Text style={[styles.passageSubtitle, { color: colors.textSecondary }]}> 
          Select the Scripture you want to study through the 4-step journey.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.selectedBadge,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
        onPress={onBackToBooks}
        activeOpacity={0.7}
      >
        <BookOpen size={16} color={colors.primary} />
        <Text style={[styles.selectedBadgeText, { color: colors.text }]}> 
          {bookName} {chapter}
        </Text>
        <ChevronRight size={14} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.inputRow}>
        <View style={styles.inputGroupFlex}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verse (start)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="16"
            placeholderTextColor={colors.muted}
            value={verseStart}
            onChangeText={text => {
              onVerseStartChange(text);
              // Clear end when start changes to enforce single verse default
              if (text && verseEnd) onVerseEndChange('');
            }}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputGroupFlex}>
<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verse (end)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="21"
            placeholderTextColor={colors.muted}
            value={verseEnd}
            onChangeText={text => {
              onVerseEndChange(text);
              // Ensure start reflects single verse if user clears end
              if (!text) {
                // nothing, start remains
              }
            }}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>Select verse or range</Text>
      {availableVersesLoading ? (
        <View style={styles.verseGridLoading}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : availableVerses.length > 0 ? (
        <View style={styles.verseGrid}>
          {availableVerses.map(verseNumber => {
            const selected = isVerseSelected(verseNumber);
            return (
              <TouchableOpacity
                key={verseNumber}
                style={[
                  styles.verseChip,
                  {
                    backgroundColor: selected ? colors.accent : colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => onSelectVerse(verseNumber)}
                activeOpacity={0.75}
              >
                <Text style={[styles.verseChipText, { color: selected ? '#FFFFFF' : colors.text }]}> 
                  {verseNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.verseHelperText, { color: colors.muted }]}> 
          Verse options will appear after the chapter loads.
        </Text>
      )}

      <Text style={[styles.verseHelperText, { color: colors.muted }]}> 
        Tap once for a single verse. Tap a later verse to select a range.
      </Text>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.accent, opacity: loading || !verseStart ? 0.6 : 1 },
        ]}
        onPress={onBeginStudy}
        disabled={loading || !verseStart}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Begin Study</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    stageContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
    passageHeader: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
      marginTop: SPACING.lg,
    },
    passageTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '800',
      marginTop: SPACING.md,
      textAlign: 'center',
    },
    passageSubtitle: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      marginTop: SPACING.xs,
      lineHeight: 20,
      paddingHorizontal: SPACING.lg,
    },
    selectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      marginBottom: SPACING.lg,
    },
    selectedBadgeText: { fontSize: FONT_SIZES.md, fontWeight: '700', flex: 1 },
    inputGroupFlex: { flex: 1, marginBottom: SPACING.md },
    inputLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      fontSize: FONT_SIZES.md,
    },
    inputRow: { flexDirection: 'row', gap: SPACING.sm },
    textareaLabel: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
    },
    verseGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    verseGridLoading: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    verseChip: {
      minWidth: 42,
      height: 42,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.sm,
    },
    verseChipText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
    },
    verseHelperText: {
      fontSize: FONT_SIZES.xs,
      lineHeight: 18,
      marginBottom: SPACING.sm,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 52,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
      paddingHorizontal: SPACING.lg,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
  });
