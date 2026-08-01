import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  Calendar,
  Feather,
  FileText,
  Heart,
  Layers,
  PenLine,
  RefreshCcw,
} from 'lucide-react-native';
import ActionHeader from '../../reusable/ActionHeader';
import RichText from '../../reusable/RichText';
import { AppContext } from '../../common/AppContext';
import {
  BORDER_RADIUS,
  FONT_SIZES,
  getColors,
  SPACING,
} from '../../constants/theme';
import {
  DailyExegesis,
  getAllDailyExegesisPublic,
  getTodaysExegesis,
} from '../../services/adminApi';
import { route } from '../../component/navigations/routes';

const fallbackExegesis: DailyExegesis = {
  id: 0,
  title: 'The Word That Leads Us Home',
  passageReference: 'John 15:4-5',
  introduction:
    'Daily Exegesis will appear here once it is published by an administrator.',
  contextSummary:
    'This placeholder keeps the screen useful while content is being prepared.',
  teachingBody:
    'The Lordsbook Daily Exegesis is designed to give the reader a focused passage, a short explanation, and a clear path into prayer and application. It should remain concise enough for daily reading while still helping the user study faithfully.',
  application:
    'Read slowly, ask what the passage reveals about God, and write one faithful response in your journal.',
  prayer:
    'Lord, open my eyes to Your Word and teach me to abide faithfully today.',
  tags: 'daily,exegesis,abide',
  displayDate: new Date().toISOString(),
  createdOn: new Date().toISOString(),
  isPublished: true,
};

const parsePassage = (reference: string) => {
  const match = reference.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!match) return null;
  return {
    bookName: match[1].trim(),
    chapter: Number(match[2]),
    verseNumber: match[3] ? Number(match[3]) : 1,
  };
};

