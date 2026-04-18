import { StyleSheet } from 'react-native';

// ── Light theme ───────────────────────────────────────────────────────────────
const lightColors = {
  background: '#F5F7FF',
  surface: '#FFFFFF',
  primary: '#4A80D4',
  primaryDark: '#0D2654',
  primaryLight: '#2755A0',
  accent: '#E8A317',
  accentDark: '#C4881A',
  accentLight: '#FDE9B8',
  text: '#0F1724',
  textSecondary: '#374151',
  muted: '#6B7280',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  info: '#2563EB',
  border: '#D1D9EC',
  cardBackground: '#EDEEF5',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadowColor: '#1A3F7A',
  white: '#FFFFFF',
  selectedItem: '#D8DCE8',
  headgradient: ['#4A80D4', '#4A80D4'] as string[],
  black: '#000000',
};



const darkColors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#080C14', // very deep navy — rich, not harsh
  surface: '#0F1726', // one step up — used for inputs, bottom sheets
  cardBackground: '#141E30', // cards float above the background

  // ── Brand ───────────────────────────────────────────────────────────────────
  primary: '#4A80D4', // vibrant royal blue — clear & accessible on dark
  primaryDark: '#2A5BA8', // pressed / darker variant
  primaryLight: '#6B9DE0', // lighter hover / icon tint

  // ── Accent ──────────────────────────────────────────────────────────────────
  accent: '#F0B429', // warm amber gold — pops beautifully on navy
  accentDark: '#C8921A',
  accentLight: '#FDE7A0',

  // ── Text ────────────────────────────────────────────────────────────────────
  text: '#E8EDF5', // warm near-white — comfortable for long reading
  textSecondary: '#B8C4D8', // slightly dimmed secondary text
  muted: '#6E7E9A', // blue-grey muted — cohesive, not flat grey

  // ── Semantic ────────────────────────────────────────────────────────────────
  error: '#F56565', // softer red — less aggressive on dark
  success: '#48BB78', // fresh green
  warning: '#ECC94B', // visible amber
  info: '#63B3ED', // sky blue

  // ── Structure ───────────────────────────────────────────────────────────────
  border: '#1E2D45', // subtle indigo-tinted border
  overlay: 'rgba(0, 0, 0, 0.72)',
  shadowColor: '#000000',
  white: '#FFFFFF',
  selectedItem: '#1A2D47', // selected row — clearly distinct, not jarring

  // ── Gradient ────────────────────────────────────────────────────────────────
  // Two-stop subtle gradient gives the header depth
  headgradient: ['#0D1829', '#111E35'] as string[],

  black: '#000000',
};

// ─────────────────────────────────────────────────────────────────────────────

export const getColors = (isDark: boolean) =>
  isDark ? darkColors : lightColors;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

