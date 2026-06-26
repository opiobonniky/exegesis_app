import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {
  Search,
  X,
  BookOpen,
  BookmarkCheck,
  BookText,
  FileText,
  StickyNote,
  ChevronDown,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import { useLanguage } from '../../component/language-translation/LanguageProvider';
import { useSearch } from './hooks/useSearch';
import { createSearchStyles } from './searchStyle';
import {
  SearchResult,
  StrongsResult,
  JournalSearchResult,
  TopicResult,
  LemmaResult,
  SearchScope,
} from '../../services/searchApi';
import ActionHeader from '../../reusable/ActionHeader';

const SUGGESTIONS: Record<SearchScope, string[]> = {
  bible: ['love', 'faith', 'hope', 'peace', 'joy', 'grace', 'mercy', 'truth'],
  strongs: ['G26', 'G3056', 'G4102', 'G25', 'G1515', 'G5485'],
  journal: ['prayer', 'thanksgiving', 'healing', 'wisdom', 'faith', 'peace'],
  topics: [
    'love',
    'faith',
    'salvation',
    'grace',
    'covenant',
    'redemption',
    'kingdom',
    'holiness',
  ],
  lemma: [
    'anthropos',
    'logos',
    'agape',
    'pistis',
    'charis',
    'doxa',
    'zoe',
    'soteria',
  ],
};

const SCOPE_LABELS: Record<SearchScope, string> = {
  bible: 'Bible',
  strongs: "Strong's",
  journal: 'Journal',
  topics: 'Topics',
  lemma: 'Lemma',
};

const BOOK_NAMES = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
];

