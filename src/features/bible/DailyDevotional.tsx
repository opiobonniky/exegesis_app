import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  createThemeStyles,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import {
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { sendPostRequest } from '../../services/api';
import { getVerseText } from '../../utilits/bibleUtils';
import { getVersionById } from '../../assets/bibleVersion/json/bibleVersions';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation, useRoute } from '@react-navigation/native';


type DailyVerse = {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  bibleVersion?: string;
  reflection?: string;
  title?: string;
  content?: string;
  displayDate: string | object;
  displayTime: string | null;
  published?: boolean;
  isPublished?: boolean;
};

type RouteParams = {
  date?: string;
  mode?: 'verse' | 'devotion';
};

function parseContent(content: string): {
  verseRef: string;
  verseText: string;
  sectionTitle: string;
  paragraphs: string[];
} {
  const lines = content.split('\n');
  const verseRef = lines[0]?.trim() ?? '';
  const verseText = lines[1]?.trim() ?? '';

  let sectionTitle = '';
  let bodyStart = 2;
  for (let i = 2; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0 && sectionTitle === '') {
      sectionTitle = trimmed;
      bodyStart = i + 1;
      break;
    }
  }

  const bodyRaw = lines.slice(bodyStart).join('\n');
  const paragraphs = bodyRaw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return { verseRef, verseText, sectionTitle, paragraphs };
}

function parseDisplayDate(displayDate: string | object): string {
  if (!displayDate) return new Date().toISOString();
  if (typeof displayDate === 'string') return displayDate;
  try {
    const obj = displayDate as any;
    if (obj.seconds) return new Date(obj.seconds * 1000).toISOString();
    if (obj._seconds) return new Date(obj._seconds * 1000).toISOString();
  } catch {}
  return new Date().toISOString();
}

