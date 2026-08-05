import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookOpen,
  Sprout,
  User,
  MapPin,
} from 'lucide-react-native';
import RichText from '../../../reusable/RichText';
import { getAiExplanation, AiExplanation } from '../../../services/aiApi';
import { getBookPrologue, BookPrologue } from '../../../services/bookProloguesApi';
import {
  strongsDictionaryApi,
  VerseUniqueWord,
} from '../services/strongsDictionaryApi';
import VerseWordCard from './VerseWordCard';
import WordStudyBottomSheet from '../../bible/components/WordStudyBottomSheet';
import { getStrongsEntry, StrongsEntry } from '../../../services/strongsService';
import { showToast } from '../../../helpers/Toash.helper';
import { saveFavoriteWord } from '../services/strongsFavorites';
import { TOOLS, StudyToolKey } from './StudyToolsList';

interface Props {
  tool: StudyToolKey;
  bookName: string;
  chapter: number;
  verse: number;
  translationId: string;
  isDark: boolean;
  colors: any;
}

/**
 * StudyToolPanel — the inline content shown when one of the four VERSE STUDY
 * TOOLS rows is expanded. Fetches the tool's data for the selected verse and
 * renders it with well-styled section headers beneath the row.
 */
export default function StudyToolPanel({
  tool,
  bookName,
  chapter,
  verse,
  translationId,
  isDark,
  colors,
}: Props) {
  const meta = TOOLS.find(t => t.key === tool)!;

  const [ai, setAi] = useState<AiExplanation | null>(null);
  const [prologue, setPrologue] = useState<BookPrologue | null>(null);
  const [words, setWords] = useState<VerseUniqueWord[]>([]);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Strong's detail sheet
  const [detailEntry, setDetailEntry] = useState<StrongsEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setAi(null);
    setPrologue(null);
    setWords([]);
    setExpandedWord(null);

    (async () => {
      try {
        if (tool === 'strongs') {
          const res = await strongsDictionaryApi.getVerseUniqueWords(
            bookName,
            chapter,
            verse,
            translationId,
          );
          if (mounted) setWords(res.data || []);
        } else {
          const [aiRes, prologueRes] = await Promise.all([
            getAiExplanation(bookName, chapter, verse, 'detailed'),
            tool === 'background'
              ? getBookPrologue(bookName).catch(() => null)
              : Promise.resolve(null),
          ]);
          if (mounted) {
            setAi(aiRes);
            if (tool === 'background') setPrologue(prologueRes);
          }
        }
      } catch {
        // Leave state empty — panels render "no data" gracefully
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tool, bookName, chapter, verse, translationId]);

  const openDetail = useCallback(async (strongs: any) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailEntry(null);
    try {
      const res = await getStrongsEntry(strongs.strongsId);
      if (res.returnCode === 200 && res.returnData) {
        setDetailEntry(res.returnData);
      }
    } catch {
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSaveWord = useCallback(async (entry: StrongsEntry) => {
    try {
      const saved = await saveFavoriteWord({
        strongsId: entry.strongsId,
        originalWord: entry.originalWord,
        transliteration: entry.transliteration,
        shortDefinition: entry.shortDefinition || '',
        fullDefinition: entry.fullDefinition,
        language: entry.language,
        partOfSpeech: entry.partOfSpeech,
        grammaticalCase: entry.grammaticalCase,
        gender: entry.gender,
        number: entry.number,
        usageCount: entry.usageCount,
        crossReferences: entry.crossReferences,
        adminExplanation: null,
      });
      showToast(
        saved ? 'success' : 'info',
        saved ? 'Word saved to favorites' : 'Already in favorites',
      );
    } catch {}
  }, []);

  const sectionHeader = (Icon: React.ElementType, label: string, color: string) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}16` }]}>
        <Icon size={13} color={color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

  // Whether any content rendered for the non-Strong's tools (used for the
  // graceful empty state instead of a blank panel body).
  const hasAnyContent =
    tool === 'background'
      ? !!(
          ai?.context?.trim() ||
          prologue?.author?.trim() ||
          prologue?.summary?.trim() ||
          prologue?.purpose?.trim()
        )
      : !!(
          ai?.intro?.trim() ||
          ai?.explanation?.trim() ||
          ai?.application?.trim() ||
          ai?.prayer?.trim()
        );

  return (
    <View style={[styles.panel, { backgroundColor: colors.background }]}>
      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.muted }]}>
            Loading…
          </Text>
        </View>
      ) : tool === 'strongs' ? (
        <View style={styles.body}>
          {words.length === 0 ? (
            <Text style={[styles.empty, { color: colors.muted }]}>
              No Strong's data available for this verse yet.
            </Text>
          ) : (
            words.map((w, i) => {
              const key = `${w.strongsId}_${w.wordOrder}_${i}`;
              return (
                <VerseWordCard
                  key={key}
                  item={w}
                  isExpanded={expandedWord === key}
                  onToggle={() =>
                    setExpandedWord(prev => (prev === key ? null : key))
                  }
                  onOpenDetail={openDetail}
                  colors={colors}
                />
              );
            })
          )}
        </View>
      ) : (
        <View style={styles.body}>
          {tool === 'explanation' && (
            <>
              {ai?.intro?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(BookOpen, 'Introduction', meta.iconColor)}
                  <RichText
                    text={ai.intro}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {ai?.explanation?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(BookOpen, 'Explanation', meta.iconColor)}
                  <RichText
                    text={ai.explanation}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {ai?.application?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(Sprout, 'Application', '#16A34A')}
                  <RichText
                    text={ai.application}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor="#16A34A"
                    paragraphGap={9}
                  />
                </View>
              )}
            </>
          )}

          {tool === 'application' && (
            <>
              {ai?.application?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(Sprout, 'Application', meta.iconColor)}
                  <RichText
                    text={ai.application}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {ai?.prayer?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(Sprout, 'Prayer', meta.iconColor)}
                  <RichText
                    text={ai.prayer}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
            </>
          )}

          {tool === 'background' && (
            <>
              {ai?.context?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(MapPin, 'Context', meta.iconColor)}
                  <RichText
                    text={ai.context}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {prologue?.author?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(User, 'Author', meta.iconColor)}
                  <RichText
                    text={prologue.author}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {prologue?.summary?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(BookOpen, 'Book', meta.iconColor)}
                  <RichText
                    text={prologue.summary}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
              {prologue?.purpose?.trim() && !prologue?.summary?.trim() && (
                <View style={styles.section}>
                  {sectionHeader(BookOpen, 'Book', meta.iconColor)}
                  <RichText
                    text={prologue.purpose}
                    textStyle={[styles.bodyText, { color: colors.text }]}
                    accentColor={colors.primary}
                    paragraphGap={9}
                  />
                </View>
              )}
            </>
          )}

          {!hasAnyContent && (
            <Text style={[styles.empty, { color: colors.muted }]}>
              No data available for this verse yet.
            </Text>
          )}
        </View>
      )}

      <WordStudyBottomSheet
        visible={detailVisible}
        word={null}
        entry={detailEntry}
        loading={detailLoading}
        isDark={isDark}
        onClose={() => setDetailVisible(false)}
        onSaveWord={handleSaveWord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Seamless with the page — same background as the ActionHeader, full width
  panel: {
    paddingVertical: 16,
  },
  center: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  centerText: { fontSize: 14, fontWeight: '500' },
  body: { paddingBottom: 2 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 9,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bodyText: { fontSize: 17, lineHeight: 27, fontWeight: '500' },
  empty: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
