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
  CommentaryEntry,
  getVerseResources,
  getTranslationComparison,
  VerseResourceData,
  TranslationComparisonEntry,
  DictionaryEntry,
  InterlinearWord,
  StudyToolResource,
} from '../../services/verseResourcesApi';
import { getBookPrologue, BookPrologue } from '../../services/bookProloguesApi';
import { getVerseWords, StrongsWordData } from '../../services/strongsService';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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

// ── Fallback data (used when API returns empty) ──────────────────────────────
const FALLBACK_COMMENTARIES: CommentaryEntry[] = [
  {
    author: 'Matthew Henry',
    title: "Matthew Henry's Concise Commentary",
    text: 'This passage reveals the character of God and His dealings with humanity. It invites us to consider the depth of His wisdom, the breadth of His love, and the certainty of His promises.',
  },
];

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

function InterlinearView({ data, colors, isRtl, bc, verseWords = [], maxRows }: { data: InterlinearWord[]; colors: any; isRtl: boolean; bc: any; verseWords?: StrongsWordData[]; maxRows?: number }) {
  const hasBackendData = data && data.length > 0;
  const hasStrongsData = verseWords && verseWords.length > 0;

  if (!hasBackendData && !hasStrongsData) {
    return (
      <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
          {bc?.noExplanationFound || 'No interlinear data available for this verse.'}
        </Text>
      </View>
    );
  }

  // Build combined word list — prefer backend data, augment with Strong's data
  const combinedRows = hasBackendData
    ? data.map(w => ({ original: w.original, strongs: w.strongs, transliteration: w.transliteration, translation: w.translation }))
    : verseWords.map(w => ({
        original: w.surfaceText,
        strongs: w.strongsId || '',
        transliteration: w.strongs?.transliteration || '',
        translation: w.strongs?.shortDefinition || '',
      }));

  const displayed = maxRows ? combinedRows.slice(0, maxRows) : combinedRows;

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
        {displayed.map((w, i) => (
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

// ── Collapsible Section ──────────────────────────────────────────────────────

const BATCH = { translation: 3, dictionary: 2, interlinear: 10 };

function MoreButton({ remaining, batch, onPress, colors }: { remaining: number; batch: number; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 4 }}
    >
      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
        More ({Math.min(batch, remaining)})
      </Text>
      <ChevronDown size={14} color={colors.primary} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

function CollapsibleSection({
  expanded, onToggle, icon, label, color, count, colors, isRtl, children
}: {
  expanded: boolean; onToggle: () => void; icon: React.ReactNode; label: string; color: string; count?: number; colors: any; isRtl?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: SPACING.sm, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: color }}
      >
        <View style={[styles.collapsibleIcon, { backgroundColor: `${color}18` }]}>{icon}</View>
        <Text style={[styles.collapsibleLabel, { color: colors.text }]}>{label}</Text>
        {count !== undefined && <Text style={[styles.collapsibleCount, { color: colors.muted }]}>{count}</Text>}
        <ChevronDown
          size={16}
          color={colors.muted}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
          {children}
        </View>
      )}
    </View>
  );
}

const STUDY_TOOL_LABELS: Record<string, string> = {
  COMMAND: 'Command',
  PROMISE: 'Promise',
  WARNING: 'Warning',
  REPEATED_WORD: 'Repeated Word',
  TRANSITION: 'Transition',
  CONTRAST: 'Contrast',
};

