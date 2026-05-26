/**
 * AddDailyDevotion.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Add/Edit daily devotion - standalone screen
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
  Modal,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDailyDevotion, DailyDevotion } from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Save,
  Calendar,
  Search,
  X,
  ChevronDown,
  BookOpen,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import { BIBLE_VERSIONS } from '../../assets/bibleVersion/json/bibleVersions';
import { getVerseText, setActiveVersion } from '../../utilits/bibleUtils';
import { useLanguage } from '../../component/language-translation/LanguageProvider';

const BIBLE_VERSION_OPTIONS = BIBLE_VERSIONS.map(v => ({
  value: v.id,
  label: `${v.name} (${v.abbreviation})`,
}));

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

const getDateLocale = (language: string): string => {
  switch (language) {
    case 'ar': return 'ar-SA';
    case 'fr': return 'fr-FR';
    case 'es': return 'es-ES';
    default: return 'en-US';
  }
};

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

const AddDailyDevotion: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const { language, translations } = useLanguage();
  const isRtl = language === 'ar';
  const ac = translations?.admin;
  const theme = getTheme(isDark);
  const styles = getStyles(theme, isRtl);

  const editingDevotion = route.params?.devotion as DailyDevotion | undefined;
  const isEditing = !!editingDevotion;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [bibleVersion, setBibleVersion] = useState('KJV');
  const [verseText, setVerseText] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pre-fill for editing
  useEffect(() => {
    if (editingDevotion) {
      setTitle(editingDevotion.title);
      setContent(editingDevotion.content);
      setBookName(editingDevotion.bookName || '');
      setChapter(editingDevotion.chapter ? String(editingDevotion.chapter) : '');
      setVerseNumber(editingDevotion.verseNumber ? String(editingDevotion.verseNumber) : '');
      setDisplayDate(new Date(editingDevotion.displayDate));
      setPublished(editingDevotion.isPublished);
      setBibleVersion((editingDevotion as any).bibleVersion || 'KJV');
    }
  }, [editingDevotion]);

  useEffect(() => {
    if (bookName && chapter && verseNumber) {
      setActiveVersion(bibleVersion);
      const text = getVerseText(bookName, parseInt(chapter), parseInt(verseNumber)) || '';
      setVerseText(text);
    } else {
      setVerseText('');
    }
  }, [bookName, chapter, verseNumber, bibleVersion]);

  // Picker modals
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [versionPickerVisible, setVersionPickerVisible] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  const filteredBooks = bookSearch
    ? BIBLE_BOOKS.filter((b: string) => b.toLowerCase().includes(bookSearch.toLowerCase()))
    : BIBLE_BOOKS;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(getDateLocale(language), {
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

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('error', ac?.addDevotionFillRequired || 'Please fill in title and content');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        content,
        bookName: bookName || null,
        chapter: chapter ? parseInt(chapter) : null,
        verseNumber: verseNumber ? parseInt(verseNumber) : null,
        bibleVersion: bookName ? bibleVersion : null,
        displayDate: displayDate.toISOString().split('T')[0],
        published,
      };

      if (isEditing && editingDevotion?.id) {
        await addDailyDevotion(payload, editingDevotion.id);
        showToast('success', ac?.addDevotionUpdated || 'Daily devotion updated!');
      } else {
        await addDailyDevotion(payload);
        showToast('success', ac?.addDevotionAdded || 'Daily devotion added!');
      }
      navigation.goBack();
    } catch (error) {
      showToast('error', isEditing
        ? (ac?.addDevotionFailedUpdate || 'Failed to update devotion')
        : (ac?.addDevotionFailedAdd || 'Failed to add devotion'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          {isRtl ? <ChevronRight size={24} color={theme.primary} /> : <ChevronLeft size={24} color={theme.primary} />}
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
          {isEditing
            ? (ac?.addDevotionEditTitle || 'Edit Devotion')
            : (ac?.addDevotionTitle || 'Add Devotion')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.addDevotionTitleLabel || 'Title'} <Text style={{ color: theme.primary }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border, textAlign: isRtl ? 'right' : 'left' }]}
            value={title}
            onChangeText={setTitle}
            placeholder={ac?.addDevotionTitlePlaceholder || 'Enter devotion title...'}
            placeholderTextColor={theme.muted}
          />
        </View>

        {/* Content */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.addDevotionContentLabel || 'Content'} <Text style={{ color: theme.primary }}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border, textAlign: isRtl ? 'right' : 'left' }]}
            value={content}
            onChangeText={setContent}
            placeholder={ac?.addDevotionContentPlaceholder || 'Write your devotional message...'}
            placeholderTextColor={theme.muted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Optional Bible Reference */}
        <Text style={[styles.sectionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
          {ac?.addDevotionOptionalBibleRef || 'Optional Bible Reference'}
        </Text>

        <TouchableOpacity
          style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setBookPickerVisible(true)}
        >
          <View style={styles.selectorContent}>
            <BookOpen size={20} color={bookName ? theme.primary : theme.muted} />
            <Text style={[styles.selectorText, { color: bookName ? theme.text : theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {bookName || (ac?.addDevotionSelectBook || 'Select book (optional)')}
            </Text>
          </View>
          <ChevronDown size={20} color={theme.muted} />
        </TouchableOpacity>

        {bookName ? (
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.addDevotionChapterLabel || 'Chapter'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border, textAlign: isRtl ? 'right' : 'left' }]}
                value={chapter}
                onChangeText={setChapter}
                placeholder={ac?.addDevotionChapterLabel || 'Chapter'}
                placeholderTextColor={theme.muted}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.addDevotionVerseLabel || 'Verse'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border, textAlign: isRtl ? 'right' : 'left' }]}
                value={verseNumber}
                onChangeText={setVerseNumber}
                placeholder={ac?.addDevotionVerseLabel || 'Verse'}
                placeholderTextColor={theme.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : null}

        {bookName ? (
          <TouchableOpacity
            style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setVersionPickerVisible(true)}
          >
            <View style={styles.selectorContent}>
              <BookOpen size={20} color={theme.primary} />
              <Text style={[styles.selectorText, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {BIBLE_VERSION_OPTIONS.find(v => v.value === bibleVersion)?.label || (ac?.addDevotionSelectVersion || 'Select version')}
              </Text>
            </View>
            <ChevronDown size={20} color={theme.muted} />
          </TouchableOpacity>
        ) : null}

        {verseText ? (
          <View style={[styles.versePreview, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.versePreviewLabel, { color: theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {ac?.addDevotionVersePreview || 'Verse Preview:'}
            </Text>
            <Text style={[styles.versePreviewText, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>"{verseText}"</Text>
          </View>
        ) : null}

        {/* Date */}
        <TouchableOpacity
          style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setDatePickerVisible(true)}
        >
          <View style={styles.selectorContent}>
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.selectorText, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
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

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: theme.primary },
            (saving || !title.trim() || !content.trim()) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isEditing
                  ? (ac?.addDevotionUpdate || 'Update Devotion')
                  : (ac?.addDevotionSave || 'Add Devotion')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Book Picker Modal */}
      <Modal visible={bookPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.addDevotionModalSelectBook || 'Select Book'}
              </Text>
              <TouchableOpacity onPress={() => setBookPickerVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Search size={20} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}
                value={bookSearch}
                onChangeText={setBookSearch}
                placeholder={ac?.addDevotionSearchBooks || 'Search books...'}
                placeholderTextColor={theme.muted}
              />
            </View>

            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setBookName(item);
                    setChapter('');
                    setVerseNumber('');
                    setBookPickerVisible(false);
                    setBookSearch('');
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Version Picker Modal */}
      <Modal visible={versionPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.addDevotionModalSelectVersion || 'Select Bible Version'}
              </Text>
              <TouchableOpacity onPress={() => setVersionPickerVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={BIBLE_VERSION_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setBibleVersion(item.value);
                    setVersionPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>, isRtl: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    backBtn: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
    },
    textArea: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
      minHeight: 200,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      marginTop: 8,
    },
    selectorBtn: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    selectorContent: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectorText: {
      fontSize: 16,
    },
    rowInputs: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      gap: 12,
      marginBottom: 16,
    },
    halfInput: {
      flex: 1,
    },
    saveBtn: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 10,
      marginTop: 20,
      marginBottom: 32,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      maxHeight: '85%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    modalTitleBar: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
    },
    pickerItem: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
    },
    pickerItemText: {
      fontSize: 16,
    },
    versePreview: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    versePreviewLabel: {
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    versePreviewText: {
      fontSize: 14,
      fontStyle: 'italic',
      lineHeight: 20,
    },
  });

export default AddDailyDevotion;
