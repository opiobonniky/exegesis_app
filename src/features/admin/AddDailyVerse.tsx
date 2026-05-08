/**
 * AddDailyVerse.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Add/Edit daily verse - standalone screen with searchable pickers
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDailyVerse, DailyVerse } from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  BookOpen,
  Sun,
  Save,
  Calendar,
  Lightbulb,
  Search,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import { getChaptersForBook, getVerseText, getVersesForChapter } from '../../utilits/bibleUtils';

const TESTAMENTS = [
  { value: 'Old', label: 'Old Testament' },
  { value: 'New', label: 'New Testament' },
];

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

const getTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background,
    surface: colors.surface,
    cardBackground: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    muted: colors.muted,
    primary: colors.primary,
    success: colors.success,
  };
};

const AddDailyVerse: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const styles = getStyles(theme);

  const editingVerse = route.params?.verse as DailyVerse | undefined;
  const isEditing = !!editingVerse;

  const [testament, setTestament] = useState('');
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [reflection, setReflection] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  const [verseText, setVerseText] = useState('');

  // Pre-fill for editing
  useEffect(() => {
    if (editingVerse) {
      const isOldTestament = BIBLE_BOOKS.slice(0, 39).includes(editingVerse.bookName);
      setTestament(isOldTestament ? 'Old' : 'New');
      setBookName(editingVerse.bookName);
      setChapter(String(editingVerse.chapter));
      setVerseNumber(String(editingVerse.verseNumber));
      setReflection(editingVerse.reflection || '');
      setDisplayDate(new Date(editingVerse.displayDate));
      setPublished(editingVerse.isPublished);
      const text = getVerseText(editingVerse.bookName, editingVerse.chapter, editingVerse.verseNumber);
      setVerseText(text || '');
    }
  }, [editingVerse]);

  // Picker modals
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [chapterPickerVisible, setChapterPickerVisible] = useState(false);
  const [versePickerVisible, setVersePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  const books = testament 
    ? TESTAMENTS.find(t => t.value === testament)?.value === 'Old'
      ? BIBLE_BOOKS.slice(0, 39)
      : BIBLE_BOOKS.slice(39)
    : [];
  
  const filteredBooks = bookSearch
    ? books.filter((b: string) => b.toLowerCase().includes(bookSearch.toLowerCase()))
    : books;

  const chapterList = bookName ? getChaptersForBook(bookName) : [];
  const verseList = (bookName && chapter)
    ? Object.keys(getVersesForChapter(bookName, parseInt(chapter))).map(Number)
    : [];

  useEffect(() => {
    if (bookName && chapter && verseNumber) {
      const text = getVerseText(bookName, parseInt(chapter), parseInt(verseNumber)) || '';
      setVerseText(text);
    } else {
      setVerseText('');
    }
  }, [bookName, chapter, verseNumber]);

  const handleSave = async () => {
    if (!bookName || !chapter || !verseNumber || !reflection.trim()) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        bookName,
        chapter: parseInt(chapter),
        verseNumber: parseInt(verseNumber),
        verseText: verseText || null,
        displayDate: displayDate.toISOString().split('T')[0],
        reflection,
        published,
      };

      if (isEditing && editingVerse?.id) {
        await addDailyVerse(payload, editingVerse.id);
        showToast('success', 'Daily verse updated!');
      } else {
        await addDailyVerse(payload);
        showToast('success', 'Daily verse added!');
      }
      navigation.goBack();
    } catch (error) {
      showToast('error', isEditing ? 'Failed to update verse' : 'Failed to add verse');
    } finally {
      setSaving(false);
    }
  };

  const resetBook = () => {
    setBookName('');
    setChapter('');
    setVerseNumber('');
    setVerseText('');
    setBookSearch('');
  };

  const resetChapter = () => {
    setChapter('');
    setVerseNumber('');
    setVerseText('');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setDatePickerVisible(Platform.OS === 'ios');
    if (selectedDate) {
      setDisplayDate(selectedDate);
    }
  };

  const renderModalContent = (
    title: string,
    data: any[],
    renderItem: (item: any) => React.ReactNode,
    onSelect: (item: any) => void,
    searchPlaceholder?: string,
  ) => (
    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
      <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
        <TouchableOpacity onPress={() => {
          if (title === 'Select Book') setBookPickerVisible(false);
          else if (title === 'Select Chapter') setChapterPickerVisible(false);
          else if (title === 'Select Verse') setVersePickerVisible(false);
        }}>
          <X size={24} color={theme.muted} />
        </TouchableOpacity>
      </View>
      
      {searchPlaceholder && (
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Search size={20} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.muted}
            value={bookSearch}
            onChangeText={setBookSearch}
            autoFocus
          />
          {bookSearch.length > 0 && (
            <TouchableOpacity onPress={() => setBookSearch('')}>
              <X size={18} color={theme.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={data.slice(0, title === 'Select Book' ? 50 : data.length)}
        keyExtractor={(item, index) => String(item) + index}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pickerItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              onSelect(item);
              if (title === 'Select Book') setBookPickerVisible(false);
              else if (title === 'Select Chapter') setChapterPickerVisible(false);
              else if (title === 'Select Verse') setVersePickerVisible(false);
              if (title === 'Select Book') setBookSearch('');
            }}
          >
            {renderItem(item)}
            <ChevronRight size={18} color={theme.muted} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerList}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sun size={22} color={theme.primary} />
          <Text style={[styles.headerTitleText, { color: theme.text }]}>
              {isEditing ? 'Edit Daily Verse' : 'Add Daily Verse'}
            </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>
      <View style={[styles.gradient, { backgroundColor: theme.primary }]} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardHeader, { backgroundColor: theme.cardBackground }]}>
            <BookOpen size={22} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Verse Details</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Testament</Text>
              <View style={styles.optionsRow}>
                {TESTAMENTS.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.optionButton,
                      { borderColor: theme.border },
                      testament === t.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      setTestament(t.value);
                      resetBook();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        testament === t.value && { color: '#fff' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => testament && setBookPickerVisible(true)}
              disabled={!testament}
            >
              <View style={styles.selectorContent}>
                <BookOpen size={20} color={bookName ? theme.primary : theme.muted} />
                <Text style={[styles.selectorText, { color: bookName ? theme.text : theme.muted }]}>
                  {bookName || 'Select book'}
                </Text>
              </View>
              <ChevronDown size={20} color={theme.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => bookName && setChapterPickerVisible(true)}
              disabled={!bookName}
            >
              <View style={styles.selectorContent}>
                <Calendar size={20} color={chapter ? theme.primary : theme.muted} />
                <Text style={[styles.selectorText, { color: chapter ? theme.text : theme.muted }]}>
                  {chapter || 'Select chapter'}
                </Text>
              </View>
              <ChevronDown size={20} color={theme.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => chapter && setVersePickerVisible(true)}
              disabled={!chapter}
            >
              <View style={styles.selectorContent}>
                <Lightbulb size={20} color={verseNumber ? theme.primary : theme.muted} />
                <Text style={[styles.selectorText, { color: verseNumber ? theme.text : theme.muted }]}>
                  {verseNumber || 'Select verse'}
                </Text>
              </View>
              <ChevronDown size={20} color={theme.muted} />
            </TouchableOpacity>

            {verseText ? (
              <View style={[styles.verseCard, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
                <View style={styles.verseCardHeader}>
                  <Lightbulb size={18} color={theme.primary} />
                  <Text style={[styles.verseRef, { color: theme.primary }]}>
                    {bookName} {chapter}:{verseNumber}
                  </Text>
                </View>
                <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>
                  Verse Text <Text style={{ color: theme.muted, fontSize: 12 }}>(editable - override default)</Text>
                </Text>
                <TextInput
                  style={[styles.verseTextInput, { color: theme.text, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                  value={verseText}
                  onChangeText={setVerseText}
                  multiline
                  placeholder="Verse text (you can edit this)"
                  placeholderTextColor={theme.muted}
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setDatePickerVisible(true)}
            >
              <View style={styles.selectorContent}>
                <Calendar size={20} color={theme.primary} />
                <Text style={[styles.selectorText, { color: theme.text }]}>
                  {formatDate(displayDate)}
                </Text>
              </View>
              <ChevronDown size={20} color={theme.muted} />
            </TouchableOpacity>

            {datePickerVisible && (
              <DateTimePicker
                value={displayDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date(2020, 0, 1)}
                maximumDate={new Date(2026, 11, 31)}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Reflection <Text style={{ color: theme.primary }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                value={reflection}
                onChangeText={setReflection}
                placeholder="What does this verse mean to you today?"
                placeholderTextColor={theme.muted}
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={[styles.toggleRow, { backgroundColor: theme.cardBackground }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Published</Text>
                <Text style={[styles.toggleSub, { color: theme.muted }]}>Show to all users</Text>
              </View>
              <Switch
                value={published}
                onValueChange={setPublished}
                trackColor={{ false: theme.border, true: theme.success + '50' }}
                thumbColor={published ? theme.success : theme.muted}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: theme.primary },
                (saving || !verseText || !reflection.trim()) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !verseText || !reflection.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {isEditing ? 'Update Daily Verse' : 'Save Daily Verse'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={bookPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            'Select Book',
            filteredBooks,
            (b: string) => (
              <View style={styles.pickerItemContent}>
                <Text style={[styles.pickerItemText, { color: theme.text }]}>{b}</Text>
              </View>
            ),
            (b: string) => {
              setBookName(b);
              resetChapter();
            },
            'Search books...',
          )}
        </View>
      </Modal>

      <Modal visible={chapterPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            'Select Chapter',
            chapterList,
            (c: number) => (
              <View style={styles.pickerItemContent}>
                <Text style={[styles.pickerItemText, { color: theme.text }]}>Chapter {c}</Text>
              </View>
            ),
            (c: number) => {
              setChapter(String(c));
              setVerseNumber('');
              setVerseText('');
            },
          )}
        </View>
      </Modal>

      <Modal visible={versePickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            'Select Verse',
            verseList,
            (v: number) => (
              <View style={styles.pickerItemContent}>
                <Text style={[styles.pickerItemText, { color: theme.text }]}>Verse {v}</Text>
              </View>
            ),
            (v: number) => {
              setVerseNumber(String(v));
            },
          )}
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1,
    },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitleText: { fontSize: 20, fontWeight: '700' },
    gradient: { height: 4 },
    content: { flex: 1, padding: 16 },
    card: { borderRadius: 16, overflow: 'hidden' },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10,
    },
    cardTitle: { fontSize: 18, fontWeight: '700' },
    form: { padding: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    optionsRow: { flexDirection: 'row', gap: 12 },
    optionButton: {
      flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center',
    },
    optionText: { fontSize: 14, fontWeight: '600' },
    selectorBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12,
    },
    selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    selectorText: { fontSize: 16 },
    textArea: {
      minHeight: 140, textAlignVertical: 'top', borderRadius: 12, padding: 16, borderWidth: 1, fontSize: 15, lineHeight: 22,
    },
    toggleRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, borderRadius: 12, marginBottom: 16,
    },
    toggleLabel: { fontSize: 16, fontWeight: '600' },
    toggleSub: { fontSize: 12, marginTop: 2 },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 16, borderRadius: 12, gap: 10, marginBottom: 32,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    verseCard: {
      padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16,
    },
    verseCardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
    },
    verseRef: { fontSize: 13, fontWeight: '700' },
    verseText: { fontSize: 15, fontStyle: 'italic', lineHeight: 24 },
    verseTextInput: { fontSize: 15, fontStyle: 'italic', lineHeight: 24, padding: 12, borderRadius: 8, minHeight: 80, textAlignVertical: 'top' },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    modalContent: {
      maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    },
    modalTitleBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14,
      borderRadius: 12, borderWidth: 1, gap: 10,
    },
    searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
    pickerList: { paddingBottom: 32 },
    pickerItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1,
    },
    pickerItemContent: { flex: 1 },
    pickerItemText: { fontSize: 16, fontWeight: '500' },
  });

export default AddDailyVerse;