function StudyToolsSection({ tools, colors, isRtl }: { tools: StudyToolResource[]; colors: any; isRtl?: boolean }) {
  if (!tools.length) return null;

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <SectionHeader
        icon={<FileText size={16} color="#8B5CF6" strokeWidth={2} />}
        label="Study Tools"
        color="#8B5CF6"
        colors={colors}
        isRtl={isRtl}
      />
      {tools.map(tool => (
        <View
          key={tool.id}
          style={[
            styles.studyToolCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: isRtl ? colors.border : '#8B5CF6',
              borderRightColor: isRtl ? '#8B5CF6' : 'transparent',
              borderRightWidth: isRtl ? 3 : 0,
            },
          ]}
        >
          <View style={[styles.studyToolTop, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.studyToolIcon, { backgroundColor: '#8B5CF618' }]}>
              <FileText size={16} color="#8B5CF6" strokeWidth={2} />
            </View>
            <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.studyToolMetaRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={styles.studyToolType}>{STUDY_TOOL_LABELS[tool.toolType] || tool.toolType}</Text>
                <Text style={[styles.studyToolRef, { color: colors.muted }]}>{tool.bookName} {tool.chapter}</Text>
              </View>
              <Text style={[styles.studyToolTitle, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {tool.label}
              </Text>
            </View>
          </View>

          {tool.description ? (
            <Text style={[styles.studyToolDescription, { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
              {tool.description}
            </Text>
          ) : null}

          {tool.verseRefs?.length ? (
            <View style={[styles.studyToolVerseBox, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}18` }]}>
              {tool.verseRefs.map((ref, i) => (
                <Text key={`${tool.id}-ref-${i}`} style={[styles.studyToolVerseText, { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                  {ref.verse}. {ref.excerpt || ''}
                </Text>
              ))}
            </View>
          ) : null}

          {tool.studyToolWords?.length ? (
            <View style={styles.studyToolWordsWrap}>
              {tool.studyToolWords.map(word => {
                const strongs = word.strongs;
                const explanation = word.adminExplanation || strongs?.adminExplanation;
                return (
                  <View key={word.id} style={[styles.studyToolWordCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={[styles.studyToolWordHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.studyToolWordSurface, { color: colors.text }]}>{word.surfaceText}</Text>
                      <Text style={styles.studyToolWordStrong}>{word.strongsId}</Text>
                      {strongs?.originalWord ? (
                        <Text style={[styles.studyToolOriginal, { color: colors.textSecondary }]}>{strongs.originalWord}</Text>
                      ) : null}
                    </View>
                    {(strongs?.transliteration || strongs?.shortDefinition) ? (
                      <Text style={[styles.studyToolWordDefinition, { color: colors.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                        {strongs?.transliteration ? `${strongs.transliteration} · ` : ''}{strongs?.shortDefinition || ''}
                      </Text>
                    ) : null}
                    {explanation ? (
                      <Text style={[styles.studyToolExplanation, { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                        {explanation}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ))}
    </View>
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

  const isInvalidParams = !rawBookName || !rawChapter || !rawVerseNumber;
  const bookName = isInvalidParams ? 'Genesis' : rawBookName;
  const chapter = isInvalidParams ? 1 : rawChapter;
  const verseNumber = isInvalidParams ? 1 : rawVerseNumber;
  const verseRef = `${bookName} ${chapter}:${verseNumber}`;

  const [data, setData] = useState<VerseResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [translationComp, setTranslationComp] = useState<TranslationComparisonEntry[] | null>(null);
  const [translationCompLoading, setTranslationCompLoading] = useState(false);
  const [translationCompError, setTranslationCompError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((name: string) => {
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);
  const [progressiveLimits, setProgressiveLimits] = useState<Record<string, number>>({});
  const progressiveLimit = useCallback((key: string, batch: number) =>
    progressiveLimits[key] ?? batch, [progressiveLimits]);
  const showMore = useCallback((key: string, batch: number) => {
    setProgressiveLimits(prev => ({ ...prev, [key]: (prev[key] ?? batch) + batch }));
  }, []);

  // Prologue
  const [prologue, setPrologue] = useState<BookPrologue | null>(null);
  const [prologueLoading, setPrologueLoading] = useState(false);
  const [expandedPrologue, setExpandedPrologue] = useState(false);

  // Strong's words for the verse
  const [verseWords, setVerseWords] = useState<StrongsWordData[]>([]);
  const [verseWordsLoading, setVerseWordsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchResources = useCallback(async () => {
    if (isInvalidParams) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPrologueLoading(true);
    setVerseWordsLoading(true);
    try {
      const response = await getVerseResources(bookName, chapter, verseNumber);

      console.log('Verse resources response:', JSON.stringify(response));

      if (response.returnCode === 200 && response.returnData) {
        setData(response.returnData);
        setUseFallback(false);
      } else {
        setData({ id: 0, bookName, chapter, verseStart: verseNumber, verseEnd: verseNumber, commentaries: FALLBACK_COMMENTARIES, crossReferences: [], wordStudies: [], dictionaryTerms: [], interlinearWords: [], relatedTopics: [], studyTools: [] });
        setUseFallback(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch verse resources:', err);
      setData({ id: 0, bookName, chapter, verseStart: verseNumber, verseEnd: verseNumber, commentaries: FALLBACK_COMMENTARIES, crossReferences: [], wordStudies: [], dictionaryTerms: [], interlinearWords: [], relatedTopics: [], studyTools: [] });
      setUseFallback(true);
    } finally {
      setLoading(false);
    }

    // Fetch book prologue (non-blocking)
    try {
      const p = await getBookPrologue(bookName);
      console.log('Book prologue response:', JSON.stringify(p));
      setPrologue(p);
    } catch {
      setPrologue(null);
    } finally {
      setPrologueLoading(false);
    }

    // Fetch Strong's words for this verse (non-blocking)
    try {
      const res = await getVerseWords(bookName, chapter, verseNumber);
      if (res.returnCode === 200 && res.returnData) {
        setVerseWords(res.returnData);
      }
    } catch {
      setVerseWords([]);
    } finally {
      setVerseWordsLoading(false);
    }

    // Fetch translation comparison (non-blocking)
    try {
      setTranslationCompLoading(true);
      const res = await getTranslationComparison(bookName, chapter, verseNumber);
      if (res.returnCode === 200 && res.returnData) {
        setTranslationComp(res.returnData);
      } else {
        setTranslationComp(null);
        setTranslationCompError(res.returnMessage || 'No translations available');
      }
    } catch (err: any) {
      setTranslationComp(null);
      setTranslationCompError(err?.returnMessage || err?.message || 'Failed to load translations');
    } finally {
      setTranslationCompLoading(false);
    }
  }, [bookName, chapter, verseNumber, isInvalidParams]);

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
  }, [data]);

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
  const hasInterlinear = (data?.interlinearWords && data.interlinearWords.length > 0) || verseWords.length > 0;
  const hasCommentaries = data?.commentaries && data.commentaries.length > 0;
  const hasCrossRefs = data?.crossReferences && data.crossReferences.length > 0;
  const hasWordStudies = data?.wordStudies && data.wordStudies.length > 0;
  const hasTopics = data?.relatedTopics && data.relatedTopics.length > 0;
  const hasStudyTools = data?.studyTools && data.studyTools.length > 0;

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
        title={bc?.resources || 'Verse Resources'}
        subtitle={verseRef}
        onPress={goBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
                    {useFallback && (
                      <View style={[styles.heroPill, { backgroundColor: 'rgba(255,193,7,0.25)', borderColor: 'rgba(255,193,7,0.5)' }]}>
                        <Text style={[styles.heroPillText, { color: '#FFC107', fontWeight: '800' }]}>Fallback</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroRef, { textAlign: isRtl ? 'right' : 'left' }]}>{verseRef}</Text>
                  {verseText ? (
                    <Text style={[styles.heroVerse, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>{toArabicIndic(isRtl, verseNumber)}. {verseText}</Text>
                  ) : null}
                </View>
              </LinearGradient>

              {/* ── Curated Study Tools ── */}
              {hasStudyTools && (
                <StudyToolsSection tools={data.studyTools || []} colors={COLORS} isRtl={isRtl} />
              )}

              {/* ── Book Context (Prologue) ── */}
              {prologue && (
                <View style={{ marginBottom: SPACING.md }}>
                  <TouchableOpacity
                    onPress={() => setExpandedPrologue(prev => !prev)}
                    activeOpacity={0.7}
                    style={[styles.actionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: '#6366f1', borderRightWidth: isRtl ? 3 : 0, borderRightColor: isRtl ? '#6366f1' : 'transparent' }]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: '#6366f118' }]}>
                      <BookOpen size={20} color="#6366f1" strokeWidth={2} />
                    </View>
                    <View style={[styles.actionTextCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.actionLabel, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>Book Context</Text>
                      <Text style={[styles.actionDesc, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
                        {prologue.keyTheme || prologue.summary || `${prologue.author ? `By ${prologue.author}` : ''} ${prologue.author && prologue.dateWritten ? '·' : ''} ${prologue.dateWritten || ''}`}
                      </Text>
                    </View>
                    {isRtl ? <ChevronLeft size={16} color={COLORS.muted} strokeWidth={2} /> : <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />}
                  </TouchableOpacity>

                  {expandedPrologue && (
                    <View style={[styles.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border, marginTop: 8 }]}>
                      <View style={{ padding: SPACING.md }}>
                        {prologue.summary && <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>{prologue.summary}</Text>}
                        {prologue.author && (
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', width: 90 }}>Author</Text>
                            <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }}>{prologue.author}</Text>
                          </View>
                        )}
                        {prologue.audience && (
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', width: 90 }}>Audience</Text>
                            <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }}>{prologue.audience}</Text>
                          </View>
                        )}
                        {prologue.dateWritten && (
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', width: 90 }}>Date Written</Text>
                            <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }}>{prologue.dateWritten}</Text>
                          </View>
                        )}
                        {prologue.purpose && (
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', width: 90 }}>Purpose</Text>
                            <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }}>{prologue.purpose}</Text>
                          </View>
                        )}
                        {prologue.mainThemes && prologue.mainThemes.length > 0 && (
                          <>
                            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 6 }}>Main Themes</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {prologue.mainThemes.map((t, i) => (
                                <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#6366f130', backgroundColor: '#6366f118' }}>
                                  <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '700' }}>{t}</Text>
                                </View>
                              ))}
                            </View>
                          </>
                        )}
                        {prologue.christConnection && (
                          <>
                            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 12 }} />
                            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>Connection to Christ</Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 }}>{prologue.christConnection}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ── Strong's Words for This Verse ── */}
              {verseWords.length > 0 && (
                <View style={{ marginBottom: SPACING.md }}>
                  <View style={[styles.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: '#f59e0b', borderRightWidth: isRtl ? 3 : 0, borderRightColor: isRtl ? '#f59e0b' : 'transparent' }]}>
                    <View style={{ padding: SPACING.md }}>
                      <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
                          <Hash size={16} color="#f59e0b" strokeWidth={2} />
                        </View>
                        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800', flex: 1 }}>Original Language Words</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700' }}>{verseWords.length}</Text>
                      </View>
                      {Object.entries(
                        verseWords.reduce((acc, w) => {
                          if (!w.strongsId) return acc;
                          if (!acc[w.strongsId]) acc[w.strongsId] = { ...w, count: 0 };
                          acc[w.strongsId].count++;
                          return acc;
                        }, {} as Record<string, StrongsWordData & { count: number }>)
                      ).map(([strongsId, w]) => (
                        <TouchableOpacity
                          key={strongsId}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{w.surfaceText}</Text>
                              {w.strongs?.transliteration && (
                                <Text style={{ color: COLORS.muted, fontSize: 11, fontStyle: 'italic' }}>{w.strongs.transliteration}</Text>
                              )}
                              <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>{strongsId}</Text>
                            </View>
                            {w.strongs?.shortDefinition && (
                              <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 2 }} numberOfLines={2}>{w.strongs.shortDefinition}</Text>
                            )}
                          </View>
                          <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700' }}>×{w.count}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* ── Translation Comparison ── */}
              <CollapsibleSection
                expanded={!!expandedSections.translation}
                onToggle={() => toggleSection('translation')}
                icon={<Languages size={18} color="#3B82F6" strokeWidth={2} />}
                label={langT?.translate || 'Translation Comparison'}
                color="#3B82F6"
                count={translationComp?.length}
                colors={COLORS}
                isRtl={isRtl}
              >
                {translationCompLoading ? (
                  <View style={{ paddingVertical: SPACING.xl }}>
                    <ActivityIndicator color={COLORS.primary} />
                  </View>
                ) : translationCompError ? (
                  <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
                    <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>{translationCompError}</Text>
                  </View>
                ) : (
                  <>
                    <TranslationView
                      data={(translationComp || []).slice(0, progressiveLimit('translation', BATCH.translation))}
                      colors={COLORS}
                      isRtl={isRtl}
                      bc={bc}
                    />
                    {(translationComp?.length || 0) > progressiveLimit('translation', BATCH.translation) && (
                      <MoreButton
                        remaining={(translationComp?.length || 0) - progressiveLimit('translation', BATCH.translation)}
                        batch={BATCH.translation}
                        onPress={() => showMore('translation', BATCH.translation)}
                        colors={COLORS}
                      />
                    )}
                  </>
                )}
              </CollapsibleSection>

              {/* ── Bible Dictionary ── */}
              {hasDictionary && (
                <CollapsibleSection
                  expanded={!!expandedSections.dictionary}
                  onToggle={() => toggleSection('dictionary')}
                  icon={<Book size={18} color="#10B981" strokeWidth={2} />}
                  label={bc?.resources || 'Bible Dictionary'}
                  color="#10B981"
                  count={data.dictionaryTerms?.length}
                  colors={COLORS}
                  isRtl={isRtl}
                >
                  <>
                    <DictionaryView
                      data={(data.dictionaryTerms || []).slice(0, progressiveLimit('dictionary', BATCH.dictionary))}
                      colors={COLORS}
                      isRtl={isRtl}
                      bc={bc}
                    />
                    {(data.dictionaryTerms?.length || 0) > progressiveLimit('dictionary', BATCH.dictionary) && (
                      <MoreButton
                        remaining={(data.dictionaryTerms?.length || 0) - progressiveLimit('dictionary', BATCH.dictionary)}
                        batch={BATCH.dictionary}
                        onPress={() => showMore('dictionary', BATCH.dictionary)}
                        colors={COLORS}
                      />
                    )}
                  </>
                </CollapsibleSection>
              )}

              {/* ── Interlinear ── */}
              {hasInterlinear && (() => {
                const intLimit = progressiveLimit('interlinear', BATCH.interlinear);
                const intTotal = Math.max(data?.interlinearWords?.length || 0, verseWords.length);
                return (
                  <CollapsibleSection
                    expanded={!!expandedSections.interlinear}
                    onToggle={() => toggleSection('interlinear')}
                    icon={<FileText size={18} color="#F59E0B" strokeWidth={2} />}
                    label={bc?.strongsConcordance || 'Interlinear'}
                    color="#F59E0B"
                    count={intTotal}
                    colors={COLORS}
                    isRtl={isRtl}
                  >
                    <>
                      <InterlinearView
                        data={data?.interlinearWords || []}
                        colors={COLORS}
                        isRtl={isRtl}
                        bc={bc}
                        verseWords={verseWords}
                        maxRows={intLimit}
                      />
                      {intTotal > intLimit && (
                        <MoreButton
                          remaining={intTotal - intLimit}
                          batch={BATCH.interlinear}
                          onPress={() => showMore('interlinear', BATCH.interlinear)}
                          colors={COLORS}
                        />
                      )}
                    </>
                  </CollapsibleSection>
                );
              })()}

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
              {!hasStudyTools && !hasCommentaries && !hasCrossRefs && !hasWordStudies && !hasTopics && (
                <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
                  <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.sm, textAlign: 'center' }}>
                    {bc?.noExplanationFound || 'No detailed resources available for this verse yet.'}
                  </Text>
                </View>
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

  // ── Collapsible Section ──
  collapsibleIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  collapsibleLabel: { flex: 1, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  collapsibleCount: { fontSize: FONT_SIZES.xs, fontWeight: '700' },

  // ── Section Header ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', letterSpacing: 0.3 },

  // ── Card ──
  card: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.sm, overflow: 'hidden' },

  // ── Study Tools ──
  studyToolCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  studyToolTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studyToolIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  studyToolMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  studyToolType: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    backgroundColor: '#8B5CF618',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  studyToolRef: { fontSize: 10, fontWeight: '700' },
  studyToolTitle: { fontSize: FONT_SIZES.md, fontWeight: '900', lineHeight: 21 },
  studyToolDescription: { fontSize: FONT_SIZES.sm, lineHeight: 20, marginTop: 10 },
  studyToolVerseBox: { borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 10 },
  studyToolVerseText: { fontSize: FONT_SIZES.xs, lineHeight: 18, fontStyle: 'italic' },
  studyToolWordsWrap: { gap: 8, marginTop: 10 },
  studyToolWordCard: { borderRadius: 12, borderWidth: 1, padding: 10 },
  studyToolWordHeader: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  studyToolWordSurface: { fontSize: FONT_SIZES.sm, fontWeight: '900' },
  studyToolWordStrong: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  studyToolOriginal: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  studyToolWordDefinition: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  studyToolExplanation: { fontSize: FONT_SIZES.xs, lineHeight: 18, marginTop: 7 },

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
