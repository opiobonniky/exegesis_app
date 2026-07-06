import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  ChapterStudyToolItem,
  getAllAdminStudyTools,
  TOOL_TYPE_LABELS,
  TOOL_TYPE_ORDER,
  ToolType,
  upsertChapterStudyTools,
} from '../bible/services/studyToolsApi';

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const parseVerseRefs = (value: string) => value
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    const [versePart, ...excerptParts] = line.split(':');
    return { verse: Number(versePart.trim()), excerpt: excerptParts.join(':').trim() };
  })
  .filter(ref => Number.isFinite(ref.verse) && ref.verse > 0);

const formatVerseRefs = (refs?: Array<{ verse: number; excerpt: string }> | null) =>
  Array.isArray(refs) ? refs.map(ref => `${ref.verse}: ${ref.excerpt || ''}`.trim()).join('\n') : '';

export default function AddStudyTool() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const editing = screenRoute.params?.tool as ChapterStudyToolItem | undefined;

  const [bookName, setBookName] = useState('Genesis');
  const [chapter, setChapter] = useState('1');
  const [toolType, setToolType] = useState<ToolType>('COMMAND');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [verseRefs, setVerseRefs] = useState('');
  const [strongsIds, setStrongsIds] = useState('');
  const [order, setOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setBookName(editing.bookName || 'Genesis');
    setChapter(String(editing.chapter || 1));
    setToolType(editing.toolType || 'COMMAND');
    setLabel(editing.label || '');
    setDescription(editing.description || '');
    setVerseRefs(formatVerseRefs(editing.verseRefs));
    setStrongsIds(Array.isArray(editing.strongsIds) ? editing.strongsIds.join(', ') : '');
    setOrder(String(editing.order ?? 0));
  }, [editing]);

  const handleSave = async () => {
    const parsedChapter = Number(chapter);
    const parsedOrder = Number(order);
    const parsedVerseRefs = parseVerseRefs(verseRefs);
    if (!bookName.trim() || !Number.isFinite(parsedChapter) || parsedChapter <= 0 || !label.trim() || !parsedVerseRefs.length) {
      showToast('error', 'Book, chapter, label, and at least one verse reference are required');
      return;
    }

    setSaving(true);
    try {
      const existing = await getAllAdminStudyTools({ bookName, chapter: parsedChapter, pageSize: 200 });
      const strongs = strongsIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      const nextItem = {
        toolType,
        label: label.trim(),
        description: description.trim() || null,
        verseRefs: parsedVerseRefs,
        strongsIds: strongs.length ? strongs : null,
        order: Number.isFinite(parsedOrder) ? parsedOrder : 0,
      };
      const preserved = (existing.data || [])
        .filter(item => !editing || item.id !== editing.id)
        .map(item => ({
          toolType: item.toolType,
          label: item.label,
          description: item.description,
          verseRefs: item.verseRefs,
          strongsIds: item.strongsIds,
          order: item.order,
        }));
      await upsertChapterStudyTools(bookName, parsedChapter, [...preserved, nextItem]);
      showToast('success', editing ? 'Study tool updated' : 'Study tool created');
      navigation.goBack();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save study tool');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit Study Tool' : 'Add Study Tool'}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Book *</Text>
        <View style={styles.grid}>
          {BIBLE_BOOKS.map(book => (
            <TouchableOpacity key={book} style={[styles.chip, bookName === book && styles.chipActive]} onPress={() => setBookName(book)}>
              <Text style={[styles.chipText, bookName === book && styles.chipTextActive]}>{book}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Chapter *" value={chapter} onChangeText={setChapter} keyboardType="number-pad" styles={styles} colors={COLORS} />

        <Text style={styles.label}>Tool Type *</Text>
        <View style={styles.grid}>
          {TOOL_TYPE_ORDER.map(type => (
            <TouchableOpacity key={type} style={[styles.chip, toolType === type && styles.chipActive]} onPress={() => setToolType(type)}>
              <Text style={[styles.chipText, toolType === type && styles.chipTextActive]}>{TOOL_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Label *" value={label} onChangeText={setLabel} placeholder="God said, Let there be light" styles={styles} colors={COLORS} />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Brief explanation for readers" multiline styles={styles} colors={COLORS} />
        <Field label="Verse References *" value={verseRefs} onChangeText={setVerseRefs} placeholder={'1: In the beginning...\n3: Let there be light'} multiline styles={styles} colors={COLORS} />
        <Field label="Strong's IDs" value={strongsIds} onChangeText={setStrongsIds} placeholder="7225, 430" styles={styles} colors={COLORS} />
        <Field label="Order" value={order} onChangeText={setOrder} keyboardType="number-pad" styles={styles} colors={COLORS} />

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Save size={18} color="#fff" />}
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Study Tool'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  fieldWrap: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBackground },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  saveButton: { marginTop: 8, height: 52, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
