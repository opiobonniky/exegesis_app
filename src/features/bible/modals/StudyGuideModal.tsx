import React, { useContext, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Repeat2,
  Info,
  BookMarked,
  Sparkles,
  HeartHandshake,
  GraduationCap,
  Lightbulb,
  Compass,
  ArrowLeft,
} from 'lucide-react-native';
import { AppContext } from '../../../common/AppContext';
import { getColors, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

const STEPS = [
  {
    icon: Repeat2,
    color: '#3B82F6',
    title: '1. Observe',
    text: 'What words repeat? What commands, promises, warnings, transitions, or contrasts are marked in the text?',
    actions: [
      'Note repeated words or phrases',
      'Look for commands, promises, and warnings',
      'Identify transitions and contrasts',
      'Mark the structure of the passage',
    ],
  },
  {
    icon: Info,
    color: '#10B981',
    title: '2. Ask',
    text: 'Who is speaking? Who is listening? What questions does this passage raise?',
    actions: [
      'Consider who is speaking and who is listening',
      'What does this reveal about God?',
      'What does this reveal about humanity?',
      'What tensions or mysteries arise?',
    ],
  },
  {
    icon: BookMarked,
    color: '#F59E0B',
    title: '3. Understand',
    text: 'Open Book Context to learn the author, audience, purpose, themes, and Christ-centered connection.',
    actions: [
      'Learn the historical and cultural context',
      'Understand the author and original audience',
      'Identify the main themes and purpose',
      'See how it points to Christ',
    ],
  },
  {
    icon: Sparkles,
    color: '#8B5CF6',
    title: '4. Search',
    text: 'Use the Lab or Search to compare passages and trace related themes across Scripture.',
    actions: [
      'Study key words in the original languages',
      'Compare with related passages',
      'Trace themes across the canon',
      'Use cross-references and commentaries',
    ],
  },
  {
    icon: HeartHandshake,
    color: '#EF4444',
    title: '5. Apply',
    text: 'Ask what you should believe, obey, confess, pray, or save into your Legacy Ledger.',
    actions: [
      'What should I believe or trust?',
      'What should I obey or put into practice?',
      'What should I confess or repent of?',
      'Save reflections to your Legacy Ledger',
    ],
  },
];

export default function StudyGuideScreen() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const params = screenRoute.params || {};
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { language } = useLanguage();

  const bookName = params.bookName as string | undefined;
  const chapter = params.chapter as number | undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: `${COLORS.primary}15` }]}>
            <GraduationCap size={20} color={COLORS.primary} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: COLORS.text }]}>
              How Do I Study This Passage?
            </Text>
            {bookName && (
              <Text style={[styles.headerRef, { color: COLORS.textSecondary }]}>
                {bookName} {chapter || ''}
              </Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, { backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}20` }]}>
          <Lightbulb size={18} color={COLORS.primary} />
          <Text style={[styles.introText, { color: COLORS.textSecondary }]}>
            A simple 5-step framework to help you engage deeply with any passage of Scripture.
          </Text>
        </View>

        {STEPS.map((step, idx) => {
          const IconC = step.icon;
          return (
            <View key={idx} style={[styles.stepCard, { borderLeftColor: step.color }]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: `${step.color}18` }]}>
                  <IconC size={20} color={step.color} />
                </View>
                <View style={styles.stepTitleWrap}>
                  <Text style={[styles.stepTitle, { color: COLORS.text }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepText, { color: COLORS.textSecondary }]}>
                    {step.text}
                  </Text>
                </View>
              </View>
              <View style={[styles.stepActionsDivider, { backgroundColor: COLORS.border }]} />
              {step.actions.map((action, ai) => (
                <View key={ai} style={styles.stepAction}>
                  <View style={[styles.stepActionDot, { backgroundColor: step.color }]} />
                  <Text style={[styles.stepActionText, { color: COLORS.textSecondary }]}>
                    {action}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={[styles.footerCard, { backgroundColor: `${COLORS.primary}06`, borderColor: `${COLORS.primary}18` }]}>
          <Compass size={18} color={COLORS.primary} />
          <Text style={[styles.footerText, { color: COLORS.muted }]}>
            As you study, save insights, prayers, and applications to your Legacy Ledger.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.gotItBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.gotItText}>Got it</Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'ios' ? 32 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
  },
  headerRef: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 0,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  introText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  stepCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  stepHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepTitleWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  stepActionsDivider: {
    height: 1,
    marginVertical: 12,
  },
  stepAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepActionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepActionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  footerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  gotItBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
});
