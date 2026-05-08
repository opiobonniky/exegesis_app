import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
} from '../../constants/theme';
import { sendPostRequest } from '../../services/api';

import ExpandableText from './ExpandableText';
import ActionHeader from '../../reusable/ActionHeader';
import { BookOpen, RefreshCw, AlertCircle, BookText } from 'lucide-react-native';
import { route } from '../../component/navigations/routes';

type VerseData = {
  id?: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  explanation?: string;
  learnMore?: string;
  bibleVersion?: string;
  createdOn?: string;
  updatedOn?: string;
};

function normalizeLines(text: string) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function isBulletLine(line: string) {
  return /^(\-|\*|•|\d+\.)\s+/.test(line);
}

function stripBulletPrefix(line: string) {
  return line.replace(/^(\-|\*|•|\d+\.)\s+/, '').trim();
}

export default function FullVerseExplanation({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const app: any = useContext(AppContext);
  const COLORS = useMemo(() => getColors(app?.isDark), [app?.isDark]);
  const isDark = app?.isDark ?? false;

  const params = route?.params ?? {};
  const bookName: string | undefined = params.bookName;
  const chapter: number | undefined = params.chapter;
  const verseNumber: number | undefined = params.verseNumber;

  const hasParams =
    !!bookName && Number(chapter) >= 1 && Number(verseNumber) >= 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerseData | null>(null);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(24), []);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const renderTextBlocks = useCallback(
    (text?: string) => {
      if (!text?.trim()) {
        return <Text style={styles.emptyText}>No content available.</Text>;
      }

      const lines = normalizeLines(text);

      return lines.map((line, i) => {
        if (isBulletLine(line)) {
          const clean = stripBulletPrefix(line);
          return (
            <View key={`b-${i}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={[styles.paragraph, { flex: 1, marginBottom: 0 }]}>
                {clean}
              </Text>
            </View>
          );
        }

        return (
          <Text key={`p-${i}`} style={styles.paragraph}>
            {line}
          </Text>
        );
      });
    },
    [styles],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!hasParams) {
        setError('Missing verse reference (book / chapter / verse).');
        setLoading(false);
        return;
      }

      if (!opts?.silent) setLoading(true);
      setError(null);

      try {
        const res = await sendPostRequest('bible', 'get-verse-explanation', {
          bookName,
          chapter,
          verseNumber,
        });

        if (res?.returnCode === 200) {
          if (!res.returnData) {
            setError('No explanation found for this verse.');
            setData(null);
          } else {
            setData(res.returnData as VerseData);
            setError(null);
            animateIn();
          }
        } else {
          setData(null);
          setError(res?.returnMessage ?? 'Failed to load verse explanation');
        }
      } catch (e: any) {
        setData(null);
        setError(e?.message ?? 'Network error');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [hasParams, bookName, chapter, verseNumber, animateIn],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(() => {
    const bn = data?.bookName ?? bookName ?? '—';
    const ch = data?.chapter ?? chapter ?? '—';
    const vn = data?.verseNumber ?? verseNumber ?? '—';
    return `${bn} ${ch}:${vn}`;
  }, [data, bookName, chapter, verseNumber]);

  const bookLabel = useMemo(() => {
    const bn = data?.bookName ?? bookName ?? '';
    const ch = data?.chapter ?? chapter ?? '';
    return `${bn} ${ch}`;
  }, [data, bookName, chapter]);

  const verseLabel = useMemo(() => {
    const vn = data?.verseNumber ?? verseNumber ?? '';
    return `Verse ${vn}`;
  }, [data, verseNumber]);

  const heroGradient = isDark
    ? ['#0D1829', '#1A3F7A', '#0D1829']
    : ['#1A3F7A', '#2755A0', '#1A3F7A'];

  const accentGradient = isDark
    ? ['#1A2D47', '#1E3553']
    : ['#EEF2FF', '#E8EDFF'];

  return (
    <>
      <View style={styles.container}>
        <ActionHeader
          title={bookName ? `${bookName} ${chapter}:${verseNumber} explanation` : 'Verse Explanation'}
          onPress={() => navigation.goBack()}
        />
        {loading ? (
          <View style={styles.center}>
            <View style={styles.loadingIconWrap}>
              <BookOpen size={32} color={COLORS.primary} />
            </View>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: SPACING.lg }}
            />
            <Text style={styles.loadingText}>Loading explanation…</Text>
            <Text style={styles.loadingRef}>
              {bookName} {chapter}:{verseNumber}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <View style={styles.errorIconWrap}>
              <AlertCircle size={36} color={COLORS.error} />
            </View>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => load()}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* ── Hero Reference Card ───────────────────────────────── */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <LinearGradient
                colors={heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                {/* Large decorative quote mark */}
                <Text style={styles.heroQuoteMark}>"</Text>

                <View style={styles.heroPillRow}>
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillText}>{bookLabel}</Text>
                  </View>
                  {!!data?.bibleVersion && (
                    <View style={[styles.heroPill, styles.heroPillAccent]}>
                      <Text
                        style={[styles.heroPillText, styles.heroPillTextAccent]}
                      >
                        {data.bibleVersion}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.heroVerseLabel}>{verseLabel}</Text>
                <Text style={styles.heroRef}>{title}</Text>

                <View style={styles.heroDivider} />

                {(data?.updatedOn || data?.createdOn) && (
                  <Text style={styles.heroMeta}>
                    {data?.updatedOn
                      ? `Updated ${new Date(data.updatedOn).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}`
                      : `Added ${new Date(
                          data?.createdOn as string,
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`}
                  </Text>
                )}
              </LinearGradient>
            </Animated.View>

            {/* ── Section Cards ─────────────────────────────────────── */}
            <Animated.View
              style={[
                styles.contentWrap,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Explanation */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionTitle}>Explanation</Text>
                </View>
                <View style={styles.sectionBody}>
                  {renderTextBlocks(data?.explanation)}
                </View>
              </View>

              {/* Learn More */}
              <LinearGradient
                colors={accentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.learnMoreCard}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[styles.sectionAccentBar, styles.accentBarGold]}
                  />
                  <Text style={[styles.sectionTitle, styles.sectionTitleGold]}>
                    Learn More
                  </Text>
                </View>
                <View style={styles.sectionBody}>
                  <ExpandableText
                    text={data?.learnMore ?? ''}
                    initialChars={250}
                    stepChars={800}
                  />
                </View>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        )}

        {/* Floating Journal Button */}
        <TouchableOpacity
          style={[styles.floatingJournalBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => {
            navigation.navigate(route.journalEntry, {
              bookName,
              chapter,
              verseStart: verseNumber,
              verseEnd: verseNumber,
            });
          }}
          activeOpacity={0.8}
        >
          <BookText size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function createStyles(COLORS: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    // ── Loading ─────────────────────────────────────────────────────────────
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    loadingIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? '#1A2D47' : '#EEF2FF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: SPACING.md,
      fontSize: FONT_SIZES.md,
      color: COLORS.muted,
      fontWeight: '500',
    },
    loadingRef: {
      marginTop: SPACING.xs,
      fontSize: FONT_SIZES.sm,
      color: COLORS.primary,
      fontWeight: '700',
    },

    // ── Error ───────────────────────────────────────────────────────────────
    errorIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? '#2A1A1A' : '#FEF2F2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    errorTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    errorBody: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    retryBtn: {
      marginTop: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
    },
    retryText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: FONT_SIZES.md,
    },

    // ── Hero Card ───────────────────────────────────────────────────────────
    heroCard: {
      margin: SPACING.lg,
      marginBottom: SPACING.sm,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.55 : 0.22,
      shadowRadius: 24,
      elevation: 12,
    },
    heroQuoteMark: {
      position: 'absolute',
      top: -18,
      right: SPACING.xl,
      fontSize: 140,
      color: 'rgba(255,255,255,0.06)',
      fontWeight: '900',
      lineHeight: 150,
    },
    heroPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    heroPill: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 5,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    heroPillText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    heroPillAccent: {
      backgroundColor: 'rgba(240,180,41,0.18)',
      borderColor: 'rgba(240,180,41,0.4)',
    },
    heroPillTextAccent: {
      color: '#F0B429',
    },
    heroVerseLabel: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255,255,255,0.55)',
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: SPACING.xs,
    },
    heroRef: {
      fontSize: FONT_SIZES.xxl + 2,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    heroDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.14)',
      marginVertical: SPACING.md,
    },
    heroMeta: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255,255,255,0.4)',
      fontWeight: '500',
      letterSpacing: 0.3,
    },

    // ── Content Wrap ────────────────────────────────────────────────────────
    contentWrap: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: 100,
      gap: SPACING.md,
    },

    // ── Explanation Card ────────────────────────────────────────────────────
    sectionCard: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: isDark ? '#000' : COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },

    // ── Learn More Card ─────────────────────────────────────────────────────
    learnMoreCard: {
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#1E3553' : '#D8E0F5',
      shadowColor: isDark ? '#000' : COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    sectionAccentBar: {
      width: 4,
      height: 20,
      borderRadius: 2,
      backgroundColor: COLORS.primary,
    },
    accentBarGold: {
      backgroundColor: '#F0B429',
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      color: COLORS.primary,
      letterSpacing: 0.2,
    },
    sectionTitleGold: {
      color: isDark ? '#F0B429' : '#9B6A00',
    },
    sectionBody: {
      padding: SPACING.lg,
      paddingTop: SPACING.md,
    },

    // ── Typography ──────────────────────────────────────────────────────────
    paragraph: {
      color: COLORS.text,
      fontSize: FONT_SIZES.md,
      lineHeight: 25,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      color: COLORS.muted,
      fontSize: FONT_SIZES.sm,
      fontStyle: 'italic',
      paddingVertical: SPACING.sm,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
      marginBottom: SPACING.sm,
    },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginTop: 9,
      backgroundColor: COLORS.primary,
      flexShrink: 0,
    },

    // ── Floating Journal Button ─────────────────────────────────────────────
    floatingJournalBtn: {
      position: 'absolute',
      bottom: SPACING.xl,
      right: SPACING.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}
