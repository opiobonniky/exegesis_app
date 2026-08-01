import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Clipboard,
} from 'react-native';
import {
  BookOpen,
  X,
  Search,
  Bookmark,
  Hash,
  Languages,
  Copy,
  Check,
  Edit2,
  ExternalLink,
} from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { StrongsWordData, StrongsEntry } from '../../../services/strongsService';

const copyToClipboard = (text: string) => {
  try {
    Clipboard.setString(text);
  } catch {}
};

interface WordStudyBottomSheetProps {
  visible: boolean;
  word: StrongsWordData | null;
  entry: StrongsEntry | null;
  loading: boolean;
  isDark: boolean;
  onClose: () => void;
  onSearchAllUses?: (strongsId: string, word?: string) => void;
  onSaveWord?: (entry: StrongsEntry) => void;
  /** Navigate to a Bible reference (e.g. "John 3:16") in the Bible reader */
  onOpenBibleReader?: (ref: string) => void;
  /** Show admin edit entry button — provided when the user is an admin */
  onEdit?: () => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  hebrew: 'Hebrew',
  greek: 'Greek',
  aramaic: 'Aramaic',
};

export default function WordStudyBottomSheet({
  visible,
  word,
  entry,
  loading,
  isDark,
  onClose,
  onSearchAllUses,
  onSaveWord,
  onOpenBibleReader,
  onEdit,
}: WordStudyBottomSheetProps) {
  const COLORS = getColors(isDark);

  if (!visible) return null;

  const parseCrossReferences = (raw: string | null): string[] => {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  };

  const [copiedStudyNote, setCopiedStudyNote] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Reset full-screen mode when the sheet closes entirely
  useEffect(() => {
    if (!visible) setFullScreen(false);
  }, [visible]);

  const hasGrammaticalDetails = entry?.grammaticalCase || entry?.gender || entry?.number;
  const crossRefs = entry?.crossReferences ? parseCrossReferences(entry.crossReferences) : [];
  const langLabel = entry?.language ? LANGUAGE_LABELS[entry.language] || entry.language : null;

  const handleCopyStudyNote = () => {
    const adminExplanation = (entry as any)?.adminExplanation;
    if (!adminExplanation) return;
    copyToClipboard(adminExplanation);
    setCopiedStudyNote(true);
    setTimeout(() => setCopiedStudyNote(false), 2000);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 60, alignItems: 'center', gap: SPACING.lg }}>
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
      <View style={{ maxHeight: 500 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ss.scrollContent}
        >
        {/* ── Headword: English left, Greek/Hebrew right ────── */}
        <View style={[ss.headRow, { borderBottomColor: COLORS.border }]}>
          <View style={ss.headLeft}>
            <Text style={[ss.englishWord, { color: COLORS.text }]}>
              {word?.surfaceText || entry.strongsId}
            </Text>
            {entry.shortDefinition && (
              <Text style={[ss.englishDef, { color: COLORS.muted }]} numberOfLines={2}>
                {entry.shortDefinition}
              </Text>
            )}
          </View>
          <View style={ss.headRight}>
            {entry.originalWord && (
              <Text style={[ss.originalWord, { color: COLORS.accent }]}>
                {entry.originalWord}
              </Text>
            )}
            {entry.transliteration && (
              <Text style={[ss.translit, { color: COLORS.muted }]}>
                {entry.transliteration}
              </Text>
            )}
          </View>
        </View>

        {/* ── Meta badges ──────────────────────────────────── */}
        <View style={ss.metaRow}>
          <View style={[ss.metaBadge, { backgroundColor: `${COLORS.primary}12` }]}>
            <Hash size={11} color={COLORS.primary} strokeWidth={2.5} />
            <Text style={[ss.metaText, { color: COLORS.primary }]}>
              {entry.strongsId}
            </Text>
          </View>
          {entry.partOfSpeech && (
            <View style={[ss.metaBadge, { backgroundColor: `${COLORS.accent}12` }]}>
              <Text style={[ss.metaText, { color: COLORS.accent }]}>
                {entry.partOfSpeech}
              </Text>
            </View>
          )}
          {langLabel && (
            <View style={[ss.metaBadge, { backgroundColor: `${COLORS.muted}18` }]}>
              <Languages size={11} color={COLORS.muted} strokeWidth={2.5} />
              <Text style={[ss.metaText, { color: COLORS.muted }]}>
                {langLabel}
              </Text>
            </View>
          )}
          {entry.usageCount != null && (
            <View style={[ss.metaBadge, { backgroundColor: `${COLORS.muted}18` }]}>
              <Text style={[ss.metaText, { color: COLORS.muted }]}>
                ×{entry.usageCount}
              </Text>
            </View>
          )}
        </View>

        {/* ── Full Definition ──────────────────────────────── */}
        {entry.fullDefinition && (
          <View style={ss.section}>
            <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
              Full Definition
            </Text>
            <Text style={[ss.definitionText, { color: COLORS.text }]}>
              {entry.fullDefinition}
            </Text>
          </View>
        )}

        {/* ── Grammatical Details ──────────────────────────── */}
        {hasGrammaticalDetails && (
          <View style={ss.section}>
            <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
              Grammar
            </Text>
            <View style={[ss.grammarCard, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
              <View style={[ss.grammarRow, { borderBottomColor: COLORS.border }]}>
                <Text style={[ss.grammarKey, { color: COLORS.muted }]}>Part of Speech</Text>
                <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.partOfSpeech || '—'}</Text>
              </View>
              {entry.grammaticalCase && (
                <View style={[ss.grammarRow, { borderBottomColor: COLORS.border }]}>
                  <Text style={[ss.grammarKey, { color: COLORS.muted }]}>Case</Text>
                  <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.grammaticalCase}</Text>
                </View>
              )}
              {entry.gender && (
                <View style={[ss.grammarRow, { borderBottomColor: COLORS.border }]}>
                  <Text style={[ss.grammarKey, { color: COLORS.muted }]}>Gender</Text>
                  <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.gender}</Text>
                </View>
              )}
              {entry.number && (
                <View style={[ss.grammarRow, { borderBottomColor: COLORS.border }]}>
                  <Text style={[ss.grammarKey, { color: COLORS.muted }]}>Number</Text>
                  <Text style={[ss.grammarValue, { color: COLORS.text }]}>{entry.number}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Cross References ─────────────────────────────── */}
        {crossRefs.length > 0 && (
          <View style={ss.section}>
            <Text style={[ss.sectionLabel, { color: COLORS.textSecondary }]}>
              Cross References
            </Text>
            <View style={ss.crossRefsList}>
              {crossRefs.map((ref, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onOpenBibleReader?.(ref)}
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

        {/* ── Study Note (admin explanation) ──────────────── */}
        {(entry as any).adminExplanation && (
          <View style={ss.section}>
            <View style={ss.studyNoteHeader}>
              <Text style={[ss.sectionLabel, { color: COLORS.textSecondary, flex: 1 }]}>
                Study Note
              </Text>
              <TouchableOpacity
                onPress={handleCopyStudyNote}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[ss.copyBtn, { backgroundColor: copiedStudyNote ? 'rgba(34,197,94,0.12)' : 'transparent' }]}
              >
                {copiedStudyNote ? (
                  <Check size={14} color="#22C55E" strokeWidth={2.5} />
                ) : (
                  <Copy size={14} color={COLORS.accent} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
            <View style={[ss.studyNoteCard, { backgroundColor: `${COLORS.accent}10`, borderColor: `${COLORS.accent}20` }]}>
              <Text style={[ss.studyNoteText, { color: COLORS.text }]}>
                {(entry as any).adminExplanation}
              </Text>
            </View>
          </View>
        )}

        {/* ── Action buttons (small, brief) ────────────────── */}
        <View style={ss.actionsRow}>
          {onSearchAllUses && (
            <TouchableOpacity
              onPress={() => onSearchAllUses(entry.strongsId, word?.surfaceText)}
              activeOpacity={0.8}
              style={[ss.actionBtn, { backgroundColor: COLORS.primary }]}
            >
              <Search size={13} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={ss.actionBtnText}>All Uses</Text>
            </TouchableOpacity>
          )}
          {onSaveWord && (
            <TouchableOpacity
              onPress={() => onSaveWord(entry)}
              activeOpacity={0.8}
              style={[ss.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }]}
            >
              <Bookmark size={13} color={COLORS.accent} strokeWidth={2.5} />
              <Text style={[ss.actionBtnText, { color: COLORS.accent }]}>Save</Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              activeOpacity={0.8}
              style={[ss.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }]}
            >
              <Edit2 size={13} color={COLORS.accent} strokeWidth={2.5} />
              <Text style={[ss.actionBtnText, { color: COLORS.accent }]}>Edit Entry</Text>
            </TouchableOpacity>
          )}
          {/* Full-screen dialog toggle */}
          <TouchableOpacity
            onPress={() => setFullScreen(true)}
            activeOpacity={0.8}
            style={[ss.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }]}
          >
            <ExternalLink size={13} color={COLORS.muted} strokeWidth={2.5} />
            <Text style={[ss.actionBtnText, { color: COLORS.muted }]}>Open in Dialog</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      {/* ── Bottom sheet modal ──────────────────────────────── */}
      <Modal
        visible={visible && !fullScreen}
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
              { backgroundColor: COLORS.cardBackground },
            ]}
          >
            <View style={[ss.handleRow, { borderBottomColor: COLORS.border }]}>
              <View style={[ss.handle, { backgroundColor: COLORS.border }]} />
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[ss.closeBtn, { backgroundColor: `${COLORS.textSecondary}15` }]}
              >
                <X size={16} color={COLORS.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {renderContent()}
          </View>
        </View>
      </Modal>

      {/* ── Full-screen dialog modal ───────────────────────── */}
      <Modal
        visible={visible && fullScreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreen(false)}
      >
        <View style={ss.dialogOverlay}>
          <TouchableOpacity
            style={ss.backdrop}
            activeOpacity={1}
            onPress={() => setFullScreen(false)}
          />
          <View style={[ss.dialogContainer, { backgroundColor: COLORS.cardBackground }]}>
            <View style={[ss.dialogHeader, { borderBottomColor: COLORS.border }]}>
              <Text style={[ss.dialogTitle, { color: COLORS.text }]}>Word Study</Text>
              <View style={ss.dialogHeaderRight}>
                <TouchableOpacity
                  onPress={() => setFullScreen(false)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[ss.dialogBackBtn, { backgroundColor: `${COLORS.primary}12` }]}
                >
                  <Text style={[ss.dialogBackText, { color: COLORS.primary }]}>Sheet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setFullScreen(false); onClose(); }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[ss.dialogXBtn, { backgroundColor: `${COLORS.textSecondary}15` }]}
                >
                  <X size={16} color={COLORS.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            {renderContent()}
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  closeBtn: {
    position: 'absolute',
    right: SPACING.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
    paddingTop: SPACING.md,
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
  // ── Empty ────────────────────────────────────────────────
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
  // ── Headword ─────────────────────────────────────────────
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  headLeft: {
    flex: 1,
    marginRight: SPACING.lg,
  },
  englishWord: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  englishDef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    lineHeight: 18,
  },
  headRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  originalWord: {
    fontSize: 22,
    fontWeight: '700',
  },
  translit: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // ── Meta badges ──────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Sections ─────────────────────────────────────────────
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  definitionText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    fontWeight: '500',
  },
  // ── Grammar ──────────────────────────────────────────────
  grammarCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  grammarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  grammarKey: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  grammarValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  // ── Cross references ─────────────────────────────────────
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
  // ── Study Note ───────────────────────────────────────────
  studyNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyNoteCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  studyNoteText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  // ── Actions (small, brief) ───────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ── Full-screen dialog ───────────────────────────────────
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 60,
  },
  dialogContainer: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    // Elevation shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  dialogHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dialogBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  dialogBackText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  dialogXBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