export const createThemeStyles = (COLORS: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    // ── Containers ─────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    safeContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.lg,
    },

    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xl,
    },

    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    centerVertical: {
      justifyContent: 'center',
    },

    centerHorizontal: {
      alignItems: 'center',
    },

    // ── Surfaces / Cards ───────────────────────────────────────────────────────
    surface: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg,
    },

    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },

    cardElevated: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },

    // ── Text ───────────────────────────────────────────────────────────────────
    titleText: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      color: COLORS.text,
    },

    headingText: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
    },

    subheadingText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: COLORS.text,
    },

    bodyText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      lineHeight: 22,
    },

    bodyTextSecondary: {
      fontSize: FONT_SIZES.md,
      color: COLORS.textSecondary,
      lineHeight: 22,
    },

    mutedText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
    },

    captionText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
    },

    errorText: {
      color: COLORS.error,
      fontSize: FONT_SIZES.sm,
      fontWeight: '500',
    },

    successText: {
      color: COLORS.success,
      fontSize: FONT_SIZES.sm,
      fontWeight: '500',
    },

    linkText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
    },

    // ── Inputs ─────────────────────────────────────────────────────────────────
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.lg,
      color: COLORS.text,
      backgroundColor: COLORS.surface,
      fontSize: FONT_SIZES.md,
    },

    inputFocused: {
      borderColor: COLORS.primary,
      borderWidth: 2,
    },

    inputError: {
      borderColor: COLORS.error,
      borderWidth: 2,
    },

    inputMultiline: {
      height: 100,
      paddingTop: SPACING.md,
      textAlignVertical: 'top',
    },

    // ── Buttons ────────────────────────────────────────────────────────────────
    button: {
      height: 50,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },

    buttonLarge: {
      height: 56,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    buttonSmall: {
      height: 40,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
    },

    buttonOutline: {
      height: 50,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    buttonText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },

    buttonTextOutline: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },

    buttonDisabled: {
      opacity: 0.5,
    },

    // ── Icon Buttons ───────────────────────────────────────────────────────────
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },

    iconButtonPrimary: {
      width: 48,
      height: 48,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Badges / Tags ──────────────────────────────────────────────────────────
    badge: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: COLORS.accent,
    },

    badgeText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },

    tag: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    tagText: {
      color: COLORS.text,
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
    },

    // ── Dividers ───────────────────────────────────────────────────────────────
    divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: SPACING.lg,
    },

    dividerThick: {
      height: 2,
      backgroundColor: COLORS.border,
      marginVertical: SPACING.xl,
    },

    // ── Row / Flex ─────────────────────────────────────────────────────────────
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    rowSpaceBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    rowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    // ── Margin utilities ───────────────────────────────────────────────────────
    mb0: { marginBottom: 0 },
    mb1: { marginBottom: SPACING.xs },
    mb2: { marginBottom: SPACING.sm },
    mb3: { marginBottom: SPACING.md },
    mb4: { marginBottom: SPACING.lg },
    mb5: { marginBottom: SPACING.xl },
    mb6: { marginBottom: SPACING.xxl },

    mt0: { marginTop: 0 },
    mt1: { marginTop: SPACING.xs },
    mt2: { marginTop: SPACING.sm },
    mt3: { marginTop: SPACING.md },
    mt4: { marginTop: SPACING.lg },
    mt5: { marginTop: SPACING.xl },
    mt6: { marginTop: SPACING.xxl },

    mx2: { marginHorizontal: SPACING.sm },
    mx3: { marginHorizontal: SPACING.md },
    mx4: { marginHorizontal: SPACING.lg },
    mx5: { marginHorizontal: SPACING.xl },

    my2: { marginVertical: SPACING.sm },
    my3: { marginVertical: SPACING.md },
    my4: { marginVertical: SPACING.lg },
    my5: { marginVertical: SPACING.xl },

    p0: { padding: 0 },
    p2: { padding: SPACING.sm },
    p3: { padding: SPACING.md },
    p4: { padding: SPACING.lg },
    p5: { padding: SPACING.xl },
    p6: { padding: SPACING.xxl },

    px2: { paddingHorizontal: SPACING.sm },
    px3: { paddingHorizontal: SPACING.md },
    px4: { paddingHorizontal: SPACING.lg },
    px5: { paddingHorizontal: SPACING.xl },

    py2: { paddingVertical: SPACING.sm },
    py3: { paddingVertical: SPACING.md },
    py4: { paddingVertical: SPACING.lg },
    py5: { paddingVertical: SPACING.xl },

    // ── Shadows ────────────────────────────────────────────────────────────────
    shadowSm: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    shadowMd: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },

    shadowLg: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },

    // ── Border utilities ───────────────────────────────────────────────────────
    borderPrimary: {
      borderWidth: 1,
      borderColor: COLORS.primary,
    },

    borderAccent: {
      borderWidth: 1,
      borderColor: COLORS.accent,
    },

    borderError: {
      borderWidth: 1,
      borderColor: COLORS.error,
    },

    borderSuccess: {
      borderWidth: 1,
      borderColor: COLORS.success,
    },
  });