export default function DailyExegesisScreen() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exegesis, setExegesis] = useState<DailyExegesis | null>(null);
  const [series, setSeries] = useState<DailyExegesis[]>([]);

  const loadExegesis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, list] = await Promise.all([
        getTodaysExegesis(),
        getAllDailyExegesisPublic(0, 10, {
          smartDefault: true,
          futureDays: 30,
        }),
      ]);
      setExegesis(today);
      setSeries(
        [...(list.content || [])].sort(
          (a, b) =>
            new Date(a.displayDate).getTime() -
            new Date(b.displayDate).getTime(),
        ),
      );
    } catch (err: any) {
      setError(err?.message || 'Daily exegesis is not available yet.');
      setExegesis(fallbackExegesis);
      setSeries([fallbackExegesis]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExegesis();
  }, [loadExegesis]);

  const item = exegesis ?? fallbackExegesis;
  const passage = parsePassage(item.passageReference);
  const displayDate = new Date(item.displayDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const openInBible = () => {
    if (!passage) return;
    navigation.navigate(route.bible, passage);
  };

  const saveToLedger = () => {
    navigation.navigate(route.journalEntry, {
      title: item.title,
      reflection: [item.introduction, item.contextSummary, item.teachingBody]
        .filter(Boolean)
        .join('\n\n'),
      prayers: item.prayer,
      application: item.application,
      category: 'study',
      tags: item.tags,
      passageRef: item.passageReference,
      ...(passage || {}),
      source: 'daily-exegesis',
    });
  };

  return (
    <View style={styles.container}>
      <ActionHeader
        mode="standard"
        title="Daily Exegesis"
        subtitle="Lordsbook teaching"
        onPress={() =>
          navigation.canGoBack()
            ? navigation.goBack()
            : navigation.navigate(route.home)
        }
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.mutedText}>Preparing today's teaching...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={loadExegesis}
              activeOpacity={0.8}
            >
              <RefreshCcw size={15} color={COLORS.warning} />
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.heroCard}>
            <View style={styles.dateRow}>
              <Calendar size={15} color={COLORS.primary} />
              <Text style={styles.dateText}>{displayDate}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <TouchableOpacity
              style={styles.referencePill}
              activeOpacity={passage ? 0.75 : 1}
              onPress={openInBible}
            >
              <BookOpen size={16} color={COLORS.primary} />
              <Text style={styles.referenceText}>{item.passageReference}</Text>
            </TouchableOpacity>
          </View>

          {series.length > 1 ? (
            <View style={styles.seriesCard}>
              <Text style={styles.seriesTitle}>Daily Exegesis Series</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seriesList}
              >
                {series.map(entry => {
                  const active = entry.id === item.id;
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.seriesChip,
                        active && styles.seriesChipActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setExegesis(entry)}
                    >
                      <Text
                        style={[
                          styles.seriesChipText,
                          active && styles.seriesChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {entry.passageReference}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Section
            icon={Feather}
            title="Introduction"
            text={item.introduction}
            styles={styles}
            colors={COLORS}
          />
          <Section
            icon={Layers}
            title="Context Summary"
            text={item.contextSummary}
            styles={styles}
            colors={COLORS}
          />
          <Section
            icon={FileText}
            title="Teaching"
            text={item.teachingBody}
            styles={styles}
            colors={COLORS}
            required
          />
          <Section
            icon={PenLine}
            title="Application"
            text={item.application}
            styles={styles}
            colors={COLORS}
          />
          <Section
            icon={Heart}
            title="Prayer"
            text={item.prayer}
            styles={styles}
            colors={COLORS}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !passage && styles.actionButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={openInBible}
              disabled={!passage}
            >
              <BookOpen size={17} color="#fff" />
              <Text style={styles.actionText}>Open in Bible</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={saveToLedger}
            >
              <PenLine size={17} color={COLORS.primary} />
              <Text style={styles.secondaryText}>Save to Ledger</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ icon: Icon, title, text, styles, colors, required }: any) {
  if (!text && !required) return null;
  const body = text || 'No content added yet.';
  const hasRichMarkers = /(\*\*|^#{1,3}\s|^[•\-]\s|^\d+\.\s)/m.test(body);
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon size={16} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {hasRichMarkers ? (
        <RichText
          text={body}
          textStyle={styles.sectionText}
          accentColor={colors.primary}
          paragraphGap={8}
        />
      ) : (
        <Text style={styles.sectionText}>{body}</Text>
      )}
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: SPACING.md,
      paddingBottom: SPACING.xxl,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      padding: SPACING.xl,
    },
    mutedText: {
      color: COLORS.muted,
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: `${COLORS.warning}14`,
      marginBottom: SPACING.md,
    },
    errorText: {
      flex: 1,
      color: COLORS.warning,
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
    },
    heroCard: {
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACING.sm,
    },
    dateText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    title: {
      color: COLORS.text,
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
      lineHeight: 32,
      marginBottom: SPACING.md,
    },
    referencePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: `${COLORS.primary}12`,
    },
    referenceText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.sm,
      fontWeight: '800',
    },
    sectionCard: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.sm,
    },
    seriesCard: {
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    seriesTitle: {
      color: COLORS.text,
      fontSize: FONT_SIZES.sm,
      fontWeight: '900',
      marginBottom: 8,
    },
    seriesList: {
      gap: 8,
      paddingRight: SPACING.md,
    },
    seriesChip: {
      maxWidth: 150,
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    seriesChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    seriesChipText: {
      color: COLORS.textSecondary,
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
    },
    seriesChipTextActive: {
      color: '#fff',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    sectionIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${COLORS.primary}12`,
    },
    sectionTitle: {
      color: COLORS.text,
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
    },
    sectionText: {
      color: COLORS.textSecondary,
      fontSize: FONT_SIZES.md,
      lineHeight: 24,
      fontWeight: '500',
    },
    actionsRow: {
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: COLORS.primary,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionText: {
      color: '#fff',
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.primary,
      backgroundColor: `${COLORS.primary}08`,
    },
    secondaryText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
    },
  });
