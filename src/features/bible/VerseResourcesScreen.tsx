/**
 * VerseResourcesScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen verse resource viewer — redesigned with a clean, modern aesthetic.
 *
 * Components have been refactored into separate files under
 * components/verseResources/ for maintainability.
 *
 * Features: Commentaries, Cross-References, Word Studies, Translation
 * Comparison, Bible Dictionary, Interlinear, Related Topics, Study Tools,
 * Book Prologue, All Books Prologue Library.
 *
 * Supports all 22 languages and RTL layouts (Arabic / Urdu).
 * Tab-based navigation between resource types.
 */

import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import ActionHeader from '../../reusable/ActionHeader';
import {
  useLanguage,
  isRtlLanguage,
  toArabicIndic,
} from '../../component/language-translation/LanguageProvider';
import { route } from '../../component/navigations/routes';
import {
  getVerseResources,
  getTranslationComparison,
  VerseResourceData,
  TranslationComparisonEntry,
} from '../../services/verseResourcesApi';
import {
  getBookPrologue,
  getBookProloguesPage,
  BookPrologue,
} from '../../services/bookProloguesApi';
import { getVerseWords, StrongsWordData } from '../../services/strongsService';

import {
  FALLBACK_COMMENTARIES,
  BOOK_PROLOGUE_PAGE_SIZE,
  RESOURCE_TABS,
  CommentariesView,
  CrossReferencesView,
  WordStudiesView,
  DictionaryView,
  TranslationComparisonView,
  InterlinearView,
  TopicsView,
  StudyToolsSection,
  BookPrologueSection,
  AllBooksPrologueSection,
  ResourceTabBar,
  ResourceStatsRow,
  LoadingSkeleton,
} from './components/verseResources';

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

  // ── State ────────────────────────────────────────────────────────────────

  const [data, setData] = useState<VerseResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const [translationComp, setTranslationComp] = useState<TranslationComparisonEntry[] | null>(null);
  const [translationCompLoading, setTranslationCompLoading] = useState(false);
  const [translationCompError, setTranslationCompError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('commentaries');

  const [prologue, setPrologue] = useState<BookPrologue | null>(null);
  const [, setPrologueLoading] = useState(false);

  const [verseWords, setVerseWords] = useState<StrongsWordData[]>([]);
  const [, setVerseWordsLoading] = useState(false);

  const [allPrologues, setAllPrologues] = useState<BookPrologue[]>([]);
  const [allProloguesLoading, setAllProloguesLoading] = useState(false);
  const [allProloguesLoadingMore, setAllProloguesLoadingMore] = useState(false);
  const [allProloguesPage, setAllProloguesPage] = useState(0);
  const [allProloguesHasNext, setAllProloguesHasNext] = useState(false);
  const [allProloguesTotal, setAllProloguesTotal] = useState(0);
  const allProloguesLoadingRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrologueLoading(true);
    setVerseWordsLoading(true);
    try {
      const response = await getVerseResources(bookName, chapter, verseNumber);
      if (response.returnCode === 200 && response.returnData) {
        setData(response.returnData);
        setUseFallback(false);
      } else {
        setData({
          id: 0,
          bookName,
          chapter,
          verseStart: verseNumber,
          verseEnd: verseNumber,
          commentaries: FALLBACK_COMMENTARIES,
          crossReferences: [],
          wordStudies: [],
          dictionaryTerms: [],
          interlinearWords: [],
          relatedTopics: [],
          studyTools: [],
        });
        setUseFallback(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch verse resources:', err);
      setData({
        id: 0,
        bookName,
        chapter,
        verseStart: verseNumber,
        verseEnd: verseNumber,
        commentaries: FALLBACK_COMMENTARIES,
        crossReferences: [],
        wordStudies: [],
        dictionaryTerms: [],
        interlinearWords: [],
        relatedTopics: [],
        studyTools: [],
      });
      setUseFallback(true);
    } finally {
      setLoading(false);
    }

    try {
      const p = await getBookPrologue(bookName);
      setPrologue(p);
    } catch {
      setPrologue(null);
    } finally {
      setPrologueLoading(false);
    }

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

    fetchBookProloguesPage(0, true);

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
      setTranslationCompError(
        err?.returnMessage || err?.message || 'Failed to load translations',
      );
    } finally {
      setTranslationCompLoading(false);
    }
  }, [bookName, chapter, verseNumber]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [data, fadeAnim, slideAnim]);

  // ── Pagination callbacks ──────────────────────────────────────────────────

  const fetchBookProloguesPage = useCallback(async (page: number, replace = false) => {
    if (allProloguesLoadingRef.current && !replace) return;
    allProloguesLoadingRef.current = true;
    if (replace) setAllProloguesLoading(true);
    else setAllProloguesLoadingMore(true);

    try {
      const result = await getBookProloguesPage({
        page,
        pageSize: BOOK_PROLOGUE_PAGE_SIZE,
      });
      setAllPrologues((prev) => {
        if (replace) return result.data;
        const existing = new Set(prev.map((item) => item.bookName));
        return [...prev, ...result.data.filter((item) => !existing.has(item.bookName))];
      });
      setAllProloguesPage(page);
      setAllProloguesHasNext(result.hasNext);
      setAllProloguesTotal(result.total);
    } catch {
      if (replace) {
        setAllPrologues([]);
        setAllProloguesPage(0);
        setAllProloguesHasNext(false);
        setAllProloguesTotal(0);
      }
    } finally {
      allProloguesLoadingRef.current = false;
      setAllProloguesLoading(false);
      setAllProloguesLoadingMore(false);
    }
  }, []);

  const loadMoreBookPrologues = useCallback(() => {
    if (!allProloguesHasNext || allProloguesLoadingRef.current) return;
    fetchBookProloguesPage(allProloguesPage + 1);
  }, [allProloguesHasNext, allProloguesPage, fetchBookProloguesPage]);

  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom < 360) loadMoreBookPrologues();
    },
    [loadMoreBookPrologues],
  );

  const navigateToCrossRef = useCallback(
    (refStr: string) => {
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
    },
    [nav],
  );

  // ── Tab logic ─────────────────────────────────────────────────────────────

  const visibleTabs = useMemo(() => {
    const tabs: string[] = [];
    if (data?.commentaries?.length) tabs.push('commentaries');
    if (data?.crossReferences?.length) tabs.push('crossrefs');
    if (data?.wordStudies?.length) tabs.push('wordStudies');
    if (data?.dictionaryTerms?.length) tabs.push('dictionary');
    if (translationComp?.length) tabs.push('translations');
    if (data?.interlinearWords?.length || verseWords.length) tabs.push('interlinear');
    if (data?.relatedTopics?.length) tabs.push('topics');
    return tabs.length > 0 ? tabs : ['commentaries'];
  }, [data, translationComp, verseWords]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeTab]);

  const renderActiveContent = () => {
    if (!data) return null;

    switch (activeTab) {
      case 'commentaries':
        return <CommentariesView data={data.commentaries || []} colors={COLORS} isRtl={isRtl} bc={bc} />;
      case 'crossrefs':
        return <CrossReferencesView data={data.crossReferences || []} colors={COLORS} isRtl={isRtl} onNavigate={navigateToCrossRef} />;
      case 'wordStudies':
        return <WordStudiesView data={data.wordStudies || []} colors={COLORS} isRtl={isRtl} />;
      case 'dictionary':
        return <DictionaryView data={data.dictionaryTerms || []} colors={COLORS} isRtl={isRtl} bc={bc} />;
      case 'translations':
        return <TranslationComparisonView data={translationComp} loading={translationCompLoading} error={translationCompError} colors={COLORS} isRtl={isRtl} bc={bc} />;
      case 'interlinear':
        return <InterlinearView data={data.interlinearWords || []} colors={COLORS} isRtl={isRtl} bc={bc} verseWords={verseWords} />;
      case 'topics':
        return <TopicsView data={data.relatedTopics || []} colors={COLORS} />;
      default:
        return null;
    }
  };

  // ── Shared hero card (used in error/empty/data states) ────────────────────

  const renderHeroCard = () => (
    <View
      style={[
        heroStyles.card,
        { backgroundColor: COLORS.surface, borderColor: COLORS.border, shadowColor: COLORS.shadowColor },
      ]}
    >
      <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md }}>
        <View style={[heroStyles.pill, { backgroundColor: `${COLORS.primary}12`, borderColor: `${COLORS.primary}24` }]}>
          <Text style={[heroStyles.pillText, { color: COLORS.primary }]}>
            {bookName} {chapter}
          </Text>
        </View>
        <View style={[heroStyles.pill, { backgroundColor: `${COLORS.accent}14`, borderColor: `${COLORS.accent}28` }]}>
          <Text style={[heroStyles.pillText, { color: COLORS.accent }]}>
            {bc?.verseLabel || 'Verse'} {toArabicIndic(isRtl, verseNumber)}
          </Text>
        </View>
        {useFallback && (
          <View style={[heroStyles.pill, { backgroundColor: 'rgba(255,193,7,0.15)', borderColor: 'rgba(255,193,7,0.3)' }]}>
            <Text style={[heroStyles.pillText, { color: '#F59E0B', fontWeight: '800' }]}>Demo</Text>
          </View>
        )}
      </View>
      <Text style={[heroStyles.ref, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
        {verseRef}
      </Text>
      {verseText ? (
        <Text
          style={[heroStyles.verse, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}
          numberOfLines={3}
        >
          {toArabicIndic(isRtl, verseNumber)}. {verseText}
        </Text>
      ) : null}
    </View>
  );

  const renderRetryButton = () => (
    <TouchableOpacity
      onPress={() => fetchResources()}
      style={[
        heroStyles.retryBtn,
        {
          backgroundColor: `${COLORS.primary}0A`,
          borderColor: COLORS.border,
          flexDirection: isRtl ? 'row-reverse' : 'row',
          marginTop: SPACING.lg,
        },
      ]}
      activeOpacity={0.7}
    >
      <RefreshCw size={14} color={COLORS.primary} strokeWidth={2} />
      <Text style={[heroStyles.retryText, { color: COLORS.primary }]}>
        {bc?.tryAgain || 'Try Again'}
      </Text>
    </TouchableOpacity>
  );

  // ── Render loading state ──

  if (loading) {
    return (
      <View style={[sty.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader title={bc?.resources || 'Verse Resources'} subtitle={verseRef} onPress={goBack} />
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          <LoadingSkeleton colors={COLORS} isRtl={isRtl} />
        </ScrollView>
      </View>
    );
  }

  // ── Render error / empty state ──

  if (!data || (error && !data)) {
    return (
      <View style={[sty.container, { backgroundColor: COLORS.background }]}>
        <ActionHeader title={bc?.resources || 'Verse Resources'} subtitle={verseRef} onPress={goBack} />
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {renderHeroCard()}
          <View style={{ alignItems: 'center', paddingVertical: SPACING.xxl }}>
            <AlertCircle size={36} color={COLORS.muted} strokeWidth={1.5} />
            <Text
              style={{
                color: COLORS.muted,
                fontSize: FONT_SIZES.sm,
                marginTop: SPACING.md,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {error || bc?.noExplanationFound || 'No resources available for this verse yet.'}
            </Text>
            {renderRetryButton()}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Render main content ──

  return (
    <View style={[sty.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader title={bc?.resources || 'Verse Resources'} subtitle={verseRef} onPress={goBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Hero Verse Card */}
          {/* {renderHeroCard()} */}

          {/* Resource Stats */}
          {/* <ResourceStatsRow data={data} verseWords={verseWords} colors={COLORS} /> */}

          {/* Resource Tab Bar */}
          <ResourceTabBar
            tabs={RESOURCE_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            visibleTabs={visibleTabs}
            colors={COLORS}
            isRtl={isRtl}
          />

          {/* Active Tab Content */}
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {renderActiveContent()}
          </View>

          {/* Divider before extra sections */}
          {(data.studyTools?.length || prologue) && (
            <View style={{ marginHorizontal: SPACING.lg, marginVertical: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border }} />
          )}

          {/* Study Tools */}
          {data.studyTools?.length ? (
            <View style={{ paddingHorizontal: SPACING.lg }}>
              <StudyToolsSection tools={data.studyTools} colors={COLORS} isRtl={isRtl} />
            </View>
          ) : null}

          {/* Book Prologue */}
          {prologue ? (
            <View style={{ paddingHorizontal: SPACING.lg }}>
              <BookPrologueSection prologue={prologue} bookName={bookName} colors={COLORS} isRtl={isRtl} />
            </View>
          ) : null}

          {/* All Books Prologue Library */}
          {allPrologues.length > 0 || allProloguesLoading ? (
            <AllBooksPrologueSection
              prologues={allPrologues}
              loading={allProloguesLoading}
              loadingMore={allProloguesLoadingMore}
              hasNext={allProloguesHasNext}
              total={allProloguesTotal}
              onLoadMore={loadMoreBookPrologues}
              colors={COLORS}
              isRtl={isRtl}
            />
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles (only what's needed by the main component) ─────────────────────

const sty = StyleSheet.create({
  container: { flex: 1 },
});

const heroStyles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  pillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ref: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  verse: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
