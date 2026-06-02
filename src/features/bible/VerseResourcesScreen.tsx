/**
 * VerseResourcesScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen verse resource viewer — fetches data from the backend API.
 * Features: Commentaries, Cross-References, Word Studies, Translation
 * Comparison, Bible Dictionary, Interlinear, Related Topics.
 *
 * Supports all 22 languages and RTL layouts (Arabic / Urdu).
 * Uses ExpandableText for long commentary/dictionary content.
 */

import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';

import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import ActionHeader from '../../reusable/ActionHeader';
import { useLanguage, isRtlLanguage, toArabicIndic } from '../../component/language-translation/LanguageProvider';
import ExpandableText from './ExpandableText';
import {
  getVerseResources,
  getTranslationComparison,
  VerseResourceData,
  TranslationComparisonEntry,
  DictionaryEntry,
  InterlinearWord,
} from '../../services/verseResourcesApi';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Hash,
  Tags,
  Crosshair,
  Book,
  FileText,
  AlertCircle,
  RefreshCw,
  Languages,
} from 'lucide-react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ResourceView = 'main' | 'translation' | 'dictionary' | 'interlinear';

// ── Default demo data ────────────────────────────────────────────────────────
const DEFAULT_DEMO_DATA: VerseResourceData = {
  id: 0,
  bookName: 'Genesis',
  chapter: 1,
  verseStart: 1,
  verseEnd: 1,
  commentaries: [
    {
      author: 'Matthew Henry',
      title: "Matthew Henry's Concise Commentary",
      text: 'The first verse of the Bible gives us a satisfying account of the origin of the universe. The world was not eternal, nor did it come by chance. God, the eternal self-existent Being, by His sovereign power and wisdom, created the heavens and the earth. This truth is the foundation of all true religion and the basis of our faith.',
    },
    {
      author: 'C.H. Spurgeon',
      title: "Spurgeon's Devotional Commentary",
      text: '\"In the beginning God\" — these four words are the foundation upon which all knowledge rests. Before the mountains were brought forth, before the stars sang together, God was. He existed in the fullness of His eternal being, needing nothing, wanting nothing, but out of the abundance of His love choosing to create. Let the reader pause and consider: the God who made the heavens is the same God who stoops to hear our prayers.',
    },
    {
      author: 'John Calvin',
      title: "Calvin's Commentaries",
      text: 'Moses intends here to assert that the world was created, and that it was created by God. By faith we understand that the worlds were framed by the word of God. The Hebrew word \"bara\" is used exclusively for divine creativity — it means to create out of nothing. This stands as a rebuke to all human pride, for we can only shape what already exists, but God alone brings existence out of non-existence.',
    },
  ],
  crossReferences: [
    { ref: 'John 1:1-3', text: 'In the beginning was the Word, and the Word was with God, and the Word was God. He was with God in the beginning. Through him all things were made.' },
    { ref: 'Psalm 33:6', text: 'By the word of the Lord the heavens were made, their starry host by the breath of his mouth.' },
    { ref: 'Colossians 1:16', text: 'For in him all things were created: things in heaven and on earth, visible and invisible, whether thrones or powers or rulers or authorities.' },
    { ref: 'Hebrews 11:3', text: 'By faith we understand that the universe was formed at God\'s command, so that what is seen was not made out of what was visible.' },
    { ref: 'Isaiah 45:18', text: 'For this is what the Lord says — he who created the heavens, he is God; he who fashioned and made the earth, he founded it.' },
  ],
  wordStudies: [
    { word: 'בראשית (Bereshit)', transliteration: 'Bereshit', meaning: 'In beginning — The Hebrew word carries the sense of a specific commencement of time itself. Unlike the Greek concept of eternal cycles, Bereshit declares a definite starting point for history. The prefix \"Be-\" (\"in\") combined with \"reshit\" (\"beginning, firstfruits\") suggests a period of time, the first installment of a new order.', strongs: 'H7225' },
    { word: 'ברא (Bara)', transliteration: 'Bara', meaning: 'He created — This verb is used exclusively in Scripture for divine activity. It never describes human craftsmanship. Bara implies creation ex nihilo (out of nothing), a work that requires no pre-existing material. In the Qal stem, it always has God as its subject, emphasizing that creation is a uniquely divine prerogative.', strongs: 'H1254' },
    { word: 'אלהים (Elohim)', transliteration: 'Elohim', meaning: 'God — Though grammatically plural in form (suggesting fullness and majesty), this name for God is consistently used with singular verbs when referring to the one true God. It hints at the complexity within the Godhead while maintaining absolute monotheism. The word conveys power, judgment, and covenant authority.', strongs: 'H430' },
  ],
  dictionaryTerms: [
    { term: 'Creation Ex Nihilo', pronunciation: 'eks NEE-hee-loh', definition: 'Creation out of nothing', description: 'The theological doctrine that God did not use any pre-existing material when He created the universe. He spoke, and what He commanded came into being from non-being. This distinguishes Christian theism from all other worldviews, which either posit eternal matter or emanation from the divine substance.' },
    { term: 'Divine Fiat', pronunciation: 'FEE-aht', definition: 'A decree or command of God', description: 'The concept that God\'s word carries creative power. When God speaks, reality conforms to His utterance. Unlike human speech which describes or requests, divine speech accomplishes. This is seen supremely in the creation account where \"God said, Let there be... and there was.\"' },
  ],
  interlinearWords: [
    { original: 'בראשית', transliteration: 'Bereshit', translation: 'In beginning', strongs: 'H7225' },
    { original: 'ברא', transliteration: 'bara', translation: 'created', strongs: 'H1254' },
    { original: 'אלהים', transliteration: 'Elohim', translation: 'God', strongs: 'H430' },
    { original: 'את', transliteration: 'et', translation: '[direct object marker]', strongs: 'H853' },
    { original: 'השמים', transliteration: 'ha-shamayim', translation: 'the heavens', strongs: 'H8064' },
    { original: 'ואת', transliteration: 'v\'et', translation: 'and [direct object]', strongs: 'H853' },
    { original: 'הארץ', transliteration: 'ha-aretz', translation: 'the earth', strongs: 'H776' },
  ],
  relatedTopics: [
    { name: 'Creation' },
    { name: 'God the Creator' },
    { name: 'Origins' },
    { name: 'Divine Power' },
    { name: 'The Beginning' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-views
// ─────────────────────────────────────────────────────────────────────────────

function TranslationView({ data, colors, isRtl, bc }: { data: any[]; colors: any; isRtl: boolean; bc: any }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
          {bc?.noExplanationFound || 'No translation data available for this verse.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={subStyles.wrapper}>
      {data.map((t, i) => (
        <View key={`trans-${i}`} style={[subStyles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: '#3B82F6', borderLeftWidth: 3 }]}>
          <View style={[subStyles.badgeRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[subStyles.badge, { backgroundColor: '#3B82F618' }]}>
              <Text style={[subStyles.badgeText, { color: '#3B82F6' }]}>{t.abbreviation}</Text>
            </View>
            <Text style={[subStyles.versionLabel, { color: colors.muted }]} numberOfLines={1}>{t.version}</Text>
          </View>
          <View style={[subStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[subStyles.cardText, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

function DictionaryView({ data, colors, isRtl, bc }: { data: DictionaryEntry[]; colors: any; isRtl: boolean; bc: any }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
          {bc?.noExplanationFound || 'No dictionary entries available.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={subStyles.wrapper}>
      {data.map((entry, i) => (
        <View key={`dict-${i}`} style={[subStyles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: '#10B981', borderLeftWidth: 3 }]}>
          <Text style={[subStyles.term, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>{entry.term}</Text>
          <Text style={[subStyles.pron, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>/{entry.pronunciation}/</Text>
          <View style={[subStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[subStyles.definition, { color: '#10B981', textAlign: isRtl ? 'right' : 'left' }]}>{entry.definition}</Text>
          <ExpandableText
            text={entry.description}
            initialLines={4}
            expandLabel={bc?.learnMore || 'Read more'}
            closeLabel={bc?.cancel || 'Close'}
          />
        </View>
      ))}
    </View>
  );
}

function InterlinearView({ data, colors, isRtl, bc }: { data: InterlinearWord[]; colors: any; isRtl: boolean; bc: any }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
          {bc?.noExplanationFound || 'No interlinear data available for this verse.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={subStyles.wrapper}>
      <View style={[subStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Table header */}
        <View style={[subStyles.tableHead, { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
          <Text style={[subStyles.colHeadOrig, { color: '#F59E0B', textAlign: isRtl ? 'right' : 'left' }]}>{bc?.oldTestament || 'Original'}</Text>
          <Text style={[subStyles.colHead, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>Strong's</Text>
          <Text style={[subStyles.colHead, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>{bc?.translate || 'Translit.'}</Text>
          <Text style={[subStyles.colHeadTrans, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>{bc?.copy || 'English'}</Text>
        </View>
        {data.map((w, i) => (
          <View key={`il-${i}`} style={[subStyles.tableRow, { flexDirection: isRtl ? 'row-reverse' : 'row', backgroundColor: i % 2 === 0 ? 'transparent' : `${colors.border}40` }]}>
            <Text style={[subStyles.colOrig, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>{w.original}</Text>
            <Text style={[subStyles.col, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>{w.strongs}</Text>
            <Text style={[subStyles.col, { color: colors.muted, fontStyle: 'italic', textAlign: isRtl ? 'right' : 'left' }]}>{w.transliteration}</Text>
            <Text style={[subStyles.colTrans, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>{w.translation}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const subStyles = StyleSheet.create({
  wrapper: { gap: 12, paddingBottom: 16 },
  card: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  versionLabel: { fontSize: FONT_SIZES.xs, flex: 1 },
  divider: { height: 1, marginVertical: 8 },
  cardText: { fontSize: FONT_SIZES.sm, lineHeight: 21 },
  term: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  pron: { fontSize: FONT_SIZES.xs, fontStyle: 'italic', marginTop: 1 },
  definition: { fontSize: FONT_SIZES.sm, fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  description: { fontSize: FONT_SIZES.sm, lineHeight: 21 },
  tableHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  colHeadOrig: { flex: 1.1, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  colHead: { flex: 0.8, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  colHeadTrans: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  colOrig: { flex: 1.1, fontSize: FONT_SIZES.xs, lineHeight: 16 },
  col: { flex: 0.8, fontSize: 10, lineHeight: 16 },
  colTrans: { flex: 1, fontSize: FONT_SIZES.xs, lineHeight: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Card component
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, colors, accentColor, style, isRtl }: { children: React.ReactNode; colors: any; accentColor?: string; style?: any; isRtl?: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, accentColor ? { borderLeftWidth: 3, borderLeftColor: isRtl ? colors.border : accentColor, borderRightWidth: isRtl ? 3 : 0, borderRightColor: isRtl ? accentColor : 'transparent' } : undefined, style]}>
      <View style={{ padding: SPACING.md }}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color, colors, isRtl }: { icon: React.ReactNode; label: string; color: string; colors: any; isRtl?: boolean }) {
  return (
    <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <View style={[styles.sectionAccent, { backgroundColor: color, marginRight: isRtl ? 0 : 8, marginLeft: isRtl ? 8 : 0 }]} />
      {icon}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource Action Card
// ─────────────────────────────────────────────────────────────────────────────

function ResourceActionCard({ icon, label, description, accentColor, onPress, colors, isRtl }: {
  icon: React.ReactNode; label: string; description: string; accentColor: string; onPress: () => void; colors: any; isRtl?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: accentColor, borderRightWidth: isRtl ? 3 : 0, borderRightColor: isRtl ? accentColor : 'transparent' }]}>
      <View style={[styles.actionIconWrap, { backgroundColor: `${accentColor}18` }]}>{icon}</View>
      <View style={[styles.actionTextCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.actionLabel, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
        <Text style={[styles.actionDesc, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>{description}</Text>
      </View>
      {isRtl ? <ChevronLeft size={16} color={colors.muted} strokeWidth={2} /> : <ChevronRight size={16} color={colors.muted} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VerseResourcesScreen({ route: routeProp }: any) {
  const app = useContext(AppContext);
  const navigationHook = useNavigation();
  const goBack = navigationHook.goBack;
  const nav = navigationHook.navigate;
  const { translations: langT, language } = useLanguage();
  const bc = langT?.bible;
  const isRtl = isRtlLanguage(language);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const insets = useSafeAreaInsets();

  const params = routeProp?.params ?? {};
  const rawBookName: string = params.bookName ?? '';
  const rawChapter: number = params.chapter ?? 0;
  const rawVerseNumber: number = params.verseNumber ?? 0;
  const verseText: string = params.verseText ?? '';

  // If no params were passed, default to Genesis 1:1 and use demo data
  const isUsingDemo = !rawBookName || !rawChapter || !rawVerseNumber;
  const bookName = isUsingDemo ? 'Genesis' : rawBookName;
  const chapter = isUsingDemo ? 1 : rawChapter;
  const verseNumber = isUsingDemo ? 1 : rawVerseNumber;
  const verseRef = `${bookName} ${chapter}:${verseNumber}`;

  const [view, setView] = useState<ResourceView>('main');
  const [data, setData] = useState<VerseResourceData | null>(
    isUsingDemo ? DEFAULT_DEMO_DATA : null,
  );
  const [loading, setLoading] = useState(!isUsingDemo);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(isUsingDemo);
  const [translationComp, setTranslationComp] = useState<TranslationComparisonEntry[] | null>(null);
  const [translationCompLoading, setTranslationCompLoading] = useState(false);
  const [translationCompError, setTranslationCompError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchTranslations = useCallback(async () => {
    if (translationComp !== null) return; // already loaded
    setTranslationCompLoading(true);
    setTranslationCompError(null);
    try {
      const response = await getTranslationComparison(bookName, chapter, verseNumber);
      if (response.returnCode === 200 && response.returnData) {
        setTranslationComp(response.returnData);
      } else {
        setTranslationComp(null);
        setTranslationCompError(response.returnMessage || 'No translations available');
      }
    } catch (err: any) {
      console.error('Failed to fetch translation comparison:', err);
      setTranslationComp(null);
      setTranslationCompError(err?.returnMessage || err?.message || 'Failed to load translations');
    } finally {
      setTranslationCompLoading(false);
    }
  }, [bookName, chapter, verseNumber, translationComp]);

  const fetchResources = useCallback(async () => {
    if (isUsingDemo) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getVerseResources(bookName, chapter, verseNumber);
      if (response.returnCode === 200 && response.returnData) {
        setData(response.returnData);
        setIsDemo(false);
      } else {
        // Fall back to demo data when API returns no data
        setData(DEFAULT_DEMO_DATA);
        setIsDemo(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch verse resources:', err);
      // Fall back to demo data on error
      setData(DEFAULT_DEMO_DATA);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [bookName, chapter, verseNumber, isUsingDemo]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [view, data]);

  const isSubView = view !== 'main';
  const subViewConfig = isSubView
    ? view === 'translation'
      ? { title: langT?.translate || 'Translation Comparison', icon: <Languages size={16} color="#3B82F6" strokeWidth={2} />, color: '#3B82F6' }
      : view === 'dictionary'
        ? { title: bc?.resources || 'Bible Dictionary', icon: <Book size={16} color="#10B981" strokeWidth={2} />, color: '#10B981' }
        : { title: bc?.strongsConcordance || 'Interlinear', icon: <FileText size={16} color="#F59E0B" strokeWidth={2} />, color: '#F59E0B' }
    : undefined;

  const accentGradient = isDark ? ['#0D1829', '#1A3F7A', '#0D1829'] : ['#1A3F7A', '#2755A0', '#1A3F7A'];

  const navigateToCrossRef = useCallback((refStr: string) => {
    const match = refStr.match(/^((?:\d\s+)?[A-Za-z\s]+?)\s+(\d+):(\d+)$/);
    if (!match) return;
    const [, b, c, v] = match;
    const ch = parseInt(c, 10);
    const vs = parseInt(v, 10);
    if (!b || isNaN(ch) || isNaN(vs)) return;
    (nav as any)(route.verseResources, {
      bookName: b.trim(),
      chapter: ch,
      verseNumber: vs,
    });
  }, [nav]);

  const hasDictionary = data?.dictionaryTerms && data.dictionaryTerms.length > 0;
  const hasInterlinear = data?.interlinearWords && data.interlinearWords.length > 0;
  const hasCommentaries = data?.commentaries && data.commentaries.length > 0;
  const hasCrossRefs = data?.crossReferences && data.crossReferences.length > 0;
  const hasWordStudies = data?.wordStudies && data.wordStudies.length > 0;
  const hasTopics = data?.relatedTopics && data.relatedTopics.length > 0;

  // ── Render loading state ──
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader
          title={bc?.resources || 'Verse Resources'}
          subtitle={verseRef}
          onPress={goBack}
        />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.heroContent, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.heroPillRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <View style={styles.heroPill}><Text style={styles.heroPillText}>{bookName} {chapter}</Text></View>
                <View style={[styles.heroPill, styles.heroPillAccent]}><Text style={[styles.heroPillText, styles.heroPillTextAccent]}>{bc?.verseLabel || 'Verse'} {toArabicIndic(isRtl, verseNumber)}</Text></View>
              </View>
              <Text style={[styles.heroRef, { textAlign: isRtl ? 'right' : 'left' }]}>{verseRef}</Text>
              <ActivityIndicator color="rgba(255,255,255,0.7)" style={{ marginTop: 12 }} />
            </View>
          </LinearGradient>
        </ScrollView>
      </View>
    );
  }

  // ── Render error / empty state (only when not even demo data is available) ──
  if (error && !data) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader
          title={bc?.resources || 'Verse Resources'}
          subtitle={verseRef}
          onPress={goBack}
        />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.heroContent, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.heroPillRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <View style={styles.heroPill}><Text style={styles.heroPillText}>{bookName} {chapter}</Text></View>
                <View style={[styles.heroPill, styles.heroPillAccent]}><Text style={[styles.heroPillText, styles.heroPillTextAccent]}>{bc?.verseLabel || 'Verse'} {toArabicIndic(isRtl, verseNumber)}</Text></View>
              </View>
              <Text style={[styles.heroRef, { textAlign: isRtl ? 'right' : 'left' }]}>{verseRef}</Text>
              {verseText ? (                    <Text style={[styles.heroVerse, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>{toArabicIndic(isRtl, verseNumber)}. {verseText}</Text>
              ) : null}
            </View>
          </LinearGradient>

          <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
            <AlertCircle size={40} color={COLORS.muted} strokeWidth={1.5} />
            <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.sm, marginTop: SPACING.md, textAlign: 'center' }}>
              {error || (bc?.noExplanationFound || 'No resources available for this verse yet.')}
            </Text>
            <TouchableOpacity
              onPress={() => fetchResources()}
              style={[styles.seeAllBtn, { backgroundColor: `${COLORS.primary}0A`, borderColor: COLORS.border, flexDirection: isRtl ? 'row-reverse' : 'row', marginTop: SPACING.lg }]}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={COLORS.primary} strokeWidth={2} />
              <Text style={[styles.seeAllText, { color: COLORS.primary }]}>{bc?.tryAgain || 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Render main content ──
  if (!data) return null;
  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader
        title={isSubView ? (subViewConfig?.title ?? '') : (bc?.resources || 'Verse Resources')}
        subtitle={verseRef}
        onPress={goBack}
      />

      {isSubView && (
        <TouchableOpacity onPress={() => setView('main')} style={[styles.backToMain, { flexDirection: isRtl ? 'row-reverse' : 'row', backgroundColor: COLORS.surface, borderColor: COLORS.border }]} activeOpacity={0.7}>
          {isRtl ? <ChevronRight size={16} color={COLORS.primary} strokeWidth={2.5} /> : <ChevronLeft size={16} color={COLORS.primary} strokeWidth={2.5} />}
          <Text style={[styles.backToMainText, { color: COLORS.primary }]}>{'Back to Resources'}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {isSubView ? (
            <>
              {view === 'translation' && (
                translationCompLoading ? (
                  <View style={{ paddingVertical: SPACING.xl }}>
                    <ActivityIndicator color={COLORS.primary} />
                  </View>
                ) : translationCompError ? (
                  <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
                    <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>{translationCompError}</Text>
                  </View>
                ) : (
                  <TranslationView data={translationComp || []} colors={COLORS} isRtl={isRtl} bc={bc} />
                )
              )}
              {view === 'dictionary' && <DictionaryView data={data.dictionaryTerms} colors={COLORS} isRtl={isRtl} bc={bc} />}
              {view === 'interlinear' && <InterlinearView data={data.interlinearWords} colors={COLORS} isRtl={isRtl} bc={bc} />}
            </>
          ) : (
            <>
              {/* ── Hero Verse Card ── */}
              <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <View style={[styles.heroContent, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.heroPillRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <View style={styles.heroPill}>
                      <Text style={styles.heroPillText}>{bookName} {chapter}</Text>
                    </View>
                    <View style={[styles.heroPill, styles.heroPillAccent]}>
                      <Text style={[styles.heroPillText, styles.heroPillTextAccent]}>{bc?.verseLabel || 'Verse'} {toArabicIndic(isRtl, verseNumber)}</Text>
                    </View>
                    {isDemo && (
                      <View style={[styles.heroPill, { backgroundColor: 'rgba(255,193,7,0.25)', borderColor: 'rgba(255,193,7,0.5)' }]}>
                        <Text style={[styles.heroPillText, { color: '#FFC107', fontWeight: '800' }]}>Sample</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroRef, { textAlign: isRtl ? 'right' : 'left' }]}>{verseRef}</Text>
                  {verseText ? (
                    <Text style={[styles.heroVerse, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>{toArabicIndic(isRtl, verseNumber)}. {verseText}</Text>
                  ) : null}
                </View>
              </LinearGradient>

              {/* ── Quick Action Cards ── */}
              <View style={{ marginTop: SPACING.sm }}>
                <ResourceActionCard
                  icon={<Languages size={20} color="#3B82F6" strokeWidth={2} />}
                  label={langT?.translate || 'Translation Comparison'}
                  description="Compare this verse across 9 Bible translations side-by-side."
                  accentColor="#3B82F6"
                  onPress={() => { fetchTranslations(); setView('translation'); }}
                  colors={COLORS}
                  isRtl={isRtl}
                />
                {hasInterlinear && (
                  <ResourceActionCard
                    icon={<FileText size={20} color="#F59E0B" strokeWidth={2} />}
                    label={bc?.strongsConcordance || 'Interlinear'}
                    description="Explore the original Hebrew text with Strong's numbers."
                    accentColor="#F59E0B"
                    onPress={() => setView('interlinear')}
                    colors={COLORS}
                    isRtl={isRtl}
                  />
                )}
                {hasDictionary && (
                  <ResourceActionCard
                    icon={<Book size={20} color="#10B981" strokeWidth={2} />}
                    label={bc?.resources || 'Bible Dictionary'}
                    description="Study key theological terms with detailed explanations."
                    accentColor="#10B981"
                    onPress={() => setView('dictionary')}
                    colors={COLORS}
                    isRtl={isRtl}
                  />
                )}
              </View>

              {/* ── Commentaries ── */}
              {hasCommentaries && (
                <>
                  <SectionHeader icon={<BookOpen size={16} color={COLORS.primary} strokeWidth={2} />} label={bc?.commentaries || 'Commentaries'} color={COLORS.primary} colors={COLORS} isRtl={isRtl} />
                  {data.commentaries!.map((entry, i) => (
                    <Card key={`comm-${i}`} colors={COLORS} accentColor={COLORS.primary} isRtl={isRtl}>
                      <Text style={[styles.commAuthor, { color: COLORS.primary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.author}</Text>
                      <Text style={[styles.commSource, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>{entry.title}</Text>
                      <View style={[styles.divider, { backgroundColor: COLORS.border }]} />
                      <ExpandableText
                        text={entry.text}
                        initialLines={6}
                        expandLabel={bc?.learnMore || 'Read more'}
                        closeLabel={bc?.cancel || 'Close'}
                      />
                    </Card>
                  ))}
                </>
              )}

              {/* ── Cross References ── */}
              {hasCrossRefs && (
                <>
                  <SectionHeader icon={<Crosshair size={16} color={COLORS.primary} strokeWidth={2} />} label={bc?.crossReferences || 'Cross References'} color={COLORS.primary} colors={COLORS} isRtl={isRtl} />
                  <Card colors={COLORS} isRtl={isRtl}>
                    {data.crossReferences!.map((ref, i) => (
                      <TouchableOpacity
                        key={`cr-${i}`}
                        style={[styles.crossRefRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }, i < data.crossReferences!.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}
                        activeOpacity={0.7}
                        onPress={() => navigateToCrossRef(ref.ref)}
                      >
                        <View style={[styles.crossRefContent, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                          <Text style={[styles.crossRefRef, { color: COLORS.primary, textAlign: isRtl ? 'right' : 'left' }]}>{ref.ref}</Text>
                          <Text style={[styles.crossRefText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>{ref.text}</Text>
                        </View>
                        {isRtl ? <ChevronLeft size={14} color={COLORS.muted} strokeWidth={2} /> : <ChevronRight size={14} color={COLORS.muted} strokeWidth={2} />}
                      </TouchableOpacity>
                    ))}
                  </Card>
                </>
              )}

              {/* ── Word Studies ── */}
              {hasWordStudies && (
                <>
                  <SectionHeader icon={<Hash size={16} color={COLORS.primary} strokeWidth={2} />} label={bc?.strongsConcordance || 'Word Studies'} color={COLORS.primary} colors={COLORS} isRtl={isRtl} />
                  {data.wordStudies!.map((ws, i) => (
                    <Card key={`ws-${i}`} colors={COLORS} accentColor={COLORS.primary} isRtl={isRtl}>
                      <View style={[styles.wsHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.wsWord, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>{ws.word}</Text>
                        <Text style={[styles.wsTranslit, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>({ws.transliteration})</Text>
                        {ws.strongs ? (
                          <Text style={[styles.wsStrongs, { color: '#F59E0B', textAlign: isRtl ? 'right' : 'left' }]}>{ws.strongs}</Text>
                        ) : null}
                      </View>
                      <ExpandableText
                        text={ws.meaning}
                        initialLines={5}
                        expandLabel={bc?.learnMore || 'Read more'}
                        closeLabel={bc?.cancel || 'Close'}
                      />
                    </Card>
                  ))}
                </>
              )}

              {/* ── Related Topics ── */}
              {hasTopics && (
                <>
                  <SectionHeader icon={<Tags size={16} color={COLORS.primary} strokeWidth={2} />} label={'Related Topics'} color={COLORS.primary} colors={COLORS} isRtl={isRtl} />
                  <View style={[styles.topicRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    {data.relatedTopics!.map((t, i) => (
                      <View key={`topic-${i}`} style={[styles.topicPill, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}25` }]}>
                        <Text style={[styles.topicText, { color: COLORS.primary, textAlign: isRtl ? 'right' : 'left' }]}>{t.name}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* ── Empty state if nothing available ── */}
              {!hasCommentaries && !hasCrossRefs && !hasWordStudies && !hasTopics && (
                <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
                  <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
                    {bc?.noExplanationFound || 'No detailed resources available for this verse yet.'}
                  </Text>
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  // ── Back to main (sub-view header) ──
  backToMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  backToMainText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },

  // ── Hero Card ──
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  heroContent: { flex: 1 },
  heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  heroPill: {
    paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroPillText: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 0.4 },
  heroPillAccent: { backgroundColor: 'rgba(240,180,41,0.18)', borderColor: 'rgba(240,180,41,0.4)' },
  heroPillTextAccent: { color: '#F0B429' },
  heroRef: { fontSize: FONT_SIZES.xxl, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: SPACING.sm },
  heroVerse: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20, fontStyle: 'italic' },

  // ── See All / Retry Button ──
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, marginBottom: SPACING.sm },
  seeAllText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // ── Action Cards ──
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.sm,
  },
  actionIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionTextCol: { flex: 1 },
  actionLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginBottom: 2 },
  actionDesc: { fontSize: FONT_SIZES.xs, lineHeight: 16 },

  // ── Section Header ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', letterSpacing: 0.3 },

  // ── Card ──
  card: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.sm, overflow: 'hidden' },

  // ── Commentary ──
  commAuthor: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  commSource: { fontSize: 11, marginTop: 1 },
  divider: { height: 1, marginVertical: 8 },

  // ── Cross Reference ──
  crossRefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  crossRefContent: { flex: 1 },
  crossRefRef: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginBottom: 2 },
  crossRefText: { fontSize: FONT_SIZES.xs, lineHeight: 18 },

  // ── Word Study ──
  wsHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 },
  wsWord: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  wsTranslit: { fontSize: FONT_SIZES.sm, fontStyle: 'italic' },
  wsStrongs: { fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 0.5, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  // ── Related Topics ──
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  topicText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
});
