/**
 * PlanBibleScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only Bible screen for the Reading Plan daily assignment.
 *
 * Header   → Compact single-row gradient header (status-bar-aware)
 * Bottom   → ReflectionPanel (collapsible amber dock)
 *            • Closes on any touch/scroll outside via PanResponder
 *            • Verse references in questions are tappable →
 *              navigates to FullVerseExplanation with { bookName, chapter, verseNumber }
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  LayoutAnimation,
  UIManager,
  StatusBar,
  PanResponder,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  ExternalLink,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { route as appRoute } from '../../component/navigations/routes';

import ActionModal, { ModalSeverity } from '../../reusable/ActionModal';
import { useBible } from '../bible/hooks/useBible';
import { createBibleStyles } from '../bible/bibleStyle';
import { ChapterNavigation, VerseList } from '../bible/components';
import { BookSelectorModal, ChapterSelectorModal } from '../bible/modals';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// ─────────────────────────────────────────────────────────────────────────────
// Verse reference parser
// ─────────────────────────────────────────────────────────────────────────────
// Matches patterns like:  John 3:16   Romans 5:8   1 Corinthians 13:4
// Returns segments: plain text or { ref, bookName, chapter, verseNumber }

interface VerseRef {
  ref: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
}

type Segment = string | VerseRef;

// Regex: optional leading digit + book name + space + chapter:verse
const VERSE_REGEX =
  /\b((?:\d\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+):(\d+)\b/g;

function parseVerseRefs(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  VERSE_REGEX.lastIndex = 0; // reset stateful regex

  while ((match = VERSE_REGEX.exec(text)) !== null) {
    const [full, bookName, chapterStr, verseStr] = match;
    const start = match.index;

    // Plain text before this match
    if (start > lastIndex) {
      segments.push(text.slice(lastIndex, start));
    }

    segments.push({
      ref: full,
      bookName: bookName.trim(),
      chapter: parseInt(chapterStr, 10),
      verseNumber: parseInt(verseStr, 10),
    });

    lastIndex = start + full.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlanBibleParams {
  bookName?: string;
  chapter?: number;
  reflectionQuestions?: string[];
  dayTitle?: string;
  planTitle?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function PlanBibleScreen() {
  const params = useRoute<any>().params as PlanBibleParams;
  const navigation = useNavigation<any>();
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;

  const reflections: string[] = params?.reflectionQuestions ?? [];
  const hasReflections = reflections.length > 0;

  // ── Reflection panel state at screen level ────────────────────────────────
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const reflectionOpenRef = useRef(false);

  const closeReflection = useCallback(() => {
    if (!reflectionOpenRef.current) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reflectionOpenRef.current = false;
    setReflectionOpen(false);
  }, []);

  const toggleReflection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !reflectionOpenRef.current;
    reflectionOpenRef.current = next;
    setReflectionOpen(next);
  };

  // ── PanResponder: any touch/scroll in the verse area closes the panel ─────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        if (reflectionOpenRef.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          reflectionOpenRef.current = false;
          setReflectionOpen(false);
        }
        return false; // never steal the touch — FlatList scrolls normally
      },
      onMoveShouldSetPanResponderCapture: () => {
        if (reflectionOpenRef.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          reflectionOpenRef.current = false;
          setReflectionOpen(false);
        }
        return false;
      },
    }),
  ).current;

  const {
    isDark,
    books,
    maxChapters,
    versesArray,
    activeVersion,
    currentBook,
    currentChapter,
    fontSize,
    loading,
    highlights,
    favorites,
    highlightedVerse,
    activeAudioVerse,
    activeVerseWordMap,
    highlightAnim,
    fadeAnim,
    flatListRef,
    showAudioPlayer,
    showBookSelector,
    setShowBookSelector,
    showChapterSelector,
    setShowChapterSelector,
    bookHeadings,
    goToChapter,
    selectChapterFromModal,
    selectBookFromModal,
    startReadingChapter,
    handleAudioStop,
    modal,
    dismissModal,
    refreshing,
    onRefresh,
  } = useBible();

  const COLORS = getColors(isDark);
  const bibleStyles = useMemo(() => createBibleStyles(isDark), [isDark]);

  const contextSubtitle = [params?.planTitle, params?.dayTitle]
    .filter(Boolean)
    .join('  ·  ');

  useFocusEffect(
    useCallback(() => {
      return () => handleAudioStop();
    }, []),
  );

  // Navigate to FullVerseExplanation when a verse link is tapped
  const handleVerseRefPress = useCallback(
    (ref: VerseRef) => {
      navigation.navigate(appRoute.fullVerseExplanation, {
        bookName: ref.bookName,
        chapter: ref.chapter,
        verseNumber: ref.verseNumber,
      });
    },
    [navigation],
  );

  // Reflection subtitle text
  const reflectionSubtitle = useMemo(() => {
    if (reflections.length === 1) {
      return bc?.planBibleSingleQuestionForReading || '1 question for this reading';
    }
    return (bc?.planBibleQuestionsForReading || '{count} questions for this reading')
      .replace('{count}', String(reflections.length));
  }, [reflections.length, bc]);

  return (
    <View
      style={[bibleStyles.container, { backgroundColor: COLORS.background }]}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <CompactHeader
        book={currentBook}
        chapter={currentChapter}
        versionAbbr={activeVersion?.abbreviation ?? ''}
        subtitle={contextSubtitle}
        COLORS={COLORS}
        onBack={() => navigation.goBack()}
        isRtl={isRtl}
      />

      {/* ── Chapter navigation ───────────────────────────────────────────── */}
      <ChapterNavigation
        currentChapter={currentChapter}
        maxChapters={maxChapters}
        isDark={isDark}
        isAudioPlaying={showAudioPlayer}
        onPrev={() => {
          closeReflection();
          goToChapter('prev');
        }}
        onNext={() => {
          closeReflection();
          goToChapter('next');
        }}
        onSelectChapter={() => {
          closeReflection();
          setShowChapterSelector(true);
        }}
        onAudioChapter={() => {
          closeReflection();
          if (showAudioPlayer) handleAudioStop();
          else startReadingChapter();
        }}
      />

      {/* ── Verse area — PanResponder closes the panel on any touch ─────── */}
      <View style={{ flex: 1,marginBottom: -80  }} {...panResponder.panHandlers}>
        <VerseList
          versesArray={versesArray}
          selectedVerses={[]}
          highlights={highlights}
          favorites={favorites}
          highlightedVerse={highlightedVerse}
          activeAudioVerse={activeAudioVerse}
          activeVerseWordMap={activeVerseWordMap}
          highlightAnim={highlightAnim}
          fadeAnim={fadeAnim}
          fontSize={fontSize}
          currentBook={currentBook}
          currentChapter={currentChapter}
          colors={COLORS}
          styles={bibleStyles}
          flatListRef={flatListRef as React.RefObject<any>}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onVersePress={() => {}}
          onRemoveHighlight={() => {}}
        />
      </View>

      {/* ── Reflection panel ─────────────────────────────────────────────── */}
      {hasReflections && (
        <ReflectionPanel
          questions={reflections}
          expanded={reflectionOpen}
          onToggle={toggleReflection}
          onVerseRefPress={handleVerseRefPress}
          isDark={isDark}
          COLORS={COLORS}
          isRtl={isRtl}
          bc={bc}
          subtitle={reflectionSubtitle}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <BookSelectorModal
        visible={showBookSelector}
        onClose={() => setShowBookSelector(false)}
        books={books}
        currentBook={currentBook}
        isDark={isDark}
        onSelectBook={book => selectBookFromModal(book)}
      />
      <ChapterSelectorModal
        visible={showChapterSelector}
        onClose={() => setShowChapterSelector(false)}
        maxChapters={maxChapters}
        currentChapter={currentChapter}
        isDark={isDark}
        onSelectChapter={ch => selectChapterFromModal(ch)}
        bookHeadings={bookHeadings}
      />
      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity as ModalSeverity}
        onConfirm={dismissModal}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompactHeader
// ─────────────────────────────────────────────────────────────────────────────

interface CompactHeaderProps {
  book: string;
  chapter: number;
  versionAbbr: string;
  subtitle?: string;
  COLORS: ReturnType<typeof getColors>;
  onBack: () => void;
  isRtl: boolean;
}

function CompactHeader({
  book,
  chapter,
  versionAbbr,
  subtitle,
  COLORS,
  onBack,
  isRtl,
}: CompactHeaderProps) {
  const s = useMemo(() => createHeaderStyles(isRtl), [isRtl]);

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />
      <View style={s.shadowWrap}>
        <LinearGradient
          colors={COLORS.headgradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.gradient}
        >
          <View style={{ height: STATUS_BAR_HEIGHT }} />

          <View style={s.row}>
            <TouchableOpacity
              onPress={onBack}
              style={s.backCircle}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isRtl ? (
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>

            <View style={s.titleBlock}>
              <BookOpen
                size={14}
                color="rgba(255,255,255,0.7)"
                strokeWidth={2}
              />
              <Text style={s.titleText} numberOfLines={1}>
                {book} {chapter}
              </Text>
            </View>

            <View style={s.versionPill}>
              <Text style={s.versionText}>{versionAbbr}</Text>
            </View>
          </View>

          {!!subtitle && (
            <View style={s.subtitleRow}>
              <Text style={s.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          )}

          <View style={s.shimmer} />
        </LinearGradient>
      </View>
    </>
  );
}

const createHeaderStyles = (isRtl: boolean) =>
  StyleSheet.create({
    shadowWrap: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 10,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      backgroundColor: 'transparent',
      marginBottom: 25,
    },
    gradient: {
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      overflow: 'hidden',
      paddingBottom: SPACING.sm,
    },
    row: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.xs,
      paddingBottom: SPACING.xs,
      gap: SPACING.sm,
    },
    backCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBlock: {
      flex: 1,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
    },
    titleText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    versionPill: {
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
      borderColor: 'rgba(240,180,41,0.5)',
      backgroundColor: 'rgba(240,180,41,0.12)',
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: 3,
    },
    versionText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      color: '#F0B429',
      letterSpacing: 0.5,
    },
    subtitleRow: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xs + 1,
    },
    subtitleText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: 0.2,
      textAlign: isRtl ? 'right' : 'left',
    },
    shimmer: {
      position: 'absolute',
      bottom: 0,
      left: '10%',
      right: '10%',
      height: 1,
      backgroundColor: 'rgba(240,180,41,0.15)',
      borderRadius: 1,
    },
  });

