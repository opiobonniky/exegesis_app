import { Dimensions, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      paddingBottom: 15,
      paddingHorizontal: SPACING.lg,
      borderBottomLeftRadius: BORDER_RADIUS.xl,
      borderBottomRightRadius: BORDER_RADIUS.xl,
      justifyContent: 'center',
      alignContent: 'center',
    },
    greeting: {
      fontSize: FONT_SIZES.md,
      color: COLORS.white,
      opacity: 0.9,
      fontWeight: '500',
    },
    userName: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      color: COLORS.white,
      marginTop: 2,
    },
    // App name styles
    appNameContainer: {
      marginTop: SPACING.sm,
    },
    appName: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.white,
      opacity: 0.8,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    // Theme toggle
    themeToggle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    profilePlaceholder: {
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInitial: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.white,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
    section: { marginBottom: SPACING.lg },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
    },
    sectionAction: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },

    // Verse Card
    verseCard: {
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
    },
    verseImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      opacity: 0.2,
    },
    verseOverlay: { flex: 1, padding: SPACING.md },
    verseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    verseHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    verseIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.22)',
      marginRight: 10,
    },
    verseLabel: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: COLORS.accent,
    },
    verseDate: {
      marginTop: 2,
      fontSize: FONT_SIZES.xs,
      color: COLORS.white,
      opacity: 0.85,
      fontWeight: '500',
    },
    verseLoader: {
      paddingTop: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
    },
    verseLoaderText: {
      marginTop: SPACING.xs,
      fontSize: FONT_SIZES.sm,
      color: COLORS.white,
      opacity: 0.9,
      fontWeight: '500',
    },
    verseText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.white,
      lineHeight: 22,
      marginTop: SPACING.sm,
    },
    verseReferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    verseDivider: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.22)',
      marginRight: SPACING.sm,
    },
    verseReference: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.white,
      fontWeight: '600',
      paddingVertical: 4,
    },

    // Quick Actions compact
    quickLinksCompact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickLinkCompactCard: {
      width: (width - SPACING.lg * 2 - SPACING.sm * 3) / 4,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    quickLinkCompactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    quickLinkCompactText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'center',
    },

    // Progress
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    progressCard: {
      flex: 1,
      marginRight: SPACING.sm,
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.sm,
    },
    progressLabel: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.primaryLight,
      fontWeight: '600',
    },
    progressNumber: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.accent,
      marginBottom: SPACING.xs,
    },
    progressBar: { height: 6, borderRadius: 3, marginTop: SPACING.xs },

    // Activity
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    activityTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
    },
    activityTime: { fontSize: FONT_SIZES.xs, color: COLORS.muted },

    // Achievement
    achievementCard: {
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      marginTop: SPACING.lg,
    },
    achievementGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    achievementContent: { marginLeft: SPACING.md, flex: 1 },
    achievementTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.accent,
    },
    achievementSubtitle: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.white,
      opacity: 0.9,
    },
    audioButton: {
      bottom: 4,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    audioButtonPlaying: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      transform: [{ scale: 1.05 }],
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: SPACING.md,
    },
    inforButton: {
      bottom: 4,
      width: 100,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.accent,
      flexDirection: 'row',
    },
    inforButtonText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.accent,
      marginLeft: 8,
    },

    // Daily Devotion
    devotionCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    devotionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    devotionIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.accent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.xs,
    },
    devotionLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.accent,
      letterSpacing: 1,
      flex: 1,
    },
    devotionTag: {
      backgroundColor: COLORS.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    devotionTagText: {
      fontSize: 9,
      fontWeight: '600',
      color: COLORS.primary,
    },
    devotionTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 4,
    },
    devotionContent: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.textSecondary,
      lineHeight: 16,
    },

    // Compact Verse Card
    verseCardCompact: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    verseHeaderCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    verseIconCompact: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.accent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.xs,
    },
    verseLabelCompact: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: COLORS.accent,
      letterSpacing: 1,
      flex: 1,
    },
    verseDateCompact: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
    },
    verseTextCompact: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      lineHeight: 20,
      fontStyle: 'italic',
      marginBottom: SPACING.xs,
    },
    verseRefCompact: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.primary,
      fontWeight: '600',
      marginBottom: SPACING.sm,
    },
    verseActionsCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: SPACING.sm,
    },
    verseActionBtn: {
      padding: SPACING.xs,
    },
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  });
