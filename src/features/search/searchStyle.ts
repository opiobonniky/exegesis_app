import { Dimensions, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const createSearchStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.round,
      paddingHorizontal: 14,
      height: 40,
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      padding: 0,
    },
    clearBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
    },
    emptyIcon: {
      marginBottom: SPACING.md,
      opacity: 0.4,
    },
    emptyTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xl,
      gap: 8,
    },
    loadingText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
    },
    resultItem: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    resultRef: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: 3,
    },
    resultText: {
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      color: COLORS.text,
    },
    resultHighlight: {
      color: COLORS.accent,
      fontWeight: '600',
    },
    resultCount: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    suggestionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
    },
    totalRow: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    totalText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.muted,
    },
    footer: {
      paddingVertical: SPACING.lg,
      alignItems: 'center',
    },
    footerText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
    },
    filterSection: {
      paddingTop: 12,
      gap: 8,
    },
    scopeRow: {
      paddingHorizontal: SPACING.md,
    },
    scopeTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
    },
    scopeTabActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    scopeTabInactive: {
      backgroundColor: 'transparent',
      borderColor: COLORS.border,
    },
    scopeTabText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    scopeTabTextActive: {
      color: '#FFFFFF',
    },
    scopeTabTextInactive: {
      color: COLORS.text,
    },
    resultActions: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 8,
    },
    actionBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionBtnText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
    },
    strongsResultItem: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    strongsWord: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
    },
    strongsId: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.primary,
      fontWeight: '600',
      marginTop: 2,
    },
    strongsDef: {
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      marginTop: 4,
      lineHeight: 20,
    },
    strongsLang: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    journalResultItem: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    journalTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
    },
    journalPreview: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      marginTop: 4,
      lineHeight: 18,
    },
    journalMeta: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      marginTop: 4,
    },
    topicResultItem: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    topicName: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.primary,
      textTransform: 'capitalize',
    },
    topicDescription: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      marginTop: 4,
      lineHeight: 18,
    },
    topicVerseCount: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      marginTop: 4,
    },
    lemmaResultItem: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    lemmaWord: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
    },
    lemmaId: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.primary,
      fontWeight: '600',
      marginTop: 2,
    },
    lemmaDef: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      marginTop: 4,
      lineHeight: 18,
    },
    relatedWordsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    relatedWordChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    relatedWordText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.primary,
    },
    bookFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      gap: 6,
    },
    bookFilterChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
    },
    bookFilterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    bookFilterChipInactive: {
      backgroundColor: 'transparent',
      borderColor: COLORS.border,
    },
    bookFilterText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
    },
    bookFilterTextActive: {
      color: '#FFFFFF',
    },
    bookFilterTextInactive: {
      color: COLORS.text,
    },
    bookPickerToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    bookPickerToggleActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary,
    },
    bookPickerToggleText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
    },
    bookPickerToggleTextActive: {
      color: '#FFFFFF',
    },
    bookPickerContainer: {
      maxHeight: 220,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.xs,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    bookPickerItem: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    bookPickerItemActive: {
      backgroundColor: COLORS.primary + '15',
    },
    bookPickerText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
    },
    bookPickerTextActive: {
      color: COLORS.primary,
      fontWeight: '700',
    },
    covenantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
      gap: 4,
    },
    covenantChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    covenantChipInactive: {
      backgroundColor: 'transparent',
      borderColor: COLORS.border,
    },
    covenantChipText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    covenantChipTextActive: {
      color: '#FFFFFF',
    },
    covenantChipTextInactive: {
      color: COLORS.muted,
    },
  });
