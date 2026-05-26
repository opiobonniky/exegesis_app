import { Dimensions, Platform, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const createStyles = (COLORS: any) =>
  StyleSheet.create({
    // ── Root ───────────────────────────────────────────────────────────────
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: Platform.OS === 'ios' ? 130 : 110 },

    // ── Section layout ─────────────────────────────────────────────────────
    section: {
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sectionHeaderRtl: {
      flexDirection: 'row-reverse',
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    sectionAction: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    // ── Daily Verse Card ───────────────────────────────────────────────────
    verseCard: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      overflow: 'hidden',
      // shadow
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    verseCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#396284',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 2,
    },
    verseCardHeaderRtl: {
      flexDirection: 'row-reverse',
    },
    verseCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    verseCardHeaderLeftRtl: {
      flexDirection: 'row-reverse',
    },
    verseIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    verseCardTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    verseCardDate: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 1,
    },
    lordsBookTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: BORDER_RADIUS.round,
      paddingHorizontal: SPACING.md,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    lordsBookTagRtl: {
      flexDirection: 'row-reverse',
    },
    lordsBookTagText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    verseCardDivider: {
      height: 1,
      backgroundColor: COLORS.border,
    },
    verseLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      gap: SPACING.sm,
    },
    verseLoadingRowRtl: {
      flexDirection: 'row-reverse',
    },
    verseLoadingText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
    },
    verseReferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xs,
    },
    verseReferenceRowRtl: {
      flexDirection: 'row-reverse',
    },
    verseRefLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    verseRefLeftRtl: {
      flexDirection: 'row-reverse',
    },
    verseRefText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.primary,
    },
    verseTranslation: {
      fontWeight: '500',
      color: COLORS.muted,
    },
    audioBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: COLORS.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    verseBodyText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
      lineHeight: 24,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.xs,
      paddingBottom: SPACING.md,
    },
    verseActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    verseActionsRtl: {
      flexDirection: 'row-reverse',
    },
    verseActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: SPACING.sm + 2,
    },
    verseActionBtnRtl: {
      flexDirection: 'row-reverse',
    },
    verseActionText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.primary,
    },

    // ── Content Banner Rows ─────────────────────────────────────────────────
    bannersSection: {
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      overflow: 'hidden',
      gap: 2,
    },
    bannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    bannerRowRtl: {
      flexDirection: 'row-reverse',
    },
    bannerFirst: {
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderTopRightRadius: BORDER_RADIUS.lg,
    },
    bannerLast: {
      borderBottomLeftRadius: BORDER_RADIUS.lg,
      borderBottomRightRadius: BORDER_RADIUS.lg,
    },
    bannerIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerLabel: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },

    // ── Faith Reel Featured Card ────────────────────────────────────────────
    faithReelCard: {
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.xs,
      borderRadius: BORDER_RADIUS.lg,
      overflow: 'hidden',
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    faithReelInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    faithReelPlayBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    faithReelInfo: {
      flex: 1,
    },
    faithReelTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    faithReelDate: {
      fontSize: FONT_SIZES.xs,
      marginTop: 2,
    },

    // ── Faith Reels Footer ──────────────────────────────────────────────────
    faithReelsFooter: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
    },
    faithReelsFooterText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      letterSpacing: 0.5,
    },

    explainSection: {
      padding: SPACING.lg,
      backgroundColor: COLORS.surface,
      marginTop: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
    },
    explainText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    explainToggleBtn: {
      alignSelf: 'flex-start',
    },
    explainToggleText: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    quickLinksCompact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickLinksCompactRtl: {
      flexDirection: 'row-reverse',
    },
    quickLinkCompactCard: {
      width: (width - SPACING.lg * 2 - SPACING.sm * 3) / 4,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    quickLinkCompactIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    quickLinkCompactText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'center',
    },

    // ── Stats Grid ─────────────────────────────────────────────────────────
    statsGrid: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    statsGridRtl: {
      flexDirection: 'row-reverse',
    },
    statCard: {
      flex: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.sm,
      alignItems: 'center',
    },
    statValue: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '500',
      marginTop: 2,
    },

    // ── Bottom Tab ─────────────────────────────────────────────────────────
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    showMoreBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      marginTop: 8,
    },
    showMoreBtnRtl: {
      flexDirection: 'row-reverse',
    },
    // ── Back to Today Banner ──
    backToTodayBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    backToTodayBannerRtl: {
      flexDirection: 'row-reverse',
    },
    showMoreText: {
      color: COLORS.primary,
      fontWeight: '600',
      marginRight: 6,
    },
  });