function SearchSkeleton({ colors }: { colors: ReturnType<typeof getColors> }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const skeletonBg = colors.cardBackground || '#E8E8E8';

  return (
    <View style={{ padding: 16, gap: 12 }}>
      {[
        { h: 56, w: '100%' },
        { h: 50, w: '92%' },
        { h: 52, w: '100%' },
        { h: 48, w: '85%' },
        { h: 54, w: '100%' },
      ].map((item, i) => (
        <View key={i} style={{ gap: 6 }}>
          <View style={{ height: 14, width: '40%', borderRadius: 4, backgroundColor: skeletonBg, opacity }} />
          <View
            style={{
              height: item.h,
              width: item.w as any,
              borderRadius: 8,
              backgroundColor: skeletonBg,
              opacity,
            }}
          />
        </View>
      ))}
    </View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<any>();
  const app = React.useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createSearchStyles(COLORS), [COLORS]);
  const { translations: translation } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const {
    query,
    setQuery,
    scope,
    switchScope,
    bookName,
    setBookFilter,
    results,
    loading,
    total,
    error,
    loadMore,
    clearQuery,
    searchedOnce,
    relatedWords,
    loadRelatedWords,
  } = useSearch();

  const hasQuery = query.trim().length >= 3;
  const skeletonOpacity = useRef(new Animated.Value(0)).current;
  const showSkeleton = loading && hasQuery && results.length === 0;

  useEffect(() => {
    Animated.timing(skeletonOpacity, {
      toValue: showSkeleton ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showSkeleton, skeletonOpacity]);

  const [covenant, setCovenant] = useState<'all' | 'ot' | 'nt'>('all');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [initializedFromRoute, setInitializedFromRoute] = useState(false);
  const [prefillWord, setPrefillWord] = useState<string | undefined>(undefined);
  const [prefillStrongsId, setPrefillStrongsId] = useState<string | undefined>(
    undefined,
  );

  const filteredBooks = useMemo(() => {
    if (covenant === 'ot') return BOOK_NAMES.slice(0, 39);
    if (covenant === 'nt') return BOOK_NAMES.slice(39);
    return BOOK_NAMES;
  }, [covenant]);

  useEffect(() => {
    const strongsId = routeParams.params?.strongsId;
    const word = routeParams.params?.word;
    const scopeParam = routeParams.params?.scope;
    if (!initializedFromRoute && (strongsId || word)) {
      setInitializedFromRoute(true);
      setPrefillWord(word);
      setPrefillStrongsId(strongsId);
      if (scopeParam === 'strongs' && strongsId) {
        setQuery(strongsId, 'strongs');
        switchScope('strongs');
      } else {
        const q = word || strongsId || '';
        setQuery(q, 'bible');
        switchScope('bible');
      }
    }
  }, [routeParams.params, initializedFromRoute, setQuery, switchScope]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      Keyboard.dismiss();
      navigation.navigate(route.bible, {
        bookName: item.book_name,
        chapter: item.chapter,
        verse: item.verse,
      });
    },
    [navigation],
  );

  const handleStudy = useCallback(
    (item: SearchResult) => {
      Keyboard.dismiss();
      navigation.navigate(route.verseResources, {
        bookName: item.book_name,
        chapter: item.chapter,
        verse: item.verse,
      });
    },
    [navigation],
  );

  const handleSave = useCallback(
    (item: SearchResult) => {
      navigation.navigate(route.bible, {
        bookName: item.book_name,
        chapter: item.chapter,
        verse: item.verse,
        highlight: true,
      });
    },
    [navigation],
  );

  const handleAddNote = useCallback(
    (item: SearchResult) => {
      navigation.navigate(route.bible, {
        bookName: item.book_name,
        chapter: item.chapter,
        verse: item.verse,
        addNote: true,
      });
    },
    [navigation],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      setQuery(suggestion, scope);
      inputRef.current?.focus();
    },
    [setQuery, scope],
  );

  const handleRelatedWords = useCallback(
    (strongsId: string) => {
      loadRelatedWords(strongsId);
    },
    [loadRelatedWords],
  );

  const renderBibleResult = useCallback(
    ({ item }: { item: SearchResult }) => {
      const parts = item.headline ? splitHeadline(item.headline) : null;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.resultRef}>
            {item.book_name} {item.chapter}:{item.verse}
          </Text>
          {parts ? (
            <Text style={styles.resultText}>
              {parts.map((part, i) =>
                part.highlight ? (
                  <Text key={i} style={styles.resultHighlight}>
                    {part.text}
                  </Text>
                ) : (
                  <Text key={i}>{part.text}</Text>
                ),
              )}
            </Text>
          ) : (
            <Text style={styles.resultText} numberOfLines={3}>
              {item.verse_text}
            </Text>
          )}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.primary }]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>
                Open
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.muted }]}
              onPress={() => handleStudy(item)}
            >
              <Text style={[styles.actionBtnText, { color: COLORS.muted }]}>
                Study
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.muted }]}
              onPress={() => handleAddNote(item)}
            >
              <StickyNote size={12} color={COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.muted }]}
              onPress={() => handleSave(item)}
            >
              <BookmarkCheck size={14} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleSelect, handleStudy, handleAddNote, handleSave, styles, COLORS],
  );

  const renderStrongsResult = useCallback(
    ({ item }: { item: StrongsResult }) => (
      <TouchableOpacity
        style={styles.strongsResultItem}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate(route.wordStudy, { strongsId: item.strongsId });
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.strongsWord}>
          {item.originalWord || item.strongsId}
        </Text>
        <Text style={styles.strongsId}>{item.strongsId}</Text>
        <Text style={styles.strongsDef}>{item.shortDefinition}</Text>
        <Text style={styles.strongsLang}>
          {item.language} · {item.usageCount ?? 0} occurrences
        </Text>
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: COLORS.muted }]}
            onPress={() => handleRelatedWords(item.strongsId)}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.muted }]}>
              Related Words
            </Text>
          </TouchableOpacity>
        </View>
        {relatedWords.length > 0 && (
          <View style={styles.relatedWordsRow}>
            {relatedWords.map((rw: LemmaResult) => (
              <TouchableOpacity
                key={rw.strongsId}
                style={styles.relatedWordChip}
                onPress={() => {
                  Keyboard.dismiss();
                  navigation.navigate(route.wordStudy, {
                    strongsId: rw.strongsId,
                  });
                }}
              >
                <Text style={styles.relatedWordText}>
                  {rw.originalWord || rw.strongsId}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    ),
    [navigation, styles, COLORS, handleRelatedWords, relatedWords],
  );

  const renderJournalResult = useCallback(
    ({ item }: { item: JournalSearchResult }) => (
      <TouchableOpacity
        style={styles.journalResultItem}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate(route.journalDetail, { id: item.id });
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.journalTitle}>{item.title || 'Untitled'}</Text>
        <Text style={styles.journalPreview} numberOfLines={2}>
          {item.content}
        </Text>
        {item.bookName && (
          <Text style={styles.journalMeta}>
            {item.bookName} {item.chapter}:{item.verseNumber} · {item.createdAt}
          </Text>
        )}
      </TouchableOpacity>
    ),
    [navigation, styles],
  );

  const renderTopicResult = useCallback(
    ({ item }: { item: TopicResult }) => {
      const refCount = item.verseRefs ? item.verseRefs.split(',').length : 0;
      return (
        <TouchableOpacity
          style={styles.topicResultItem}
          onPress={() => {
            Keyboard.dismiss();
            setQuery(item.topicName, 'bible');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.topicName}>{item.topicName}</Text>
          {item.description && (
            <Text style={styles.topicDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.topicVerseCount}>{refCount} related verses</Text>
        </TouchableOpacity>
      );
    },
    [setQuery],
  );

  const renderLemmaResult = useCallback(
    ({ item }: { item: LemmaResult }) => (
      <TouchableOpacity
        style={styles.lemmaResultItem}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate(route.wordStudy, { strongsId: item.strongsId });
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.lemmaWord}>
          {item.originalWord || item.strongsId}
        </Text>
        <Text style={styles.lemmaId}>
          {item.strongsId} · {item.transliteration}
        </Text>
        <Text style={styles.lemmaDef}>{item.shortDefinition}</Text>
      </TouchableOpacity>
    ),
    [navigation, styles],
  );

  const renderFooter = useCallback(() => {
    if (!loading || results.length === 0) return null;
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {translation?.search?.loading || 'Searching...'}
        </Text>
      </View>
    );
  }, [loading, results.length, COLORS.primary, styles, translation]);

  const handleScopeSwitch = useCallback(
    (s: SearchScope) => {
      switchScope(s);
      setShowBookPicker(false);
      setCovenant('all');
      inputRef.current?.focus();
    },
    [switchScope],
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text, scope);
    },
    [setQuery, scope],
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => `${scope}-${index}`,
    [scope],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (scope === 'strongs') return renderStrongsResult({ item });
      if (scope === 'journal') return renderJournalResult({ item });
      if (scope === 'topics') return renderTopicResult({ item });
      if (scope === 'lemma') return renderLemmaResult({ item });
      return renderBibleResult({ item });
    },
    [
      scope,
      renderBibleResult,
      renderStrongsResult,
      renderJournalResult,
      renderTopicResult,
      renderLemmaResult,
    ],
  );

  const scopes: SearchScope[] = [
    'bible',
    'strongs',
    'journal',
    'topics',
    'lemma',
  ];

  return (
    <View style={styles.container}>
      <ActionHeader
        mode="standard"
        title={translation?.search?.title || 'Search'}
        onPress={() => navigation.goBack()}
      />

      <View style={[styles.inputWrap, { marginHorizontal: 16, marginTop: 12 }]}>
        <Search size={16} color={COLORS.muted} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={
            scope === 'bible'
              ? translation?.search?.placeholder || 'Search the Bible...'
              : scope === 'strongs'
                ? "Search Strong's numbers or words..."
                : scope === 'journal'
                  ? 'Search your journal...'
                  : scope === 'topics'
                    ? 'Search Bible topics...'
                    : 'Search Greek/Hebrew lemmas...'
          }
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={handleInputChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearQuery}>
            <X size={16} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter section ── */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scopeRow}
          contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
        >
          {scopes.map(s => {
            const active = scope === s;
            const iconColor = active ? '#FFFFFF' : COLORS.text;
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.scopeTab,
                  active ? styles.scopeTabActive : styles.scopeTabInactive,
                ]}
                onPress={() => handleScopeSwitch(s)}
                activeOpacity={0.7}
              >
                {s === 'bible' && <BookOpen size={14} color={iconColor} />}
                {s === 'strongs' && <BookText size={14} color={iconColor} />}
                {s === 'journal' && <FileText size={14} color={iconColor} />}
                {s === 'topics' && (
                  <BookmarkCheck size={14} color={iconColor} />
                )}
                {s === 'lemma' && <Search size={14} color={iconColor} />}
                <Text
                  style={[
                    styles.scopeTabText,
                    active
                      ? styles.scopeTabTextActive
                      : styles.scopeTabTextInactive,
                  ]}
                >
                  {SCOPE_LABELS[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {scope === 'bible' && (
          <>
            <View style={styles.bookFilterRow}>
              {(['all', 'ot', 'nt'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.covenantChip,
                    covenant === c
                      ? styles.covenantChipActive
                      : styles.covenantChipInactive,
                  ]}
                  onPress={() => {
                    setCovenant(c);
                    setBookFilter(undefined);
                    setShowBookPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.covenantChipText,
                      covenant === c
                        ? styles.covenantChipTextActive
                        : styles.covenantChipTextInactive,
                    ]}
                  >
                    {c === 'all' ? 'All' : c === 'ot' ? 'OT' : 'NT'}
                  </Text>
                  {c !== 'all' && (
                    <Text
                      style={[
                        { fontSize: 10, opacity: 0.7 },
                        covenant === c
                          ? { color: '#FFFFFF' }
                          : { color: COLORS.muted },
                      ]}
                    >
                      {c === 'ot' ? '39' : '27'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={[
                  styles.bookPickerToggle,
                  bookName && styles.bookPickerToggleActive,
                ]}
                onPress={() => setShowBookPicker(p => !p)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.bookPickerToggleText,
                    bookName && styles.bookPickerToggleTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {bookName || 'Book'}
                </Text>
                <ChevronDown
                  size={12}
                  color={bookName ? '#FFFFFF' : COLORS.text}
                  style={
                    showBookPicker
                      ? { transform: [{ rotate: '180deg' }] }
                      : undefined
                  }
                />
              </TouchableOpacity>
            </View>

            {showBookPicker && (
              <ScrollView style={styles.bookPickerContainer}>
                {filteredBooks.map(b => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.bookPickerItem,
                      bookName === b && styles.bookPickerItemActive,
                    ]}
                    onPress={() => {
                      setBookFilter(b);
                      setShowBookPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.bookPickerText,
                        bookName === b && styles.bookPickerTextActive,
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          style={styles.content}
          data={hasQuery ? results : []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListHeaderComponent={
            <>
              {hasQuery && total > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>
                    {total} {translation?.search?.results || 'results'}
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            query.trim().length > 0 && query.trim().length < 3 ? (
              <View style={styles.center}>
                <Search size={48} color={COLORS.muted} style={styles.emptyIcon} />
                <Text style={styles.emptySubtitle}>
                  {translation?.search?.minChars ||
                    'Type at least 3 characters to search'}
                </Text>
              </View>
            ) : hasQuery && results.length === 0 && !error && searchedOnce ? (
              <View style={styles.center}>
                <BookOpen
                  size={48}
                  color={COLORS.muted}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptySubtitle}>
                  {scope === 'strongs'
                    ? `No Strong's entries found for "${query}"`
                    : scope === 'journal'
                      ? `No journal entries found for "${query}"`
                      : scope === 'topics'
                        ? `No topics found for "${query}"`
                        : scope === 'lemma'
                          ? `No lemmas found for "${query}"`
                          : translation?.search?.noResults ||
                            `No verses found for "${query}"`}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.emptySubtitle}>{error}</Text>
              </View>
            ) : !hasQuery ? (
              <View style={styles.center}>
                <FileText
                  size={48}
                  color={COLORS.muted}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>
                  {scope === 'bible'
                    ? translation?.search?.title || 'Search the Bible'
                    : scope === 'strongs'
                      ? "Search Strong's Concordance"
                      : scope === 'journal'
                        ? 'Search Your Journal'
                        : scope === 'topics'
                          ? 'Explore Bible topics and themes'
                          : 'Search Greek/Hebrew Lemmas'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {scope === 'bible'
                    ? translation?.search?.subtitle ||
                      'Find verses across all books and chapters'
                    : scope === 'strongs'
                      ? 'Find Greek & Hebrew word studies'
                      : scope === 'journal'
                        ? 'Find reflections, prayers, and notes'
                        : scope === 'topics'
                          ? 'Explore Bible topics and themes'
                          : 'Search by Greek/Hebrew root word'}
                </Text>
                <View style={styles.suggestionsRow}>
                  {SUGGESTIONS[scope].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={styles.chip}
                      onPress={() => handleSuggestion(s)}
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />
        {/* Smooth skeleton overlay — scoped to FlatList area */}
        {showSkeleton && (
          <Animated.View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { opacity: skeletonOpacity }]}
          >
            <SearchSkeleton colors={COLORS} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function splitHeadline(
  headline: string,
): { text: string; highlight: boolean }[] {
  const parts: { text: string; highlight: boolean }[] = [];
  const regex = /<mark>(.*?)<\/mark>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(headline)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: headline.slice(lastIndex, match.index),
        highlight: false,
      });
    }
    parts.push({ text: match[1], highlight: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < headline.length) {
    parts.push({ text: headline.slice(lastIndex), highlight: false });
  }

  return parts;
}
