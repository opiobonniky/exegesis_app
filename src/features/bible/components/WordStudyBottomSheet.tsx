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
  ScrollText,
  Hash,
  Languages,
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
  onSearchAllUses?: (strongsId: string, word?: string) => void;
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
          <View style={[ss.loadingSpinnerWrap, { backgroundColor: `${COLORS.primary}12` }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={[ss.loadingText, { color: COLORS.textSecondary }]}>
            Loading word study...
          </Text>
        </View>
      );
    }

    if (!entry) {
      return word ? (
        <View style={ss.emptyContainer}>
          <View style={[ss.emptyIconWrap, { backgroundColor: `${COLORS.accent}15` }]}>
            <BookOpen size={28} color={COLORS.accent} />
          </View>
          <View style={[ss.emptyWordCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
            <Text style={[ss.emptyWordText, { color: COLORS.text }]}>
              {word.surfaceText}
            </Text>
          </View>
          <Text style={[ss.emptyTitle, { color: COLORS.text }]}>
            No Data Available
          </Text>
          <Text style={[ss.emptySubtext, { color: COLORS.textSecondary }]}>
            Strong's concordance data hasn't been loaded for this word yet.{'\n'}Try a different word or check back later.
          </Text>
        </View>
      ) : (
        <View style={ss.emptyContainer}>
          <View style={[ss.emptyIconWrap, { backgroundColor: `${COLORS.primary}12` }]}>
            <BookOpen size={28} color={COLORS.primary} />
          </View>
          <Text style={[ss.emptyTitle, { color: COLORS.text }]}>
            No Word Selected
          </Text>
          <Text style={[ss.emptySubtext, { color: COLORS.textSecondary }]}>
            Tap any highlighted Strong's word in the verse to study it.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.scrollContent}
      >
        {/* Surface word card — the word the user tapped */}
        <View style={[ss.surfaceWordCard, { backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}20` }]}>
          <Text style={[ss.surfaceWordLabel, { color: COLORS.textSecondary }]}>
            You tapped
          </Text>
          <Text style={[ss.surfaceWordText, { color: COLORS.text }]}>
            {word?.surfaceText}
          </Text>
        </View>

        {/* Original word hero */}
        <View style={[ss.heroCard, { backgroundColor: `${COLORS.primary}06`, borderColor: `${COLORS.primary}15` }]}>
          <View style={[ss.heroAccentBar, { backgroundColor: COLORS.primary }]} />
          <View style={ss.heroContent}>
            <Text style={[ss.heroOriginal, { color: COLORS.text }]}>
              {entry.originalWord || entry.transliteration || entry.strongsId}
            </Text>
            {entry.transliteration && (
              <Text style={[ss.heroTransliteration, { color: COLORS.textSecondary }]}>
                {entry.transliteration}
              </Text>
            )}
            <View style={[ss.heroBadge, { backgroundColor: `${COLORS.primary}15` }]}>
              <Hash size={11} color={COLORS.primary} strokeWidth={2.5} />
              <Text style={[ss.heroBadgeText, { color: COLORS.primary }]}>
                Strong's {entry.strongsId}
              </Text>
            </View>
          </View>
        </View>

        {/* Short Definition card */}
        <View style={[ss.infoCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
          <View style={ss.infoCardHeader}>
            <ScrollText size={14} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={[ss.infoCardLabel, { color: COLORS.textSecondary }]}>
              Short Definition
            </Text>
          </View>
          <Text style={[ss.definition, { color: COLORS.text }]}>
            {entry.shortDefinition}
          </Text>
        </View>

        {/* Plain English Grammar card */}
        <View style={[ss.infoCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
          <View style={ss.infoCardHeader}>
            <Languages size={14} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={[ss.infoCardLabel, { color: COLORS.textSecondary }]}>
              Plain English Grammar
            </Text>
          </View>
          <Text style={[ss.grammarText, { color: COLORS.text }]}>
            This is a <Text style={{ fontWeight: '700' }}>{entry.partOfSpeech || 'word'}</Text> in {entry.language === 'hebrew' ? 'Hebrew' : 'Greek'}.
          </Text>
        </View>

        {/* Usage card */}
        {entry.usageCount != null && (
          <View style={[ss.infoCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
            <View style={ss.infoCardHeader}>
              <BookOpen size={14} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={[ss.infoCardLabel, { color: COLORS.textSecondary }]}>
                Usage
              </Text>
            </View>
            <Text style={[ss.grammarText, { color: COLORS.text }]}>
              Appears <Text style={{ fontWeight: '700' }}>{entry.usageCount}</Text> times in the {entry.language === 'hebrew' ? 'Old' : 'New'} Testament.
            </Text>
          </View>
        )}

        {/* See More section (collapsible) */}
        {(entry.fullDefinition || hasGrammaticalDetails || crossRefs.length > 0) && (
          <View style={[ss.expandCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.7}
              style={ss.expandTouchable}
            >
              <View style={ss.expandHeader}>
                <Text style={[ss.expandLabel, { color: COLORS.textSecondary }]}>
                  {expanded ? 'Hide Details' : 'See More'}
                </Text>
                {expanded ? (
                  <ChevronUp size={18} color={COLORS.textSecondary} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={18} color={COLORS.textSecondary} strokeWidth={2.5} />
                )}
              </View>
            </TouchableOpacity>

            {expanded && (
              <View style={ss.expandBody}>
                {/* Full Definition */}
                {entry.fullDefinition && (
                  <View style={ss.expandSection}>
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
                  <View style={ss.expandSection}>
                    <Text style={[ss.detailLabel, { color: COLORS.textSecondary }]}>
                      Grammatical Details
                    </Text>
                    <View style={[ss.grammarCard, { backgroundColor: `${COLORS.primary}06`, borderColor: `${COLORS.primary}12` }]}>
                      <View style={ss.grammarRow}>
                        <Text style={[ss.grammarKey, { color: COLORS.textSecondary }]}>Part of Speech</Text>
                        <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.partOfSpeech || '—'}</Text>
                      </View>
                      {entry.grammaticalCase && (
                        <View style={[ss.grammarRow, ss.grammarRowBorder, { borderTopColor: `${COLORS.primary}10` }]}>
                          <Text style={[ss.grammarKey, { color: COLORS.textSecondary }]}>Case</Text>
                          <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.grammaticalCase}</Text>
                        </View>
                      )}
                      {entry.gender && (
                        <View style={[ss.grammarRow, ss.grammarRowBorder, { borderTopColor: `${COLORS.primary}10` }]}>
                          <Text style={[ss.grammarKey, { color: COLORS.textSecondary }]}>Gender</Text>
                          <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.gender}</Text>
                        </View>
                      )}
                      {entry.number && (
                        <View style={[ss.grammarRow, ss.grammarRowBorder, { borderTopColor: `${COLORS.primary}10` }]}>
                          <Text style={[ss.grammarKey, { color: COLORS.textSecondary }]}>Number</Text>
                          <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.number}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Cross References */}
                {crossRefs.length > 0 && (
                  <View style={ss.expandSection}>
                    <Text style={[ss.detailLabel, { color: COLORS.textSecondary }]}>
                      Cross References
                    </Text>
                    <View style={ss.crossRefsList}>
                      {crossRefs.map((ref, i) => (
                        <TouchableOpacity
                          key={i}
                          activeOpacity={0.7}
                          style={[ss.crossRefChip, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}25` }]}
                        >
                          <BookOpen size={11} color={COLORS.primary} strokeWidth={2.5} />
                          <Text style={[ss.crossRefText, { color: COLORS.primary }]}>{ref}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={ss.actionsRow}>
          {onSearchAllUses && (
            <TouchableOpacity
              onPress={() => onSearchAllUses(entry.strongsId, word?.surfaceText)}
              activeOpacity={0.8}
              style={[ss.actionBtn, { backgroundColor: COLORS.primary }]}
            >
              <Search size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={ss.actionBtnText}>Search All Uses</Text>
              <Text style={ss.actionBtnSubtext}>in Bible</Text>
            </TouchableOpacity>
          )}
          {onSaveWord && (
            <TouchableOpacity
              onPress={() => onSaveWord(entry)}
              activeOpacity={0.8}
              style={[ss.actionBtn, { backgroundColor: COLORS.accent }]}
            >
              <Bookmark size={15} color="#FFFFFF" strokeWidth={2.5} />
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
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
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
                  <Text style={[ss.headerSubtitle, { color: COLORS.textSecondary }]}>
                    Studying “{word.surfaceText}”
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={[ss.closeBtn, { backgroundColor: `${COLORS.textSecondary}15` }]}>
                  <X size={16} color={COLORS.textSecondary} strokeWidth={2.5} />
                </View>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    flex: 1,
    maxHeight: '90%',
    minHeight: '55%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
    paddingTop: SPACING.xs,
  },
  // ── Loading ──────────────────────────────────────────────
  loadingContainer: {
    paddingVertical: SPACING.xl * 3,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingSpinnerWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  // ── Empty / No Data ──────────────────────────────────────
  emptyContainer: {
    paddingVertical: SPACING.xl * 2.5,
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyWordCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  emptyWordText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Surface word card ─────────────────────────────────────
  surfaceWordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  surfaceWordLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  surfaceWordText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  // ── Hero card ─────────────────────────────────────────────
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  heroAccentBar: {
    width: 5,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  heroOriginal: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTransliteration: {
    fontSize: FONT_SIZES.md,
    fontStyle: 'italic',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    marginTop: 2,
  },
  heroBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ── Info cards ────────────────────────────────────────────
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // ── Expand / collapse ──────────────────────────────────────
  expandCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  expandTouchable: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  expandBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  expandSection: {
    gap: 6,
  },
  // ── Grammar details — table-style card ─────────────────────
  grammarCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  grammarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  grammarRowBorder: {
    borderTopWidth: 1,
  },
  grammarKey: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  grammarValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  // ── Cross references ───────────────────────────────────────
  crossRefsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  crossRefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  crossRefText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  // ── Action buttons ─────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSubtext: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
});
