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


    // ── Content Banner Rows ─────────────────────────────────────────────────
    bannersSection: {
      marginBottom: SPACING.md,
      gap: 2,
    },
    bannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: SPACING.lg,
      gap: 10,
    },
    bannerRowRtl: {
      flexDirection: 'row-reverse',
    },
    bannerIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerLabel: {
      flex: 1,
      fontSize: FONT_SIZES.sm,
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
    // ── Dashboard Cards (Lab + Recent Entry) ────────────────────────────
    dashboardCard: {
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    dashboardCardInner: {
      padding: SPACING.md,
    },
    dashboardCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    dashboardCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    dashboardCardTitleGroup: {
      flex: 1,
    },
    dashboardCardTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    dashboardCardSubtitle: {
      fontSize: FONT_SIZES.xs,
      marginTop: 1,
    },
    dashboardCardBody: {
      marginBottom: SPACING.sm,
    },
    dashboardStageRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      alignItems: 'center',
    },
    dashboardStageRowRtl: {
      flexDirection: 'row-reverse',
    },
    dashboardStageBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    dashboardStageDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dashboardStageLabel: {
      fontSize: 10,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    dashboardCardAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dashboardCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
      borderRadius: BORDER_RADIUS.round,
    },
    dashboardCardBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
    },
    dashboardBadgePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginLeft: SPACING.sm,
    },
    dashboardBadgePillText: {
      fontSize: 9,
      fontWeight: '700',
    },
    dashboardEntryTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      marginBottom: 2,
    },
    dashboardEntryPreview: {
      fontSize: FONT_SIZES.sm,
      lineHeight: 19,
      marginBottom: SPACING.xs,
    },
    dashboardScriptureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: SPACING.xs,
    },
    dashboardScriptureRowRtl: {
      flexDirection: 'row-reverse',
    },
    dashboardScriptureRef: {
      fontSize: FONT_SIZES.xs,
    },
    dashboardCardLink: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },

    // ── Bottom Tab ─────────────────────────────────────────────────────────
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },

  });