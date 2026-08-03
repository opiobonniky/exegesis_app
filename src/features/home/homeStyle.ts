import { Platform, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Home design tokens — mirror docs/design-pic/home-design.jpeg
// Dark mode uses the exact design colors; light mode gets a matching light set.
// ─────────────────────────────────────────────────────────────────────────────
export interface HomeDesign {
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  title: string; // primary text (white in dark)
  body: string; // secondary body text (verse quote)
  muted: string; // tertiary text
  lightBlue: string; // links / subtitles / accents
  blue: string; // icons, progress fill
  pillBg: string; // "Continue" pill button
  pillText: string;
  accent: string; // yellow/orange
  flame: string; // orange
  green: string;
  purple: string;
}

export const getHomeDesign = (isDark: boolean): HomeDesign =>
  isDark
    ? {
        pageBg: '#0b1120',
        cardBg: '#131c31',
        cardBorder: '#1e2a44',
        title: '#FFFFFF',
        body: '#E2E8F0',
        muted: '#94A3B8',
        lightBlue: '#7DD3FC',
        blue: '#60A5FA',
        pillBg: '#1d3b6f',
        pillText: '#FFFFFF',
        accent: '#F0B429',
        flame: '#FB923C',
        green: '#34D399',
        purple: '#A78BFA',
      }
    : {
        pageBg: '#F5F7FF',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        title: '#0F1724',
        body: '#334155',
        muted: '#64748B',
        lightBlue: '#2563EB',
        blue: '#2563EB',
        pillBg: '#2563EB',
        pillText: '#FFFFFF',
        accent: '#C4881A',
        flame: '#F59E0B',
        green: '#10B981',
        purple: '#8B5CF6',
      };

export const createStyles = (COLORS: any) =>
  StyleSheet.create({
    // ── Root ───────────────────────────────────────────────────────────────
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: Platform.OS === 'ios' ? 130 : 110 },

    // ── Bottom Tab ─────────────────────────────────────────────────────────
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  });