// ─────────────────────────────────────────────────────────────────────────────
// VerseRefText
// ─────────────────────────────────────────────────────────────────────────────
// Renders a question string with detected verse refs as tappable amber links.
// e.g. "John 3:16 is one of the most famous..." →
//      [tappable: "John 3:16"] " is one of the most famous..."

interface VerseRefTextProps {
  text: string;
  onPress: (ref: VerseRef) => void;
  COLORS: ReturnType<typeof getColors>;
  isDark: boolean;
  isRtl: boolean;
}

function VerseRefText({ text, onPress, COLORS, isDark, isRtl }: VerseRefTextProps) {
  const segments = useMemo(() => parseVerseRefs(text), [text]);
  const s = useMemo(() => createVRStyles(isRtl), [isRtl]);

  return (
    <View style={s.container}>
      {segments.map((seg, idx) => {
        if (typeof seg === 'string') {
          return (
            <Text key={idx} style={[s.base, { color: COLORS.text }]}>
              {seg}
            </Text>
          );
        }

        // Real button chip for the verse reference
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => onPress(seg)}
            activeOpacity={0.7}
            style={[
              s.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(240,180,41,0.15)'
                  : 'rgba(155,106,0,0.10)',
                borderColor: isDark
                  ? 'rgba(240,180,41,0.45)'
                  : 'rgba(155,106,0,0.35)',
              },
            ]}
          >
            <BookOpen
              size={11}
              color={isDark ? '#F0B429' : '#9B6A00'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                s.chipText,
                { color: isDark ? '#F0B429' : '#9B6A00' },
              ]}
            >
              {seg.ref}
            </Text>
            <ExternalLink
              size={10}
              color={isDark ? '#F0B429' : '#9B6A00'}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createVRStyles = (isRtl: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 4,
    },
    base: {
      fontSize: FONT_SIZES.md,
      lineHeight: 24,
    },
    chip: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.round,
      paddingHorizontal: SPACING.sm + 1,
      paddingVertical: 4,
      // Subtle lift
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    chipText: {
      fontSize: FONT_SIZES.xs + 1,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });

// ─────────────────────────────────────────────────────────────────────────────
// ReflectionPanel — fully controlled from parent
// ─────────────────────────────────────────────────────────────────────────────

interface ReflectionPanelProps {
  questions: string[];
  expanded: boolean;
  onToggle: () => void;
  onVerseRefPress: (ref: VerseRef) => void;
  isDark: boolean;
  COLORS: ReturnType<typeof getColors>;
  isRtl: boolean;
  bc: ReturnType<typeof useLanguage>['translations']['bible'];
  subtitle: string;
}

function ReflectionPanel({
  questions,
  expanded,
  onToggle,
  onVerseRefPress,
  isDark,
  COLORS,
  isRtl,
  bc,
  subtitle,
}: ReflectionPanelProps) {
  const s = useMemo(
    () => createReflectionStyles(isDark, COLORS, isRtl),
    [isDark, COLORS, isRtl],
  );

  return (
    <View style={s.wrapper}>
      <View style={s.accentBar} />

      {/* Toggle header */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        <View style={s.headerLeft}>
          <View style={s.iconCircle}>
            <Lightbulb size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {bc?.planBiblePauseReflect || 'Pause & Reflect'}
            </Text>
            <Text style={[s.headerSub, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={[s.chevronBtn, { backgroundColor: COLORS.surface }]}>
          {expanded ? (
            <ChevronDown size={16} color={COLORS.muted} />
          ) : (
            <ChevronUp size={16} color={COLORS.muted} />
          )}
        </View>
      </TouchableOpacity>

      {/* Question cards */}
      {expanded && (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {questions.map((q, idx) => (
            <View
              key={idx}
              style={[
                s.card,
                {
                  backgroundColor: isDark ? '#1A2332' : '#FFFBF0',
                  borderColor: isDark ? '#3D3416' : '#FDE7B0',
                },
              ]}
            >
              {/* Number badge + bulb */}
              <View style={s.cardTopRow}>
                <View style={s.numBadge}>
                  <Text style={s.numText}>{idx + 1}</Text>
                </View>
                <Lightbulb size={13} color="#F59E0B" opacity={0.55} />
              </View>

              {/* Question with tappable verse references */}
              <VerseRefText
                text={q}
                onPress={onVerseRefPress}
                COLORS={COLORS}
                isDark={isDark}
                isRtl={isRtl}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createReflectionStyles = (
  isDark: boolean,
  COLORS: ReturnType<typeof getColors>,
  isRtl: boolean,
) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.cardBackground,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      maxHeight: 400,
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderTopRightRadius: BORDER_RADIUS.lg,
    },
    accentBar: {
      height: 3,
      backgroundColor: '#F59E0B',
      opacity: 0.8,
      borderRadius: BORDER_RADIUS.round,
      marginHorizontal: SPACING.lg,
      marginTop: -1,
    },
    headerRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    headerLeft: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      flex: 1,
      gap: SPACING.sm,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: isDark ? '#2B2512' : '#FFF9ED',
      borderWidth: 1,
      borderColor: isDark ? '#5C4A0A' : '#FDE7B0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isRtl ? 0 : SPACING.xs,
      marginLeft: isRtl ? SPACING.xs : 0,
    },
    headerTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    headerSub: {
      fontSize: FONT_SIZES.xs,
      marginTop: 1,
    },
    chevronBtn: {
      width: 30,
      height: 30,
      borderRadius: BORDER_RADIUS.round,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: Platform.OS === 'ios' ? 26 : 18,
      gap: SPACING.sm,
    },
    card: {
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
    },
    cardTopRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    numBadge: {
      width: 24,
      height: 24,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
    },
    numText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
