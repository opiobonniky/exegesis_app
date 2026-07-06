import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '../../../constants/theme';
import { StrongsEntry, StrongsWordData } from '../../../services/strongsService';

interface StrongsWordModalProps {
  visible: boolean;
  word: StrongsWordData | null;
  entry: StrongsEntry | null;
  loading: boolean;
  bookName: string;
  chapter: string;
  colors: any;
  onClose: () => void;
}

export default function StrongsWordModal({
  visible,
  word,
  entry,
  loading,
  bookName,
  chapter,
  colors,
  onClose,
}: StrongsWordModalProps) {
  const styles = createStyles();

  return (
    <Modal
      visible={visible && !!word}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.word, { color: colors.text }]}>{word?.surfaceText}</Text>
              {word?.strongsId && (
                <Text style={[styles.strongsId, { color: colors.accent }]}>Strong's {word.strongsId}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.close, { backgroundColor: colors.surface }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {word?.lemma && <InfoRow label="Lemma" value={word.lemma} colors={colors} />}
            {word?.morphology && <InfoRow label="Morphology" value={word.morphology} colors={colors} />}
            {word?.verseNumber && (
              <InfoRow
                label="Reference"
                value={`${bookName} ${chapter}:${word.verseNumber}`}
                colors={colors}
              />
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.value, { color: colors.muted }]}>Loading word details...</Text>
              </View>
            ) : entry ? (
              <>
                <Text style={[styles.definition, { color: colors.text }]}>{entry.shortDefinition}</Text>
                {entry.fullDefinition && (
                  <Text style={[styles.fullDefinition, { color: colors.textSecondary }]}>
                    {entry.fullDefinition}
                  </Text>
                )}
                {entry.originalWord && <InfoRow label="Original" value={entry.originalWord} colors={colors} />}
                {entry.transliteration && <InfoRow label="Transliteration" value={entry.transliteration} colors={colors} />}
                <InfoRow label="Language" value={entry.language} colors={colors} />
                {entry.partOfSpeech && <InfoRow label="Part of Speech" value={entry.partOfSpeech} colors={colors} />}
                {entry.grammaticalCase && <InfoRow label="Case" value={entry.grammaticalCase} colors={colors} />}
                {entry.gender && <InfoRow label="Gender" value={entry.gender} colors={colors} />}
                {entry.number && <InfoRow label="Number" value={entry.number} colors={colors} />}
                {entry.usageCount !== null && (
                  <InfoRow label="Usage" value={`Used ${entry.usageCount} times`} colors={colors} />
                )}
                {entry.crossReferences && (
                  <InfoRow label="Cross References" value={entry.crossReferences} colors={colors} />
                )}
              </>
            ) : (
              <Text style={[styles.fullDefinition, { color: colors.muted }]}>No detailed dictionary entry found for this word.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  const styles = createStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    card: {
      maxHeight: '82%',
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      padding: SPACING.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    titleWrap: { flex: 1 },
    word: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    strongsId: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      marginTop: 2,
    },
    close: {
      borderRadius: BORDER_RADIUS.round,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs + 2,
    },
    closeText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },
    loading: {
      alignItems: 'center',
      paddingVertical: SPACING.lg,
      gap: SPACING.sm,
    },
    definition: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      lineHeight: 26,
      marginBottom: SPACING.sm,
    },
    fullDefinition: {
      fontSize: FONT_SIZES.md,
      lineHeight: 24,
      marginBottom: SPACING.md,
    },
    infoRow: { marginBottom: SPACING.md },
    label: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      marginBottom: 4,
    },
    value: {
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      marginVertical: SPACING.md,
    },
  });
