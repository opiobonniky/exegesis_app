import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bookmark, Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../../component/navigations/routes';
import WordCard from './WordCard';
import {
  getFavoriteWords,
  getFavoriteVerses,
  removeFavoriteWord,
  SavedVerse,
} from '../services/strongsFavorites';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';
import { getVersionById } from '../../../assets/bibleVersion/json/bibleVersions';
import { getVerseText } from '../../../utilits/bibleUtils';
import WordStudyBottomSheet from '../../bible/components/WordStudyBottomSheet';
import { getStrongsEntry } from '../../../services/strongsService';

interface Props {
  translationId: string;
  isDark: boolean;
  colors: any;
}

/**
 * Favorites tab — the Strong's words the user saved from a word study and
 * the verses they bookmarked on the Study Verse card.
 */
export default function FavoritesTab({
  translationId,
  isDark,
  colors,
}: Props) {
  const navigation = useNavigation<any>();
  const [words, setWords] = useState<StrongsWordEntry[]>([]);
  const [verses, setVerses] = useState<SavedVerse[]>([]);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const reload = useCallback(() => {
    getFavoriteWords().then(setWords);
    getFavoriteVerses().then(setVerses);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const versionData = getVersionById(translationId).load();

  const openDetail = async (item: StrongsWordEntry) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailEntry(null);
    try {
      const res = await getStrongsEntry(item.strongsId);
      if (res.returnCode === 200 && res.returnData) {
        setDetailEntry(res.returnData);
      }
    } catch {
    } finally {
      setDetailLoading(false);
    }
  };

  const empty = words.length === 0 && verses.length === 0;

  return (
    <View style={styles.wrap}>
      {empty ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Bookmark size={34} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Bookmark verses or save Strong's words during your study and they will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...verses.map(v => ({
              key: `v_${v.bookName}_${v.chapter}_${v.verse}`,
              type: 'verse' as const,
              verse: v,
            })),
            ...words.map(w => ({
              key: `w_${w.strongsId}`,
              type: 'word' as const,
              word: w,
            })),
          ]}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.type === 'verse') {
              const v = item.verse;
              const text = getVerseText(v.bookName, v.chapter, v.verse, versionData);
              return (
                <TouchableOpacity
                  style={[styles.verseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate(route.bible, {
                      bookName: v.bookName,
                      chapter: v.chapter,
                      verseNumber: v.verse,
                    })
                  }
                >
                  <View style={[styles.verseIcon, { backgroundColor: `${colors.primary}14` }]}>
                    <Heart size={15} color={colors.primary} strokeWidth={2.3} />
                  </View>
                  <View style={styles.verseBody}>
                    <Text style={[styles.verseRef, { color: colors.primary }]}>
                      {v.bookName} {v.chapter}:{v.verse}
                    </Text>
                    <Text style={[styles.verseText, { color: colors.textSecondary }]} numberOfLines={2}>
                      {text || '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            const w = item.word;
            return (
              <View>
                <WordCard item={w} onPress={openDetail} colors={colors} />
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      await removeFavoriteWord(w.strongsId);
                      reload();
                    }}
                    activeOpacity={0.7}
                    style={[styles.removeBtn, { backgroundColor: `${colors.error}12` }]}
                  >
                    <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>
            );
          }}
        />
      )}

      <WordStudyBottomSheet
        visible={detailVisible}
        word={null}
        entry={detailEntry}
        loading={detailLoading}
        isDark={isDark}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 90 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  verseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  verseBody: { flex: 1 },
  verseRef: { fontSize: 14, fontWeight: '800' },
  verseText: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 4,
    paddingBottom: 4,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  removeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
