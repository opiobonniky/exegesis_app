/**
 * themeHelper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The theme's `primary` (#396284) is too dark to read as text/icons on dark
 * surfaces. Mirrors the Lab flow's `primaryOnSurface` token so dictionary
 * on-surface blue text/icons stay readable in dark mode.
 */
export const primaryOnSurface = (
  colors: any,
  isDark: boolean,
): string => colors.primaryOnSurface ?? (isDark ? '#60A5FA' : colors.primary);
