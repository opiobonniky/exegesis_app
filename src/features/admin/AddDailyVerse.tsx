/**
 * AddDailyVerse.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Add/Edit daily verse - standalone screen with searchable pickers
 * Supports translations and RTL layout (Arabic)
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
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDailyVerse, DailyVerse } from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sun,
  Save,
  Calendar,
  Lightbulb,
  Search,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import { getChaptersForBook, getVerseText, getVersesForChapter, setActiveVersion } from '../../utilits/bibleUtils';
import { BIBLE_VERSIONS } from '../../assets/bibleVersion/json/bibleVersions';
import ActionModal from '../../reusable/ActionModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

const TESTAMENTS = [
  { value: 'Old' },
  { value: 'New' },
];

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
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const styles = getStyles(theme, isRtl);
  const ac = translations?.admin;
  const bible = translations?.bible;

  const editingVerse = route.params?.verse as DailyVerse | undefined;
  const isEditing = !!editingVerse;

  const [testament, setTestament] = useState('');
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [explanation, setExplanation] = useState('');
  const [learnMore, setLearnMore] = useState('');
  const [bibleVersion, setBibleVersion] = useState('KJV');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictData, setConflictData] = useState<{ conflict: any; payload: any } | null>(null);

  const [verseText, setVerseText] = useState('');

  // Pre-fill for editing
  useEffect(() => {
    if (editingVerse) {
      const isOldTestament = BIBLE_BOOKS.slice(0, 39).includes(editingVerse.bookName);
      setTestament(isOldTestament ? 'Old' : 'New');
      setBookName(editingVerse.bookName);
      setChapter(String(editingVerse.chapter));
      setVerseNumber(String(editingVerse.verseNumber));
      setExplanation((editingVerse as any).explanation || '');
      setLearnMore((editingVerse as any).learnMore || '');
      setBibleVersion((editingVerse as any).bibleVersion || 'KJV');
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
  const [versionPickerVisible, setVersionPickerVisible] = useState(false);
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
      setActiveVersion(bibleVersion);
      const text = getVerseText(bookName, parseInt(chapter), parseInt(verseNumber)) || '';
      setVerseText(text);
    } else {
      setVerseText('');
    }
  }, [bookName, chapter, verseNumber, bibleVersion]);

  const handleSave = async () => {
    if (!bookName || !chapter || !verseNumber || !explanation.trim()) {
      showToast('error', ac?.dailyVerseFillRequired || 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        bookName,
        chapter: parseInt(chapter),
        verseNumber: parseInt(verseNumber),
        bibleVersion,
        displayDate: displayDate.toISOString().split('T')[0],
        explanation,
        learnMore: learnMore || null,
        published,
      };

      if (isEditing && editingVerse?.id) {
        const result = await addDailyVerse(payload, editingVerse.id);

       

        if (result.conflict) {
          showToast('warning', ac?.dailyVerseConflictUpdate || 'Updated existing verse instead');
        } else {
          showToast('success', ac?.dailyVerseUpdated || 'Daily verse updated!');
        }
        navigation.goBack();
        return;
      }

      const result = await addDailyVerse(payload);

      if (result.conflict) {
        setConflictData({ conflict: result.conflict[0], payload });
        setConflictModalVisible(true);
        setSaving(false);
        return;
      }

      showToast('success', ac?.dailyVerseAdded || 'Daily verse added!');
      navigation.goBack();
    } catch (error) {
      showToast('error', isEditing
        ? (ac?.dailyVerseFailedUpdate || 'Failed to update verse')
        : (ac?.dailyVerseFailedAdd || 'Failed to add verse'));
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
    const localeMap: Record<string, string> = { en: 'en-US', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[language] || 'en-US';
    return date.toLocaleDateString(locale, {
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

  const closeModal = (setter: (v: boolean) => void) => {
    setter(false);
    setBookSearch('');
  };

  const renderModalContent = (
    title: string,
    data: any[],
    renderItem: (item: any) => React.ReactNode,
    onSelect: (item: any) => void,
    onClose: () => void,
    searchPlaceholder?: string,
  ) => (
    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
      <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={theme.muted} />
        </TouchableOpacity>
      </View>
      
      {searchPlaceholder && (
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Search size={20} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}
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
        data={data.slice(0, title === (ac?.dailyVerseModalSelectBook || 'Select Book') ? 50 : data.length)}
        keyExtractor={(item, index) => String(item) + index}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pickerItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <View style={styles.pickerItemContent}>
              {renderItem(item)}
            </View>
            {isRtl ? (
              <ChevronLeft size={18} color={theme.muted} />
            ) : (
              <ChevronRight size={18} color={theme.muted} />
            )}
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerList}
      />
    </View>
  );

  // Convenience close callbacks for each modal
  const closeBookPicker = () => closeModal(setBookPickerVisible);
  const closeChapterPicker = () => closeModal(setChapterPickerVisible);
  const closeVersePicker = () => closeModal(setVersePickerVisible);
  const closeVersionPicker = () => closeModal(setVersionPickerVisible);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          {isRtl ? (
            <ChevronRight size={24} color={theme.primary} />
          ) : (
            <ChevronLeft size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sun size={22} color={theme.primary} />
          <Text style={[styles.headerTitleText, { color: theme.text }]}>
            {isEditing
              ? (ac?.dailyVerseEditTitle || 'Edit Daily Verse')
              : (ac?.dailyVerseAddTitle || 'Add Daily Verse')}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>
      <View style={[styles.gradient, { backgroundColor: theme.primary }]} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardHeader, { backgroundColor: theme.cardBackground }]}>
            <BookOpen size={22} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {ac?.dailyVerseDetails || 'Verse Details'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.dailyVerseTestament || 'Testament'}
              </Text>
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
                      {t.value === 'Old'
                        ? (bible?.oldTestament || 'Old Testament')
                        : (bible?.newTestament || 'New Testament')}
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
                  {bookName || (ac?.dailyVerseSelectBook || 'Select book')}
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
                  {chapter
                    ? `${ac?.dailyVerseChapter || 'Chapter'} ${chapter}`
                    : (ac?.dailyVerseSelectChapter || 'Select chapter')}
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
                  {verseNumber
                    ? `${ac?.dailyVerseVerse || 'Verse'} ${verseNumber}`
                    : (ac?.dailyVerseSelectVerse || 'Select verse')}
                </Text>
              </View>
              <ChevronDown size={20} color={theme.muted} />
            </TouchableOpacity>

            {/* Bible Version Selector */}
            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setVersionPickerVisible(true)}
            >
              <View style={styles.selectorContent}>
                <BookOpen size={20} color={theme.primary} />
                <Text style={[styles.selectorText, { color: theme.text }]}>
                  {BIBLE_VERSION_OPTIONS.find(v => v.value === bibleVersion)?.label || (ac?.dailyVerseSelectVersion || 'Select Bible Version')}
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
                <Text style={[styles.label, { color: theme.text, marginBottom: 8, textAlign: isRtl ? 'right' : 'left' }]}>
                  {ac?.dailyVerseVerseText || 'Verse Text'}{' '}
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    ({ac?.dailyVerseReadOnly || 'read only'})
                  </Text>
                </Text>
                <TextInput
                  style={[styles.verseTextInput, { color: theme.text, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', textAlign: isRtl ? 'right' : 'left' }]}
                  value={verseText}
                  onChangeText={setVerseText}
                  multiline
                  placeholder={ac?.dailyVerseVerseTextPlaceholder || 'Verse text'}
                  placeholderTextColor={theme.muted}
                  editable={false}
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
              <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.dailyVerseExplanation || 'Explanation'}{' '}
                <Text style={{ color: theme.primary }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}
                value={explanation}
                onChangeText={setExplanation}
                placeholder={ac?.dailyVerseExplanationPlaceholder || 'Explain what this verse means and its significance...'}
                placeholderTextColor={theme.muted}
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.dailyVerseLearnMore || 'Learn More'}{' '}
                <Text style={{ color: theme.muted }}>
                  ({ac?.dailyVerseOptional || 'optional'})
                </Text>
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}
                value={learnMore}
                onChangeText={setLearnMore}
                placeholder={ac?.dailyVerseLearnMorePlaceholder || 'Additional resources, related verses, or deeper insights...'}
                placeholderTextColor={theme.muted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>
                  {ac?.dailyVersePublished || 'Published'}
                </Text>
                <Text style={[styles.toggleSub, { color: theme.muted }]}>
                  {ac?.dailyVerseShowToAll || 'Show to all users'}
                </Text>
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
                (saving || !verseText || !explanation.trim()) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !verseText || !explanation.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {isEditing
                      ? (ac?.dailyVerseUpdate || 'Update Daily Verse')
                      : (ac?.dailyVerseSave || 'Save Daily Verse')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Book Picker Modal */}
      <Modal visible={bookPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            ac?.dailyVerseModalSelectBook || 'Select Book',
            filteredBooks,
            (b: string) => (
              <Text style={[styles.pickerItemText, { color: theme.text }]}>{b}</Text>
            ),
            (b: string) => {
              setBookName(b);
              resetChapter();
            },
            closeBookPicker,
            ac?.dailyVerseSearchBooks || 'Search books...',
          )}
        </View>
      </Modal>

      {/* Chapter Picker Modal */}
      <Modal visible={chapterPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            ac?.dailyVerseModalSelectChapter || 'Select Chapter',
            chapterList,
            (c: number) => (
              <Text style={[styles.pickerItemText, { color: theme.text }]}>
                {ac?.dailyVerseChapter || 'Chapter'} {c}
              </Text>
            ),
            (c: number) => {
              setChapter(String(c));
              setVerseNumber('');
              setVerseText('');
            },
            closeChapterPicker,
          )}
        </View>
      </Modal>

      {/* Verse Picker Modal */}
      <Modal visible={versePickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            ac?.dailyVerseModalSelectVerse || 'Select Verse',
            verseList,
            (v: number) => (
              <Text style={[styles.pickerItemText, { color: theme.text }]}>
                {ac?.dailyVerseVerse || 'Verse'} {v}
              </Text>
            ),
            (v: number) => {
              setVerseNumber(String(v));
            },
            closeVersePicker,
          )}
        </View>
      </Modal>

      {/* Bible Version Picker Modal */}
      <Modal visible={versionPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          {renderModalContent(
            ac?.dailyVerseModalSelectVersion || 'Select Bible Version',
            BIBLE_VERSION_OPTIONS,
            (v: { value: string; label: string }) => (
              <Text style={[styles.pickerItemText, { color: theme.text }]}>{v.label}</Text>
            ),
            (v: { value: string; label: string }) => {
              setBibleVersion(v.value);
              setVersionPickerVisible(false);
            },
            closeVersionPicker,
          )}
        </View>
      </Modal>

      <ActionModal
        visible={conflictModalVisible}
        title={ac?.dailyVerseConflictTitle || 'Verse Already Exists'}
        message={
          conflictData
            ? (conflictData.conflict.type === 'date'
                ? (ac?.dailyVerseConflictDateMsg || 'A verse already exists for this date ({ref}). Update it?')
                    .replace('{ref}', `${conflictData.conflict.existing.bookName} ${conflictData.conflict.existing.chapter}:${conflictData.conflict.existing.verseNumber}`)
                : (ac?.dailyVerseConflictRefMsg || 'This verse ({ref}) already exists for another date. Update the existing one?')
                    .replace('{ref}', `${conflictData.conflict.existing.bookName} ${conflictData.conflict.existing.chapter}:${conflictData.conflict.existing.verseNumber}`))
            : ''
        }
        severity="warning"
        cancelLabel={bible?.cancel || 'Cancel'}
        extraLabel={ac?.dailyVerseViewExisting || 'View Existing'}
        confirmLabel={ac?.dailyVerseConflictUpdate || 'Update'}
        onCancel={() => {
          setConflictModalVisible(false);
          setConflictData(null);
        }}
        onExtra={() => {
          setConflictModalVisible(false);
          setConflictData(null);
          setSaving(false);
          navigation.goBack();
        }}
        onConfirm={async () => {
          if (!conflictData) return;
          const { conflict, payload } = conflictData;
          setConflictModalVisible(false);
          setConflictData(null);
          try {
            const updateResult = await addDailyVerse({ ...payload }, conflict.existing.id);
            if (updateResult) {
              showToast('success', ac?.dailyVerseUpdated || 'Daily verse updated!');
              navigation.goBack();
            }
          } catch {
            showToast('error', ac?.dailyVerseFailedUpdate || 'Failed to update verse');
            setSaving(false);
          }
        }}
        closeOnBackdrop={false}
      />
    </SafeAreaView>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>, isRtl: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitleText: { fontSize: 20, fontWeight: '700' },
    gradient: { height: 4 },
    content: { flex: 1, padding: 16 },
    card: { borderRadius: 16, overflow: 'hidden' },
    cardHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      padding: 16,
      gap: 10,
    },
    cardTitle: { fontSize: 18, fontWeight: '700' },
    form: { padding: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    optionsRow: { flexDirection: isRtl ? 'row-reverse' : 'row', gap: 12 },
    optionButton: {
      flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center',
    },
    optionText: { fontSize: 14, fontWeight: '600' },
    selectorBtn: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12,
    },
    selectorContent: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectorText: { fontSize: 16 },
    textArea: {
      minHeight: 140, textAlignVertical: 'top', borderRadius: 12, padding: 16, borderWidth: 1, fontSize: 15, lineHeight: 22,
    },
    toggleRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.cardBackground,
    },
    toggleLabel: { fontSize: 16, fontWeight: '600' },
    toggleSub: { fontSize: 12, marginTop: 2 },
    saveBtn: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 10,
      marginBottom: 32,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    verseCard: {
      padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16,
    },
    verseCardHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
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
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    searchBar: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
    },
    searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
    pickerList: { paddingBottom: 32 },
    pickerItem: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
    },
    pickerItemContent: { flex: 1 },
    pickerItemText: { fontSize: 16, fontWeight: '500' },
  });

export default AddDailyVerse;
