import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Bookmark,
} from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { StrongsWordData, StrongsEntry } from '../../../services/strongsService';

interface WordStudyBottomSheetProps {
  visible: boolean;
  word: StrongsWordData | null;
  entry: StrongsEntry | null;
  loading: boolean;
  isDark: boolean;
  onClose: () => void;
  onSearchAllUses?: (strongsId: string) => void;
  onSaveWord?: (entry: StrongsEntry) => void;
}

export default function WordStudyBottomSheet({
  visible,
  word,
  entry,
  loading,
  isDark,
  onClose,
  onSearchAllUses,
  onSaveWord,
}: WordStudyBottomSheetProps) {
  const COLORS = getColors(isDark);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (visible) setExpanded(false);
  }, [visible]);

  if (!visible) return null;

  const parseCrossReferences = (raw: string | null): string[] => {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  };

  const hasGrammaticalDetails = entry?.grammaticalCase || entry?.gender || entry?.number;
  const crossRefs = entry?.crossReferences ? parseCrossReferences(entry.crossReferences) : [];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={ss.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[ss.loadingText, { color: COLORS.textSecondary }]}>
            Loading word study...
          </Text>
        </View>
      );
    }

    if (!entry) {
      return word ? (
        <View style={ss.noDataContainer}>
          <BookOpen size={32} color={COLORS.textSecondary} />
          <Text style={[ss.noDataTitle, { color: COLORS.text }]}>
            {word.surfaceText}
          </Text>
          <Text style={[ss.noDataText, { color: COLORS.textSecondary }]}>
            No Strong's concordance data available for this word.
          </Text>
        </View>
      ) : (
        <View style={ss.noDataContainer}>
          <Text style={[ss.noDataText, { color: COLORS.textSecondary }]}>
            Select a word to study.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.scrollContent}
      >
        {/* Original word header */}
        <View style={ss.originalWordSection}>
          <Text style={[ss.originalWord, { color: COLORS.text }]}>
            {entry.originalWord || entry.transliteration || entry.strongsId}
          </Text>
          {entry.transliteration && (
            <Text style={[ss.transliteration, { color: COLORS.textSecondary }]}>
              {entry.transliteration}
            </Text>
          )}
          <View style={[ss.strongsIdBadge, { backgroundColor: `${COLORS.primary}15` }]}>
            <Text style={[ss.strongsIdText, { color: COLORS.primary }]}>
              Strong's {entry.strongsId}
            </Text>
          </View>
        </View>

        {/* Short Definition */}
        <View style={[ss.section, { borderBottomColor: COLORS.border }]}>
          <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
            Short Definition
          </Text>
          <Text style={[ss.definition, { color: COLORS.text }]}>
            {entry.shortDefinition}
          </Text>
        </View>

        {/* Plain English Grammar */}
        <View style={[ss.section, { borderBottomColor: COLORS.border }]}>
          <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
            Plain English Grammar
          </Text>
          <Text style={[ss.grammarText, { color: COLORS.text }]}>
            This is a <Text style={{ fontWeight: '700' }}>{entry.partOfSpeech || 'word'}</Text> in {entry.language === 'hebrew' ? 'Hebrew' : 'Greek'}.
          </Text>
        </View>

        {/* Usage */}
        {entry.usageCount != null && (
          <View style={[ss.section, { borderBottomColor: COLORS.border }]}>
            <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
              Usage
            </Text>
            <Text style={[ss.grammarText, { color: COLORS.text }]}>
              Appears {entry.usageCount} times in the {entry.language === 'hebrew' ? 'Old' : 'New'} Testament.
            </Text>
          </View>
        )}

        {/* See More section (collapsible) */}
        {(entry.fullDefinition || hasGrammaticalDetails || crossRefs.length > 0) && (
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
            style={[ss.expandSection, { borderBottomColor: COLORS.border }]}
          >
            <View style={ss.expandHeader}>
              <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
                {expanded ? 'Hide Details' : 'See More'}
              </Text>
              {expanded ? (
                <ChevronUp size={16} color={COLORS.textSecondary} />
              ) : (
                <ChevronDown size={16} color={COLORS.textSecondary} />
              )}
            </View>

            {expanded && (
              <View style={{ marginTop: SPACING.md }}>
                {/* Full Definition */}
                {entry.fullDefinition && (
                  <View style={{ marginBottom: SPACING.md }}>
                    <Text style={[ss.detailLabel, { color: COLORS.textSecondary }]}>
                      Full Definition
                    </Text>
                    <Text style={[ss.detailText, { color: COLORS.text }]}>
                      {entry.fullDefinition}
                    </Text>
                  </View>
                )}

                {/* Grammatical Details */}
                {hasGrammaticalDetails && (
                  <View style={{ marginBottom: SPACING.md }}>
                    <Text style={[ss.detailLabel, { color: COLORS.textSecondary }]}>
                      Grammatical Details
                    </Text>
                    <View style={ss.grammarGrid}>
                      <Text style={[ss.grammarCell, { color: COLORS.text }]}>
                        Part of Speech: <Text style={{ fontWeight: '700' }}>{entry.partOfSpeech || '—'}</Text>
                      </Text>
                      {entry.grammaticalCase && (
                        <Text style={[ss.grammarCell, { color: COLORS.text }]}>
                          Case: <Text style={{ fontWeight: '700' }}>{entry.grammaticalCase}</Text>
                        </Text>
                      )}
                      {entry.gender && (
                        <Text style={[ss.grammarCell, { color: COLORS.text }]}>
                          Gender: <Text style={{ fontWeight: '700' }}>{entry.gender}</Text>
                        </Text>
                      )}
                      {entry.number && (
                        <Text style={[ss.grammarCell, { color: COLORS.text }]}>
                          Number: <Text style={{ fontWeight: '700' }}>{entry.number}</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Cross References */}
                {crossRefs.length > 0 && (
                  <View>
                    <Text style={[ss.detailLabel, { color: COLORS.textSecondary }]}>
                      Cross References
                    </Text>
                    <View style={ss.crossRefsList}>
                      {crossRefs.map((ref, i) => (
                        <TouchableOpacity key={i} activeOpacity={0.7} style={[ss.crossRefChip, { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary }]}>
                          <Text style={[ss.crossRefText, { color: COLORS.primary }]}>{ref}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <View style={ss.actionsRow}>
          {onSearchAllUses && (
            <TouchableOpacity
              onPress={() => onSearchAllUses(entry.strongsId)}
              activeOpacity={0.7}
              style={[ss.actionBtn, { backgroundColor: COLORS.primary }]}
            >
              <Search size={14} color="#FFFFFF" />
              <Text style={ss.actionBtnText}>Search All Uses</Text>
            </TouchableOpacity>
          )}
          {onSaveWord && (
            <TouchableOpacity
              onPress={() => onSaveWord(entry)}
              activeOpacity={0.7}
              style={[ss.actionBtn, { backgroundColor: COLORS.accent }]}
            >
              <Bookmark size={14} color="#FFFFFF" />
              <Text style={ss.actionBtnText}>Save Word</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={ss.overlay}>
        <TouchableOpacity
          style={ss.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            ss.sheet,
            {
              backgroundColor: COLORS.cardBackground,
              borderTopLeftRadius: BORDER_RADIUS.xl,
              borderTopRightRadius: BORDER_RADIUS.xl,
            },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[ss.handle, { backgroundColor: COLORS.border }]} />
            <View style={ss.header}>
              <View style={ss.headerLeft}>
                <Text style={[ss.headerTitle, { color: COLORS.text }]}>
                  Word Study
                </Text>
                {word?.surfaceText && (
                  <Text style={[ss.headerWord, { color: COLORS.primary }]}>
                    Studying: "{word.surfaceText}"
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {renderContent()}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    flex: 1,
    maxHeight: '92%',
    minHeight: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  headerWord: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  loadingContainer: {
    padding: SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  noDataContainer: {
    padding: SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noDataTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  noDataText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  surfaceWordCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  surfaceWord: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  originalWordSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 6,
    paddingTop: SPACING.sm,
  },
  originalWord: {
    fontSize: 28,
    fontWeight: '700',
  },
  transliteration: {
    fontSize: FONT_SIZES.md,
    fontStyle: 'italic',
    color: '#8B6914',
  },
  strongsIdBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  strongsIdText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  definition: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  grammarText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  expandSection: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullDefinition: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  grammarGrid: {
    gap: 4,
  },
  grammarCell: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  crossRefsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  crossRefChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  crossRefText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
