import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
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
  Lightbulb,
  GraduationCap,
  BookMarked,
} from 'lucide-react-native';
import { sendPostRequest } from '../../services/api';
import { getVersionById } from '../../assets/bibleVersion/json/bibleVersions';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation } from '@react-navigation/native';
import useBible from '../../features/bible/hooks/useBible';

type DailyVerse = {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  bibleVersion?: string;
  displayDate: string | object;
  displayTime: string | null;
  reflection?: string;
  explanation?: string;
  learnMore?: string;
  createdBy: string;
  createdOn: string;
  updatedBy?: string;
  updatedOn?: string;
  isPublished: boolean;
};

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

function ExpandableContent({
  content,
  label,
  icon: Icon,
  COLORS,
  accent,

}: {
  content: string;
  label: string;
  icon: any;
  COLORS: any;
  accent: string;
}) {
  const INITIAL_LINES = 5;
  const [expanded, setExpanded] = useState(false);
  const lines = content.split('\n').filter(p => p.trim());
  const visibleLines = expanded ? lines : lines.slice(0, INITIAL_LINES);
  const hasMore = lines.length > INITIAL_LINES;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Icon size={16} color={accent} />
        <Text style={[styles.sectionLabel, { color: accent }]}>{label}</Text>
      </View>
      <View style={styles.sectionContent}>
        {visibleLines.map((line, idx) => (
          <Text key={idx} style={styles.sectionParagraph}>
            {line}
          </Text>
        ))}
        {hasMore && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpanded(e => !e)}
          >
            <Text style={[styles.expandBtnText, { color: accent }]}>
              {expanded ? 'Show less' : 'Continue reading'}
            </Text>
            {expanded ? (
              <ChevronUp size={14} color={accent} />
            ) : (
              <ChevronDown size={14} color={accent} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function GreetingHeader() {
  const hour = new Date().getHours();
  let greeting: string;
  let icon: string;

  if (hour < 5) {
    greeting = 'Good evening';
    icon = '🌙';
  } else if (hour < 12) {
    greeting = 'Good morning';
    icon = '☀️';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
    icon = '🌤️';
  } else {
    greeting = 'Good evening';
    icon = '🌅';
  }

  const time = new Date().toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${greeting} ${icon} · ${time}`;
}

export default function DailyVerseScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [verseText, setVerseText] = useState<string>('');
  const [verseLoading, setVerseLoading] = useState<boolean>(false);

  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);
  const accent = COLORS.primary;

  // Bible hook for accessing verse data
  const {
    getVerseTextAsync,
    isOnline,
    getVerseText: getVerseTextSync 
  }:any = useBible();

  const fetchDailyVerse = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sendPostRequest('bible', 'get-todays-verse', {});

      if (response.returnCode === 200 && response.returnData) {
        setDailyVerse(response.returnData as DailyVerse);
      } else {
        useFallbackVerse();
      }
    } catch (err) {
      console.error('Failed to fetch daily verse:', err);
      useFallbackVerse();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyVerse();
  }, [fetchDailyVerse]);

  // Fetch verse text when we have the daily verse data
  useEffect(() => {
    if (dailyVerse) {
      const fetchVerseText = async () => {
        setVerseLoading(true);
        try {
          // Try to get verse text from backend if online, fallback to local
          const text = await getVerseTextAsync(
            dailyVerse.bookName,
            dailyVerse.chapter,
            dailyVerse.verseNumber
          );

          // If we got text from backend, use it
          // If not (null), fall back to local data
          if (text !== null) {
            setVerseText(text);
          } else {
            // Fallback to local data
            const localText = getVerseTextSync(
              dailyVerse.bookName,
              dailyVerse.chapter,
              dailyVerse.verseNumber,
              dailyVerse.bibleVersion ? getVersionById(dailyVerse.bibleVersion).load() : undefined
            ) || '';
            setVerseText(localText);
          }
        } catch (error) {
          console.error('Error fetching verse text:', error);
          // Fallback to local data on error
            const localText = getVerseTextSync(
              dailyVerse.bookName,
              dailyVerse.chapter,
              dailyVerse.verseNumber,
              dailyVerse.bibleVersion ? getVersionById(dailyVerse.bibleVersion).load() : undefined
            ) || '';
            setVerseText(localText);
        } finally {
          setVerseLoading(false);
        }
      };

      fetchVerseText();
    }
  }, [dailyVerse, getVerseTextAsync, getVerseTextSync]);

  const useFallbackVerse = () => {
    setDailyVerse({
      id: 999,
      bookName: 'Psalm',
      chapter: 23,
      verseNumber: 1,
      bibleVersion: 'KJV',
      displayDate: new Date().toISOString(),
      displayTime: null,
      reflection: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters.',
      explanation: 'This beloved verse reminds us that God is our shepherd, guiding and caring for us. Just as a shepherd cares for his sheep, God cares for us. He provides for our needs, leads us to rest, and guides us through life\'s journey. When we trust Him as our shepherd, we lack nothing truly essential.',
      learnMore: 'The 23rd Psalm is one of the most well-known passages in the Bible. It was written by David, who understood the relationship between a shepherd and his sheep. In ancient Israel, sheep were completely dependent on their shepherds for protection, guidance, and provision. This imagery speaks to our complete dependence on God for every aspect of our lives. The promise of "green pastures" and "still waters" speaks of spiritual refreshment and peace that comes from following God\'s leading.',
      createdBy: 'system',
      createdOn: new Date().toISOString(),
      isPublished: true,
    });
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

  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader title={GreetingHeader()} onPress={() => navigation.goBack()} />
        <View style={[styles.loadingContainer, themeStyle.center]}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={{ color: COLORS.muted, marginTop: SPACING.md, fontSize: FONT_SIZES.sm }}>
            Loading verse of the day…
          </Text>
        </View>
      </View>
    );
  }

  if (!dailyVerse) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader title="Daily Verse" onPress={() => navigation.goBack()} />
        <View style={[styles.loadingContainer, themeStyle.center]}>
          <BookOpen size={48} color={COLORS.muted} />
          <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.lg, marginTop: SPACING.md }}>
            No verse available today
          </Text>
        </View>
      </View>
    );
  }

  const verseReference = `${dailyVerse.bookName} ${dailyVerse.chapter}:${dailyVerse.verseNumber}`;
  const headerTitle = scrollOffset > 50 ? verseReference : GreetingHeader();

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader title={headerTitle} onPress={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={e => setScrollOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Date Badge */}
        <View style={styles.dateRow}>
          <Calendar size={14} color={accent} />
          <Text style={[styles.dateText, { color: accent }]}>{formatDate(dailyVerse.displayDate)}</Text>
        </View>

        {/* Main Verse Card */}
        <View style={[styles.verseCard, { backgroundColor: COLORS.cardBackground, borderColor }]}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <View style={styles.verseCardInner}>
            <Text style={[styles.verseLabel, { color: accent }]}>Verse of the Day</Text>
            <Text style={[styles.verseText, { color: COLORS.text }]}>
              {verseLoading ? 'Loading...' : (verseText || 'The Lord is my shepherd, I shall not want.')}
              "
            </Text>
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <View style={styles.referenceRow}>
              <View style={[styles.referenceDot, { backgroundColor: accent }]} />
              <Text style={[styles.referenceText, { color: accent }]}>{verseReference}</Text>
              {dailyVerse.bibleVersion && (
                <View style={[styles.versionBadge, { backgroundColor: accent + '20' }]}>
                  <Text style={[styles.versionBadgeText, { color: accent }]}>{dailyVerse.bibleVersion}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
       
        {/* Reflection Card */}
        {dailyVerse.reflection && (
          <View style={[styles.contentCard, { backgroundColor: COLORS.cardBackground, borderColor }]}>
            <View style={[styles.cardAccentBar, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <BookMarked size={18} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Reflection</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
              <ExpandableContent
                content={dailyVerse.reflection}
                label="REFLECTION"
                icon={BookMarked}
                COLORS={COLORS}
                accent="#8B5CF6"
              />
            </View>
          </View>
        )}

        {/* Explanation Card */}
        {dailyVerse.explanation && (
          <View style={[styles.contentCard, { backgroundColor: COLORS.cardBackground, borderColor }]}>
            <View style={[styles.cardAccentBar, { backgroundColor: '#3B82F6' }]} />
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={18} color="#3B82F6" />
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Explanation</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
              <ExpandableContent
                content={dailyVerse.explanation}
                label="EXPLANATION"
                icon={Lightbulb}
                COLORS={COLORS}
                accent="#3B82F6"
              />
            </View>
          </View>
        )}

        {/* Learn More Card */}
        {dailyVerse.learnMore && (
          <View style={[styles.contentCard, { backgroundColor: COLORS.cardBackground, borderColor }]}>
            <View style={[styles.cardAccentBar, { backgroundColor: '#10B981' }]} />
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <GraduationCap size={18} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Learn More</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
              <ExpandableContent
                content={dailyVerse.learnMore}
                label="LEARN MORE"
                icon={GraduationCap}
                COLORS={COLORS}
                accent="#10B981"
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.muted }]}>
            Meditate on this verse today.{'\n'}
            Let God's word guide your thoughts and actions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  verseCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
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
    marginBottom: SPACING.md,
    opacity: 0.85,
  },
  openQuote: {
    fontSize: 56,
    lineHeight: 48,
    fontStyle: 'italic',
    opacity: 0.25,
    marginBottom: -SPACING.sm,
  },
  verseText: {
    fontSize: FONT_SIZES.lg,
    fontStyle: 'italic',
    lineHeight: 30,
    marginBottom: SPACING.lg,
  },
  divider: {
    height: 1,
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
  },
  referenceText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  versionBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  cardAccentBar: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionDivider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  sectionContainer: {
    marginTop: SPACING.sm,
  },
  sectionContent: {},
  sectionParagraph: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    color: '#666',
    marginBottom: SPACING.sm,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  expandBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});