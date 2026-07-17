import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Info,
  Save,
  Search,
  X,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  ChapterStudyToolItem,
  TOOL_TYPE_LABELS,
  TOOL_TYPE_ORDER,
  ToolType,
  adminGetVerseWords,
  adminUpdateStrongsEntry,
  createSingleTool,
  updateSingleTool,
  getSingleTool,
  VerseWordItem,
} from '../bible/services/studyToolsApi';

const BIBLE_BOOKS_OT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
];

const BIBLE_BOOKS_NT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
  'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation',
];

const ALL_BOOKS = [...BIBLE_BOOKS_OT, ...BIBLE_BOOKS_NT];

const COVENANTS = [
  { key: 'all' as const, label: 'All' },
  { key: 'ot' as const, label: 'OT' },
  { key: 'nt' as const, label: 'NT' },
];

export default function AddStudyTool() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const editing = screenRoute.params?.tool as ChapterStudyToolItem | undefined;
  const editId = screenRoute.params?.id as number | undefined;

  const [bookName, setBookName] = useState('Genesis');
  const [chapter, setChapter] = useState('1');
  const [verseNum, setVerseNum] = useState('');
  const [toolType, setToolType] = useState<ToolType>('COMMAND');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [verseRefsText, setVerseRefsText] = useState('');
  const [strongsIdsText, setStrongsIdsText] = useState('');
  const [order, setOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [loadingVerse, setLoadingVerse] = useState(false);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [covenant, setCovenant] = useState<'all' | 'ot' | 'nt'>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [chapterInput, setChapterInput] = useState('1');
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [verseInput, setVerseInput] = useState('');

  const [verseWords, setVerseWords] = useState<VerseWordItem[]>([]);
  const [selectedWords, setSelectedWords] = useState<Record<string, VerseWordItem>>({});
  const [wordExplanations, setWordExplanations] = useState<Record<string, string>>({});
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  const filteredBooks = useMemo(() => {
    let books = ALL_BOOKS;
    if (covenant === 'ot') books = BIBLE_BOOKS_OT;
    else if (covenant === 'nt') books = BIBLE_BOOKS_NT;
    if (bookSearch.trim()) {
      const q = bookSearch.toLowerCase();
      books = books.filter(b => b.toLowerCase().includes(q));
    }
    return books;
  }, [covenant, bookSearch]);

  const chapterNum = Number(chapter) || 1;
  const verseNumNum = Number(verseNum) || 0;

  useEffect(() => {
    if (editing) {
      setBookName(editing.bookName || 'Genesis');
      setChapter(String(editing.chapter || 1));
      setToolType(editing.toolType || 'COMMAND');
      setLabel(editing.label || '');
      setDescription(editing.description || '');
      setVerseRefsText(
        Array.isArray(editing.verseRefs)
          ? editing.verseRefs.map(r => `${r.verse}: ${r.excerpt || ''}`.trim()).join('\n')
          : '',
      );
      setStrongsIdsText(
        Array.isArray(editing.strongsIds) ? editing.strongsIds.join(', ') : '',
      );
      setOrder(String(editing.order ?? 0));
    } else if (editId) {
      loadSingleTool(editId);
    }
  }, [editing, editId]);

  const loadSingleTool = async (id: number) => {
    try {
      const tool = await getSingleTool(id);
      if (!tool) return;
      setBookName(tool.bookName || 'Genesis');
      setChapter(String(tool.chapter || 1));
      setToolType(tool.toolType || 'COMMAND');
      setLabel(tool.label || '');
      setDescription(tool.description || '');
      setVerseRefsText(
        Array.isArray(tool.verseRefs)
          ? tool.verseRefs.map(r => `${r.verse}: ${r.excerpt || ''}`.trim()).join('\n')
          : '',
      );
      setStrongsIdsText(
        Array.isArray(tool.strongsIds) ? tool.strongsIds.join(', ') : '',
      );
      setOrder(String(tool.order ?? 0));
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load study tool');
    }
  };

  const fetchVerseWords = useCallback(async () => {
    if (!bookName || !chapterNum) return;
    setLoadingVerse(true);
    try {
      const words = await adminGetVerseWords({
        bookName,
        chapter: chapterNum,
        verse: verseNumNum > 0 ? verseNumNum : undefined,
      });
      setVerseWords(words || []);
      if (words?.length) {
        const verseSet = new Set(words.map(w => w.verseNumber));
        if (verseSet.size === 1) {
          setVerseNum(String([...verseSet][0]));
        }
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load verse words');
    } finally {
      setLoadingVerse(false);
    }
  }, [bookName, chapterNum, verseNumNum]);

  useEffect(() => {
    if (bookName && chapterNum) {
      const debounce = setTimeout(() => fetchVerseWords(), 300);
      return () => clearTimeout(debounce);
    }
  }, [bookName, chapterNum]);

  const toggleWord = (word: VerseWordItem) => {
    const key = `${word.strongsId || word.surfaceText}_${word.wordOrder}`;
    if (selectedWords[key]) {
      const { [key]: _, ...rest } = selectedWords;
      setSelectedWords(rest);
    } else {
      setSelectedWords(prev => ({ ...prev, [key]: word }));
    }
  };

  const handleSave = async () => {
    if (!bookName.trim() || !chapterNum || !label.trim() || !verseRefsText.trim()) {
      showToast('error', 'Book, chapter, label, and verse references are required');
      return;
    }

    const parsedRefs = verseRefsText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [v, ...excerptParts] = line.split(':');
        return { verse: Number(v.trim()), excerpt: excerptParts.join(':').trim() };
      })
      .filter(ref => Number.isFinite(ref.verse) && ref.verse > 0);

    if (!parsedRefs.length) {
      showToast('error', 'At least one valid verse reference is required');
      return;
    }

    const strongsArr = strongsIdsText
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    const words = Object.values(selectedWords).map((w, idx) => ({
      strongsId: w.strongsId || '__unknown__',
      verse: w.verseNumber,
      surfaceText: w.surfaceText,
      originalWord: w.strongs?.originalWord || null,
      transliteration: w.strongs?.transliteration || null,
      adminExplanation: wordExplanations[`${w.strongsId || w.surfaceText}_${w.wordOrder}`] || null,
      wordOrder: idx,
    }));

    setSaving(true);
    try {
      if (editing || editId) {
        const id = editing?.id || editId;
        await updateSingleTool({
          id: id as number,
          bookName,
          chapter: chapterNum,
          toolType,
          label: label.trim(),
          description: description.trim() || null,
          verseRefs: parsedRefs,
          strongsIds: strongsArr.length ? strongsArr : null,
          order: Number(order) || 0,
          studyToolWords: words.length ? words : undefined,
        });
      } else {
        await createSingleTool({
          bookName,
          chapter: chapterNum,
          toolType,
          label: label.trim(),
          description: description.trim() || null,
          verseRefs: parsedRefs,
          strongsIds: strongsArr.length ? strongsArr : null,
          order: Number(order) || 0,
          studyToolWords: words.length ? words : undefined,
        });
      }

      // Also save admin explanations to Strong's dictionary
      for (const [key, word] of Object.entries(selectedWords)) {
        const explanation = wordExplanations[key];
        if (explanation && word.strongsId) {
          try {
            await adminUpdateStrongsEntry({
              strongsId: word.strongsId,
              adminExplanation: explanation,
            });
          } catch {
            // non-blocking
          }
        }
      }

      showToast('success', editing || editId ? 'Study tool updated' : 'Study tool created');
      navigation.goBack();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save study tool');
    } finally {
      setSaving(false);
    }
  };

  const renderBookModal = () => (
    <Modal visible={showBookPicker} transparent animationType="slide" onRequestClose={() => setShowBookPicker(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: COLORS.surface, maxHeight: '80%' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>Select Book</Text>
            <TouchableOpacity onPress={() => setShowBookPicker(false)}>
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchBox}>
            <Search size={16} color={COLORS.muted} />
            <TextInput
              style={[styles.modalSearchInput, { color: COLORS.text }]}
              value={bookSearch}
              onChangeText={setBookSearch}
              placeholder="Search book..."
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.covenantRow}>
            {COVENANTS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.covenantChip, covenant === c.key && styles.covenantChipActive]}
                onPress={() => setCovenant(c.key)}
              >
                <Text style={[styles.covenantChipText, covenant === c.key && styles.covenantChipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredBooks}
            keyExtractor={b => b}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: COLORS.border },
                  bookName === item && { backgroundColor: `${COLORS.primary}15` },
                ]}
                onPress={() => {
                  setBookName(item);
                  setShowBookPicker(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: bookName === item ? COLORS.primary : COLORS.text }, bookName === item && { fontWeight: '700' }]}>
                  {item}
                </Text>
                {bookName === item && <Check size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderWordChip = (word: VerseWordItem) => {
    const key = `${word.strongsId || word.surfaceText}_${word.wordOrder}`;
    const isSelected = !!selectedWords[key];
    const isExpanded = expandedWord === key;
    const strongsData = word.strongs;

    return (
      <TouchableOpacity
        key={key}
        style={[styles.wordChip, isSelected && styles.wordChipSelected]}
        onPress={() => {
          toggleWord(word);
          if (!isSelected) {
            setExpandedWord(key);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.wordChipText, isSelected && styles.wordChipTextSelected]}>
          {word.surfaceText}
        </Text>
        {word.strongsId && (
          <Text style={[styles.wordChipStrongs, isSelected && { color: '#fff' }]}>
            {word.strongsId}
          </Text>
        )}
        {isExpanded && isSelected && (
          <View style={{ marginTop: 4 }}>
            <ChevronDown size={12} color={isSelected ? '#fff' : COLORS.muted} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderWordDetail = (word: VerseWordItem) => {
    const key = `${word.strongsId || word.surfaceText}_${word.wordOrder}`;
    const isSelected = !!selectedWords[key];
    if (!isSelected) return null;

    const strongsData = word.strongs;

    return (
      <View style={[styles.wordDetailCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
        <View style={styles.wordDetailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.wordDetailTitle, { color: COLORS.text }]}>
              {word.surfaceText}
            </Text>
            {word.strongsId && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={[styles.wordDetailBadge, { backgroundColor: COLORS.primary + '20', color: COLORS.primary }]}>
                  {word.strongsId}
                </Text>
                <Text style={[styles.wordDetailInfo, { color: COLORS.muted }]}>
                  Verse {word.verseNumber} · Word #{word.wordOrder}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              const { [key]: _, ...rest } = selectedWords;
              setSelectedWords(rest);
            }}
            style={[styles.wordRemoveBtn, { backgroundColor: COLORS.error + '15' }]}
          >
            <X size={14} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {strongsData && (
          <View style={styles.strongsPreview}>
            <Text style={[styles.strongsPreviewLabel, { color: COLORS.muted }]}>Strong's Dictionary:</Text>
            <View style={styles.strongsPreviewGrid}>
              {strongsData.originalWord && (
                <View style={styles.strongsPreviewItem}>
                  <Text style={[styles.strongsPreviewKey, { color: COLORS.muted }]}>Original</Text>
                  <Text style={[styles.strongsPreviewVal, { color: COLORS.text }]}>{strongsData.originalWord}</Text>
                </View>
              )}
              {strongsData.transliteration && (
                <View style={styles.strongsPreviewItem}>
                  <Text style={[styles.strongsPreviewKey, { color: COLORS.muted }]}>Transliteration</Text>
                  <Text style={[styles.strongsPreviewVal, { color: COLORS.text }]}>{strongsData.transliteration}</Text>
                </View>
              )}
              {strongsData.shortDefinition && (
                <View style={styles.strongsPreviewItemFull}>
                  <Text style={[styles.strongsPreviewKey, { color: COLORS.muted }]}>Definition</Text>
                  <Text style={[styles.strongsPreviewVal, { color: COLORS.text }]}>{strongsData.shortDefinition}</Text>
                </View>
              )}
              {strongsData.partOfSpeech && (
                <View style={styles.strongsPreviewItem}>
                  <Text style={[styles.strongsPreviewKey, { color: COLORS.muted }]}>Type</Text>
                  <Text style={[styles.strongsPreviewVal, { color: COLORS.text }]}>{strongsData.partOfSpeech}</Text>
                </View>
              )}
              {strongsData.language && (
                <View style={styles.strongsPreviewItem}>
                  <Text style={[styles.strongsPreviewKey, { color: COLORS.muted }]}>Language</Text>
                  <Text style={[styles.strongsPreviewVal, { color: COLORS.text }]}>{strongsData.language}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.explanationBox}>
          <Text style={[styles.explanationLabel, { color: COLORS.text }]}>
            Admin Explanation (Dictionary Entry)
          </Text>
          <TextInput
            style={[styles.explanationInput, { color: COLORS.text, backgroundColor: COLORS.background, borderColor: COLORS.border }]}
            value={wordExplanations[key] || ''}
            onChangeText={text => setWordExplanations(prev => ({ ...prev, [key]: text }))}
            placeholder="Write a detailed explanation like a dictionary entry..."
            placeholderTextColor={COLORS.muted}
            multiline
            textAlignVertical="top"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editing || editId ? 'Edit Study Tool' : 'Add Study Tool'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Bible Reference Section ── */}
        <Text style={styles.sectionTitle}>Bible Reference</Text>
        <View style={styles.refRow}>
          <TouchableOpacity style={[styles.refPicker, { flex: 2, borderColor: COLORS.border }]} onPress={() => setShowBookPicker(true)}>
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={[styles.refPickerText, { color: COLORS.text }]}>{bookName}</Text>
            <ChevronDown size={14} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.refPicker, { flex: 1, borderColor: COLORS.border }]} onPress={() => setShowChapterPicker(true)}>
            <Text style={[styles.refPickerText, { color: COLORS.text }]}>Ch. {chapter}</Text>
            <ChevronDown size={14} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Verse Words Section ── */}
        <Text style={styles.sectionTitle}>
          Verse Words
          {verseNum ? ` (v${verseNum})` : ''}
        </Text>
        {loadingVerse ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : verseWords.length ? (
          <>
            <View style={styles.wordsContainer}>
              {verseWords.map(renderWordChip)}
            </View>
            <Text style={[styles.wordsHint, { color: COLORS.muted }]}>
              Tap a word to link it to this study tool. Tap again to deselect.
            </Text>
            {Object.keys(selectedWords).length > 0 && (
              <View style={styles.selectedWordsSection}>
                <Text style={[styles.selectedWordsLabel, { color: COLORS.text }]}>
                  Selected Words ({Object.keys(selectedWords).length})
                </Text>
                {Object.entries(selectedWords).map(([key, word]) => renderWordDetail(word))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noWordsBox}>
            <Info size={20} color={COLORS.muted} />
            <Text style={[styles.noWordsText, { color: COLORS.muted }]}>
              {chapterNum ? 'No word data available for this chapter. Enter a specific verse number to load words.' : 'Enter a chapter to load verse words.'}
            </Text>
          </View>
        )}

        {/* ── Study Tool Details ── */}
        <Text style={styles.sectionTitle}>Tool Details</Text>

        <Text style={styles.label}>Tool Type *</Text>
        <View style={styles.chipsRow}>
          {TOOL_TYPE_ORDER.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, toolType === type && styles.chipActive]}
              onPress={() => setToolType(type)}
            >
              <Text style={[styles.chipText, toolType === type && styles.chipTextActive]}>
                {TOOL_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Label *" value={label} onChangeText={setLabel} placeholder="e.g. God said, Let there be light" styles={styles} colors={COLORS} />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Brief explanation for readers" multiline styles={styles} colors={COLORS} />
        <Field label="Verse References *" value={verseRefsText} onChangeText={setVerseRefsText} placeholder={'1: In the beginning...\n3: Let there be light'} multiline styles={styles} colors={COLORS} />
        <Field label="Strong's IDs (comma separated)" value={strongsIdsText} onChangeText={setStrongsIdsText} placeholder="H7225, G26, G2889" styles={styles} colors={COLORS} />
        <Field label="Order" value={order} onChangeText={setOrder} keyboardType="number-pad" styles={styles} colors={COLORS} />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Save size={18} color="#fff" />}
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Study Tool'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderBookModal()}

      {/* Chapter Picker Modal */}
      <Modal visible={showChapterPicker} transparent animationType="fade" onRequestClose={() => setShowChapterPicker(false)}>
        <TouchableOpacity style={styles.simpleModalOverlay} activeOpacity={1} onPress={() => setShowChapterPicker(false)}>
          <View style={[styles.simpleModalContent, { backgroundColor: COLORS.surface }]}>
            <Text style={[styles.simpleModalTitle, { color: COLORS.text }]}>Chapter</Text>
            <TextInput
              style={[styles.simpleModalInput, { color: COLORS.text, borderColor: COLORS.border, backgroundColor: COLORS.cardBackground }]}
              value={chapterInput}
              onChangeText={setChapterInput}
              keyboardType="number-pad"
              placeholder="Enter chapter number"
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.simpleModalActions}>
              <TouchableOpacity
                style={[styles.simpleModalBtn, { backgroundColor: COLORS.cardBackground }]}
                onPress={() => setShowChapterPicker(false)}
              >
                <Text style={[styles.simpleModalBtnText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.simpleModalBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  const ch = Number(chapterInput);
                  if (ch > 0) {
                    setChapter(String(ch));
                    setShowChapterPicker(false);
                  } else {
                    showToast('error', 'Enter a valid chapter number');
                  }
                }}
              >
                <Text style={[styles.simpleModalBtnText, { color: '#fff' }]}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, styles, colors, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.textarea]}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 42 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  fieldWrap: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBackground },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  saveButton: { marginTop: 8, height: 52, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Reference row
  refRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  refPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, backgroundColor: COLORS.cardBackground },
  refPickerText: { fontSize: 14, fontWeight: '700', flex: 1 },

  // Book picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.cardBackground },
  modalSearchInput: { flex: 1, padding: 0 },
  covenantRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  covenantChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  covenantChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  covenantChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  covenantChipTextActive: { color: '#fff' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText: { fontSize: 15, flex: 1 },

  // Simple modals
  simpleModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  simpleModalContent: { width: '80%', borderRadius: 20, padding: 24 },
  simpleModalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  simpleModalInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  simpleModalActions: { flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' },
  simpleModalBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  simpleModalBtnText: { fontSize: 14, fontWeight: '800' },

  // Verse words
  wordsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, borderRadius: 12, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  wordChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  wordChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  wordChipTextSelected: { color: '#fff' },
  wordChipStrongs: { fontSize: 9, fontWeight: '700', color: COLORS.muted, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  wordsHint: { fontSize: 11, marginTop: 6, marginBottom: 4 },
  noWordsBox: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  noWordsText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Selected words section
  selectedWordsSection: { marginTop: 16 },
  selectedWordsLabel: { fontSize: 14, fontWeight: '800', marginBottom: 10 },

  // Word detail card
  wordDetailCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  wordDetailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  wordDetailTitle: { fontSize: 16, fontWeight: '800' },
  wordDetailBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  wordDetailInfo: { fontSize: 11 },
  wordRemoveBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  // Strong's preview
  strongsPreview: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  strongsPreviewLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  strongsPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strongsPreviewItem: { flex: 1, minWidth: '45%' },
  strongsPreviewItemFull: { width: '100%', marginTop: 4 },
  strongsPreviewKey: { fontSize: 10, fontWeight: '600' },
  strongsPreviewVal: { fontSize: 13, fontWeight: '700', marginTop: 1 },

  // Admin explanation
  explanationBox: { marginTop: 14 },
  explanationLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  explanationInput: { minHeight: 100, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, lineHeight: 19, textAlignVertical: 'top' },
});