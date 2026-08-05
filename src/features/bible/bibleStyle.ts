import { StyleSheet, Platform, I18nManager } from 'react-native';
import {
  BORDER_RADIUS,
  FONT_SIZES,
  SPACING,
  getColors,
} from '../../constants/theme';

// Create a function that returns styles based on theme
export const createBibleStyles = (isDark: boolean, isRtl?: boolean) => {
  const COLORS = getColors(isDark);
  const rtl = isRtl ?? I18nManager.isRTL;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    headerGradient: {
      paddingTop: SPACING.xxl,
      paddingBottom: SPACING.xl,
    },
    headerContent: {
      width: '100%',
    },
    headerTop: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      alignItems: 'center',
    },
    bookTitleText: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      color: COLORS.white,
    },
    navCard: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.cardBackground,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    navButton: {
      padding: SPACING.sm,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    navButtonText: {
      fontSize: FONT_SIZES.lg,
    },
    navButtonTextDisabled: {
      color: COLORS.muted,
    },
    chapterButton: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    chapterButtonText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
      marginRight: rtl ? 0 : SPACING.xs,
      marginLeft: rtl ? SPACING.xs : 0,
    },
    chapterButtonIcon: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
    },
    actionsBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.cardBackground,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      zIndex: 100,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    actionsContent: {
      gap: SPACING.sm,
    },
    actionsHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    actionsCount: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.textSecondary,
    },
    actionsButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    actionBtn: {
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    actionBtnPrimary: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    actionBtnText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
    },
    actionBtnTextPrimary: {
      color: COLORS.white,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBtnText: {
      fontSize: 18,
    },
    actionBtnClear: {
      marginLeft: 'auto',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    actionBtnClearText: {
      fontSize: 18,
      color: COLORS.muted,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingLeft: 5,
      paddingTop: SPACING.sm,
      // Leave space for BottomTab + selection actions bar + audio player
      paddingBottom: SPACING.xxl * 3,
    },

    // Floating multi-select bar (long-press verse mode) — sits above the
    // bottom action bar + tab bar.
    multiSelectWrap: {
      position: 'absolute',
      left: SPACING.lg,
      right: SPACING.lg,
      bottom: 110,
      zIndex: 90,
    },
    multiSelectWrapRtl: {
      flexDirection: 'row-reverse',
    },
    versesCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
    },

    // Better, book-like verse layout
    verseTouchable: {
      marginBottom: 0,
    },
    versePressed: {
      opacity: 0.98,
    },
    verseContainer: {
      borderWidth: 0,
      position: 'relative',
    },
    verseSelected: {
      backgroundColor: `${COLORS.primary}14`,
      borderWidth: 0,
    },

    selectedStrip: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      backgroundColor: COLORS.primary,
    },
    verseContent: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      paddingVertical: 0,
      paddingHorizontal: SPACING.sm,
      gap: SPACING.sm,
    },

    // Highlight indicator + subtle overlay
    highlightStrip: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
    },
    highlightOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      opacity: 0.12,
    },

    // Temporary highlight overlay (used when jumping to a verse)
    targetHighlightOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 235, 59, 0.22)',
    },

    // Verse number badge
    verseNumberBadge: {
      minWidth: 28,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 7,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    verseNumberBadgeSelected: {
      backgroundColor: COLORS.primary,
    },
    verseNumber: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
      color: COLORS.accent,
    },
    verseNumberSelected: {
      color: COLORS.white,
    },

    verseTextContainer: {
      flex: 1,
      paddingRight: 0,
      paddingLeft: 0,
    },
    verseText: {
      color: COLORS.text,
      fontWeight: '400',
      letterSpacing: 0.15,
      textAlign: 'justify',
      writingDirection: rtl ? 'rtl' : 'ltr',
    },

    removeHighlight: {
      position: 'absolute',
      right: SPACING.sm,
      top: SPACING.sm,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeHighlightText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },

    // Legacy styles kept for other screens / older layouts
    verseNumberContainer: {
      marginRight: SPACING.sm,
      minWidth: 10,
    },
    highlightBar: {
      position: 'absolute',
      left: -SPACING.xs,
      top: 0,
      bottom: 0,
      width: 4,
      borderRadius: 2,
    },
    verseTextHighlighted: {
      borderRadius: BORDER_RADIUS.sm,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxxl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: SPACING.lg,
    },
    emptyText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    emptySubtext: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
    },
    drawerOverlay: {
      flex: 1,
      flexDirection: rtl ? 'row-reverse' : 'row',
    },
    drawerContainer: {
      width: 300,
      backgroundColor: COLORS.cardBackground,
      paddingTop: 50,
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: COLORS.overlay,
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    drawerTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
    },
    drawerContent: {
      flex: 1,
      padding: SPACING.lg,
    },
    settingsSection: {
      marginBottom: SPACING.xl,
    },
    settingsLabel: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.muted,
      marginBottom: SPACING.md,
      textTransform: 'uppercase',
    },
    fontSizeControl: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fontButton: {
      width: 50,
      height: 50,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontButtonText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
    },
    fontSizeDisplay: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    fontSizeText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.white,
    },
    settingsItem: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    settingsItemIcon: {
      fontSize: FONT_SIZES.xl,
      marginRight: rtl ? 0 : SPACING.md,
      marginLeft: rtl ? SPACING.md : 0,
    },
    settingsItemText: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
    },
    settingsItemBadge: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.round,
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      color: COLORS.white,
      marginRight: SPACING.sm,
    },
    settingsItemArrow: {
      fontSize: FONT_SIZES.lg,
      color: COLORS.muted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.overlay,
      justifyContent: 'flex-end',
    },
    modalContainer: {
      maxHeight: '80%',
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: BORDER_RADIUS.xxl,
      borderTopRightRadius: BORDER_RADIUS.xxl,
    },
    modalContainerSearch: {
      flex: 1,
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: BORDER_RADIUS.xxl,
      borderTopRightRadius: BORDER_RADIUS.xxl,
    },
    modalHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    modalTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
    },
    modalClose: {
      fontSize: FONT_SIZES.xxl,
      color: COLORS.muted,
    },
    modalContent: {
      padding: SPACING.lg,
    },
    booksSection: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.md,
    },
    booksGrid: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    bookCard: {
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 2,
      borderColor: 'transparent',
      minWidth: 100,
    },
    bookCardActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    bookCardText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
    },
    bookCardTextActive: {
      color: COLORS.white,
    },
    bookCardChapters: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      marginTop: 2,
    },
    chapterGrid: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      padding: SPACING.lg,
      gap: SPACING.md,
    },
    chapterCard: {
      width: 60,
      height: 60,
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    chapterCardActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    chapterCardText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: COLORS.text,
    },
    chapterCardTextActive: {
      color: COLORS.white,
    },
    colorPickerContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      marginHorizontal: SPACING.xxl,
    },

    colorPickerCard: {
      width: '100%', // ✅ full screen width
      maxHeight: '90%', // keep height short & scrollable
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
    },

    colorPickerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.lg,
      textAlign: 'center',
    },
    colorOptions: {
      gap: SPACING.md,
    },
    colorOption: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
    },
    colorCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: rtl ? 0 : SPACING.md,
      marginLeft: rtl ? SPACING.md : 0,
    },
    colorName: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
    },
    searchContainer: {
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    searchInputWrapper: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
    },
    searchIconStyle: {
      marginRight: rtl ? 0 : SPACING.sm,
      marginLeft: rtl ? SPACING.sm : 0,
    },
    searchInputStyle: {
      flex: 1,
      height: 50,
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
    },
    highlightedText: {
      backgroundColor: '#FDE047',
      fontWeight: '700',
      borderRadius: BORDER_RADIUS.sm,
      paddingHorizontal: SPACING.xs,
    },
    clearSearchBtn: {
      padding: SPACING.sm,
    },
    searchHintText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      marginTop: SPACING.sm,
    },
    resultsHeader: {
      marginTop: SPACING.md,
    },
    resultsCount: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.success,
    },
    searchScrollView: {
      flex: 1,
    },
    searchScrollContent: {
      padding: SPACING.lg,
    },
    searchScrollEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    resultItem: {
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    resultHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    resultReference: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.primary,
    },
    resultGoBadge: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
    },
    resultGoBadgeText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.white,
    },
    resultText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      lineHeight: 20,
    },
    emptySearchView: {
      alignItems: 'center',
      paddingVertical: SPACING.xxxl,
    },
    emptySearchIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    emptyBigIcon: {
      fontSize: 64,
      marginBottom: SPACING.lg,
    },
    emptySearchHeading: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    emptySearchSubtext: {
      fontSize: FONT_SIZES.md,
      color: COLORS.muted,
      textAlign: 'center',
      marginBottom: SPACING.xl,
    },
    searchSuggestionsBox: {
      width: '100%',
      marginTop: SPACING.lg,
    },
    suggestionsHeading: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.muted,
      marginBottom: SPACING.md,
    },
    suggestionsChips: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    suggestionChipButton: {
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    suggestionChipText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      fontWeight: '600',
    },
    clearAndRetryButton: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.lg,
    },
    clearAndRetryText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.white,
    },
    actionsBarNew: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.primary,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.lg,
      zIndex: 100,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
      borderRadius: BORDER_RADIUS.xl,
    },
    actionsHeaderRow: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    selectionBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.round,
    },
    selectionBadgeText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.white,
    },
    closeSelectionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionsScrollView: {
      paddingLeft: SPACING.lg,
    },
    actionsScrollContent: {
      paddingRight: SPACING.lg,
      gap: SPACING.md,
    },
    actionBtnNew: {
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    actionIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.white,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.xs,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    actionIcon: {
      fontSize: 24,
    },
    actionBtnTextNew: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.white,
    },
    explanationModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    explanationModalContainer: {
      flex: 1,
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: BORDER_RADIUS.xxl,
      borderTopRightRadius: BORDER_RADIUS.xxl,
      paddingBottom: SPACING.xl,
    },
    explanationHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.xl,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    explanationTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    explanationSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      fontWeight: '600',
    },
    explanationCloseBtn: {
      padding: SPACING.xs,
    },
    explanationContent: {
      flex: 1,
      padding: SPACING.lg,
    },
    explanationVersesBox: {
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.lg,
    },
    explanationVersesLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      color: COLORS.muted,
      textTransform: 'uppercase',
      marginBottom: SPACING.sm,
      letterSpacing: 0.5,
    },
    explanationVerseText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      lineHeight: 22,
      marginBottom: SPACING.sm,
    },
    explanationVerseNumber: {
      fontWeight: '700',
      color: COLORS.primary,
    },
    explanationBox: {
      backgroundColor: COLORS.surface,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.lg,
    },
    explanationIconHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    explanationIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: rtl ? 0 : SPACING.sm,
      marginLeft: rtl ? SPACING.sm : 0,
    },
    explanationIconText: {
      fontSize: 20,
    },
    explanationBoxTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
    },
    explanationText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      lineHeight: 24,
    },
    readMoreBtn: {
      marginTop: SPACING.md,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
    },
    readMoreText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.primary,
    },
    explanationActions: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.xl,
    },
    explanationActionCard: {
      flex: 1,
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    explanationActionIcon: {
      fontSize: 28,
      marginBottom: SPACING.xs,
    },
    explanationActionText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'center',
    },
    dragHandleWrapper: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: COLORS.border,
    },
    verseRow: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    },
    favoriteStarRight: {
      marginTop: 14,
      paddingLeft: rtl ? 0 : SPACING.sm,
      paddingRight: rtl ? SPACING.sm : 0,
    },
    // Add these styles to your bibleStyle.ts file

    // Add these styles to your bibleStyle.ts file in the StyleSheet.create() section

    // Note Modal Overlay & Container
    noteModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },

    noteModalContainer: {
      width: '100%',
      maxWidth: 500,
      backgroundColor: COLORS.background,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      marginTop: SPACING.lg,
    },

    noteModalHeader: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },

    noteModalTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
    },

    noteModalSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      marginTop: SPACING.xs,
    },

    noteModalCloseBtn: {
      padding: SPACING.xs,
    },

    noteModalScrollView: {
      flexGrow: 0,
    },

    noteModalScrollContent: {
      flexGrow: 0,
    },

    noteInputContainer: {
      marginBottom: SPACING.lg,
    },

    noteLabel: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },

    noteInput: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.lg,
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      minHeight: 150,
      textAlignVertical: 'top',
      marginBottom: SPACING.sm,
    },

    noteCharCount: {
      alignItems: 'flex-end',
    },

    noteCharCountText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '500',
    },

    // Tips Section
    noteTipsContainer: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
    },

    noteTipsTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },

    noteTipsText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      lineHeight: 22,
    },

    // Action Buttons
    noteModalActions: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      gap: SPACING.md,
    },

    noteCancelBtn: {
      flex: 1,
      height: 50,
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },

    noteCancelBtnText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
    },

    noteSaveBtn: {
      flex: 1,
      height: 50,
      backgroundColor: COLORS.primary,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: rtl ? 'row-reverse' : 'row',
      gap: SPACING.sm,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },

    noteSaveBtnDisabled: {
      opacity: 0.5,
    },

    noteSaveBtnText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.white,
    },

    // Add these styles to your bibleStyle.ts
    audioPlayerContainer: {
      position: 'absolute',
      bottom: 130,
      left: SPACING.lg,
      right: SPACING.lg,
      zIndex: 1000,
    },
    drawerLogoContainer: {
      marginTop: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
      borderWidth: 5,
      borderColor: COLORS.background + '80',
      borderRadius: 110, // ✅ Add this to match the image radius
      width: 230, // ✅ Slightly larger than image
      height: 230, // ✅ To accommodate border
    },

    drawerLogo: {
      height: 220,
      width: 220,
    },

  });
};
