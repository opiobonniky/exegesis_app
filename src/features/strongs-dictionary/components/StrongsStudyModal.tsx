import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, BookOpen } from 'lucide-react-native';
import {
  strongsDictionaryApi,
  VerseUniqueWord,
  StrongsWordEntry,
} from '../services/strongsDictionaryApi';
import { getStrongsEntry } from '../../../services/strongsService';
import { saveFavoriteWord } from '../services/strongsFavorites';
import { showToast } from '../../../helpers/Toash.helper';
import VerseWordCard from './VerseWordCard';
import WordStudyBottomSheet from '../../bible/components/WordStudyBottomSheet';

interface Props {
  visible: boolean;
  bookName: string;
  chapter: number;
  verse: number;
  translationId: string;
  isDark: boolean;
  onClose: () => void;
  colors: any;
}

/**
 * Strong's Concordance tool — loads the unique Strong's words for the
 * selected verse and shows them in a modal, one expandable row per word.
 */
export default function StrongsStudyModal({
  visible,
  bookName,
  chapter,
  verse,
  translationId,
  isDark,
  onClose,
  colors,
}: Props) {
  const [words, setWords] = useState<VerseUniqueWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoading(true);
    setLoaded(false);
    setWords([]);
    setExpandedKey(null);
    (async () => {
      try {
        const res = await strongsDictionaryApi.getVerseUniqueWords(
          bookName,
          chapter,
          verse,
          translationId,
        );
        if (mounted) setWords(res.data || []);
      } catch {
        if (mounted) setWords([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setLoaded(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible, bookName, chapter, verse, translationId]);

  const openDetail = useCallback(async (strongs: StrongsWordEntry) => {
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

  const hasWords = words.length > 0;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>
                  STRONG'S CONCORDANCE
                </Text>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {bookName} {chapter}:{verse}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={[styles.closeBtn, { backgroundColor: `${colors.muted}18` }]}
              >
                <X size={17} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading word study…
                </Text>
              </View>
            ) : loaded && !hasWords ? (
              <View style={styles.centerWrap}>
                <BookOpen size={38} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Strong's data
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  This verse has no tagged original-language words available yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={words}
                keyExtractor={(item, idx) => `${item.strongsId}_${item.wordOrder}_${idx}`}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => {
                  const key = `${item.strongsId}_${item.wordOrder}_${index}`;
                  return (
                    <VerseWordCard
                      item={item}
                      isExpanded={expandedKey === key}
                      onToggle={() =>
                        setExpandedKey(prev => (prev === key ? null : key))
                      }
                      onOpenDetail={openDetail}
                      colors={colors}
                    />
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <WordStudyBottomSheet
        visible={detailVisible}
        word={null}
        entry={detailEntry}
        loading={detailLoading}
        isDark={isDark}
        onClose={() => setDetailVisible(false)}
        onSaveWord={async entry => {
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
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitleWrap: { flex: 1, marginRight: 12 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  loadingText: { fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  emptySub: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
});