function DevotionBody({
  paragraphs,
  COLORS,
  dynamicStyles,
}: {
  paragraphs: string[];
  COLORS: any;
  dynamicStyles: any;
}) {
  const INITIAL_COUNT = 3;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? paragraphs : paragraphs.slice(0, INITIAL_COUNT);
  const hasMore = paragraphs.length > INITIAL_COUNT;

  return (
    <View>
      {visible.map((para, idx) => (
        <Text key={idx} style={dynamicStyles.paragraph}>
          {para}
        </Text>
      ))}
      {hasMore && (
        <TouchableOpacity
          style={dynamicStyles.expandBtn}
          onPress={() => setExpanded(e => !e)}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.expandBtnText}>
            {expanded ? 'Show less' : 'Continue reading'}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color={COLORS.primary} />
          ) : (
            <ChevronDown size={16} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function DailyDevotionalScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { date } = (route.params as RouteParams) || {};

  const [loading, setLoading] = useState(true);
  const [devotion, setDevotion] = useState<DailyVerse | null>(null);

  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);

  useEffect(() => {
    fetchDailyDevotional();
  }, [date]);

  const fetchDailyDevotional = async () => {
    setLoading(true);
    try {
      const response = await sendPostRequest(
        'bible',
        'get-todays-devotion',
        {},
      );
      if (response.returnCode === 200 && response.returnData) {
        setDevotion(response.returnData as DailyVerse);
      } else {
        useFallbackDevotional();
      }
    } catch (err) {
      console.error('Failed to fetch daily devotional:', err);
      useFallbackDevotional();
    } finally {
      setLoading(false);
    }
  };

  const useFallbackDevotional = () => {
    setDevotion({
      id: 999,
      bookName: 'Jeremiah',
      chapter: 29,
      verseNumber: 11,
      title: 'Hope in Every Season',
      content:
        "Jeremiah 29:11 (NKJV)\nFor I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.\n\n Trusting God's Perfect Plan \n\nEven in the darkest seasons of life, God's intentions toward us remain good. Jeremiah wrote these words to a people in exile — far from home, uncertain of their future.\n\nYet into that uncertainty, God spoke a word of promise. Not because their circumstances were easy, but because His character is faithful.\n\nToday, you may be in your own kind of exile — a season of waiting, loss, or confusion. This verse invites you to anchor your hope not in your current situation, but in the One who holds your future.\n\nMeditate on this truth: God's plans for you are deliberate and good. Surrender your anxieties and trust Him today.",
      displayDate: new Date().toISOString(),
      displayTime: new Date().toISOString(),
      isPublished: true,
    });
  };

  const isToday = (dateVal: string | object): boolean => {
    try {
      const d = new Date(parseDisplayDate(dateVal));
      return d.toDateString() === new Date().toDateString();
    } catch {
      return false;
    }
  };

  const formatDate = (dateVal: string | object): string => {
    try {
      const d = new Date(parseDisplayDate(dateVal));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Today';
    }
  };

  const accent = COLORS.primary;
  const cardBg = COLORS.cardBackground;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const s = StyleSheet.create({
    // ── Outer wrapper (fixed header + scrollable body) ──
    outer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    // ── ScrollView ──
    container: {
      flex: 1,
    },
    scroll: {
      padding: SPACING.md,
      paddingBottom: SPACING.xl,
    },

    // ── Date row ──
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACING.lg,
    },
    dateText: {
      color: accent,
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      letterSpacing: 0.3,
    },

    // ── Verse card ──
    verseCard: {
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor,
      marginBottom: SPACING.lg,
      overflow: 'hidden',
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    verseAccentBar: {
      height: 4,
      backgroundColor: accent,
      width: '100%',
    },
    verseCardInner: {
      padding: SPACING.xl,
    },
    verseLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: accent,
      marginBottom: SPACING.md,
      opacity: 0.85,
    },
    openQuote: {
      fontSize: 64,
      lineHeight: 52,
      color: accent,
      opacity: 0.25,
      fontStyle: 'italic',
      marginBottom: -SPACING.sm,
    },
    verseText: {
      fontSize: FONT_SIZES.xl,
      fontStyle: 'italic',
      color: COLORS.text,
      lineHeight: 34,
      marginBottom: SPACING.lg,
    },
    divider: {
      height: 1,
      backgroundColor: dividerColor,
      marginBottom: SPACING.md,
    },
    referenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    referenceDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: accent,
    },
    referenceText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: accent,
      letterSpacing: 0.3,
    },
    versionBadge: {
      backgroundColor: accent + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    versionBadgeText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      color: accent,
      letterSpacing: 0.3,
    },
    dateRowInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: SPACING.sm,
    },
    dateTextInline: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '500',
    },

    // ── Devotion card ──
    devotionCard: {
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor,
      marginBottom: SPACING.xl,
      overflow: 'hidden',
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    devotionCardInner: {
      padding: SPACING.xl,
    },
    devotionLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: COLORS.muted,
      marginBottom: SPACING.sm,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '800',
      color: COLORS.text,
      lineHeight: 30,
      marginBottom: SPACING.lg,
      letterSpacing: -0.3,
    },
    devotionDivider: {
      height: 1,
      backgroundColor: dividerColor,
      marginBottom: SPACING.lg,
    },
    paragraph: {
      fontSize: FONT_SIZES.md,
      lineHeight: 27,
      color: COLORS.textSecondary,
      marginBottom: SPACING.md,
    },
    expandBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: SPACING.xs,
      paddingVertical: SPACING.sm,
      alignSelf: 'flex-start',
    },
    expandBtnText: {
      color: accent,
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      letterSpacing: 0.2,
    },

    // ── Footer ──
    footer: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xl,
      alignItems: 'center',
    },
    footerText: {
      color: COLORS.muted,
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      lineHeight: 20,
      fontStyle: 'italic',
    },
  });

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[s.outer, themeStyle.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{
            color: COLORS.muted,
            marginTop: SPACING.md,
            fontSize: FONT_SIZES.sm,
          }}
        >
          Loading devotional…
        </Text>
      </View>
    );
  }

  // ── Empty state ──
  if (!devotion) {
    return (
      <View style={[s.outer, themeStyle.center]}>
        <BookOpen size={48} color={COLORS.muted} />
        <Text
          style={{
            color: COLORS.muted,
            fontSize: FONT_SIZES.lg,
            marginTop: SPACING.md,
          }}
        >
          No devotional available {date ? 'for this date' : 'today'}
        </Text>
      </View>
    );
  }

  const parsed = devotion.content ? parseContent(devotion.content) : null;

  const verseBody =
    parsed?.verseText ||
    getVerseText(
      devotion.bookName,
      devotion.chapter,
      devotion.verseNumber,
      devotion.bibleVersion ? getVersionById(devotion.bibleVersion).load() : undefined
    ) ||
    '';

  const verseReference = `${devotion.bookName} ${devotion.chapter}:${devotion.verseNumber}`;
  const sectionTitle = parsed?.sectionTitle || devotion.title || '';
  // Use explanation as main content, fallback to reflection for backward compatibility
  const paragraphs = parsed?.paragraphs.length
    ? parsed.paragraphs
    : (devotion as any).explanation
      ? [(devotion as any).explanation]
      : devotion.reflection
        ? [devotion.reflection]
        : [];

  return (
    // ── Outer View keeps ActionHeader fixed ──
    <View style={s.outer}>
      <ActionHeader
        title={
          isToday(devotion.displayDate) ? sectionTitle : 'Daily Devotional'
        }
        onPress={() => navigation.goBack()}
      />

      {/* Only this ScrollView scrolls */}
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Date badge */}
        <View style={s.dateRow}>
          <Calendar size={14} color={accent} />
          <Text style={s.dateText}>{formatDate(devotion.displayDate)}</Text>
        </View>

        {/* ── Verse card ── */}
        <View style={s.verseCard}>
          <View style={s.verseAccentBar} />
          <View style={s.verseCardInner}>
            <Text style={s.verseLabel}>Verse of the Day</Text>
            <Text style={s.openQuote}>"</Text>
            <Text style={s.verseText}>
              {verseBody ||
                'But David said to Abishai, "Do not destroy him; for who can stretch out his hand against the Lord\'s anointed, and be guiltless?"'}
            </Text>
            <View style={s.divider} />
            <View style={s.referenceRow}>
              <View style={s.referenceDot} />
              <Text style={s.referenceText}>{verseReference}</Text>
              {devotion.bibleVersion && (
                <View style={s.versionBadge}>
                  <Text style={s.versionBadgeText}>{devotion.bibleVersion}</Text>
                </View>
              )}
            </View>
            <View style={s.dateRowInline}>
              <Calendar size={12} color={COLORS.muted} />
              <Text style={s.dateTextInline}>
                {formatDate(devotion.displayDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Devotion card ── */}
        <View style={s.devotionCard}>
          <View style={s.devotionCardInner}>
            <Text style={s.devotionLabel}>Today's devotion</Text>
            {sectionTitle ? (
              <Text style={s.sectionTitle}>{sectionTitle}</Text>
            ) : null}
            <View style={s.devotionDivider} />
            <DevotionBody
              paragraphs={paragraphs}
              COLORS={COLORS}
              dynamicStyles={s}
            />
          </View>
        </View>

        {/* ── Learn More card ── */}
        {(devotion as any).learnMore ? (
          <View style={s.devotionCard}>
            <View style={s.devotionCardInner}>
              <Text style={s.devotionLabel}>Learn More</Text>
              <View style={s.devotionDivider} />
              <DevotionBody
                paragraphs={(devotion as any).learnMore.split('\n\n').filter((p: string) => p.trim())}
                COLORS={COLORS}
                dynamicStyles={s}
              />
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Meditate on this word today.{'\n'}Let it guide your thoughts and
            actions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
