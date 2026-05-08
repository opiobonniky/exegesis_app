/**
 * JournalEntry.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Create or edit journal entry screen
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import {
  createJournalEntry,
  updateJournalEntry,
  getJournalEntry,
  JournalEntry,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import {
  ArrowLeft,
  Save,
  BookOpen,
  X,
} from 'lucide-react-native';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'study', label: 'Study' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'gratitude', label: 'Gratitude' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'application', label: 'Application' },
];

const MOODS = [
  { value: 'happy', label: '😊 Happy' },
  { value: 'grateful', label: '🙏 Grateful' },
  { value: 'peaceful', label: '🕊️ Peaceful' },
  { value: 'thoughtful', label: '🤔 Thoughtful' },
  { value: 'motivated', label: '💪 Motivated' },
  { value: 'hopeful', label: '🌟 Hopeful' },
  { value: 'challenged', label: '🧗 Challenged' },
  { value: 'blessed', label: '✨ Blessed' },
];

const JournalEntryScreen = () => {
  const navigation = useNavigation<any>();
  const routeParams = useRoute() as any;
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);

  const entryId = routeParams?.params?.entryId;
  const isEditMode = !!entryId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [mood, setMood] = useState('');
  const [prayers, setPrayers] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [learnings, setLearnings] = useState('');
  const [application, setApplication] = useState('');
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadEntry();
    } else {
      const params = routeParams?.params || {};
      if (params.bookName) {
        setBookName(params.bookName);
      }
      if (params.chapter) {
        setChapter(String(params.chapter));
      }
      if (params.verseStart !== undefined) {
        const verseStr = params.verseEnd !== undefined && params.verseEnd !== params.verseStart
          ? `${params.verseStart}-${params.verseEnd}`
          : String(params.verseStart);
        setVerseNumber(verseStr);
      }
    }
  }, [entryId]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      const res = await getJournalEntry(entryId);
      if (res.returnCode === 200 && res.returnData) {
        const entry = res.returnData;
        setTitle(entry.title || '');
        setContent(entry.content);
        setCategory(entry.category || 'general');
        setMood(entry.mood || '');
        setPrayers(entry.prayers || '');
        setGratitude(entry.gratitude || '');
        setLearnings(entry.learnings || '');
        setApplication(entry.application || '');
        setBookName(entry.bookName || '');
        if (entry.chapter) setChapter(String(entry.chapter));
        if (entry.verseNumber) setVerseNumber(String(entry.verseNumber));
      }
    } catch (error) {
      showToast('error', 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showToast('error', 'Please write some content');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        content: content.trim(),
        category,
      };

      if (title.trim()) data.title = title.trim();
      if (mood) data.mood = mood;
      if (prayers.trim()) data.prayers = prayers.trim();
      if (gratitude.trim()) data.gratitude = gratitude.trim();
      if (learnings.trim()) data.learnings = learnings.trim();
      if (application.trim()) data.application = application.trim();
      if (bookName.trim()) data.bookName = bookName.trim();
      if (chapter) data.chapter = parseInt(chapter, 10);
      if (verseNumber) data.verseNumber = parseInt(verseNumber, 10);

      let res;
      if (isEditMode) {
        data.id = entryId;
        res = await updateJournalEntry(data);
      } else {
        res = await createJournalEntry(data);
      }

      if (res.returnCode === 200) {
        showToast('success', isEditMode ? 'Entry updated' : 'Entry saved');
        navigation.goBack();
      } else {
        showToast('error', res.returnMessage || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    multiline = false,
    placeholder?: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            color: COLORS.text,
          },
          multiline && { minHeight: 100, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>
          {isEditMode ? 'Edit Entry' : 'New Entry'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: COLORS.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        {renderInput('Title (optional)', title, setTitle, false, 'Give your entry a title...')}

        {/* Content */}
        {renderInput(
          'What\'s on your mind? *',
          content,
          setContent,
          true,
          'Write your thoughts, reflections, or prayers...'
        )}

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: category === cat.value ? COLORS.primary : COLORS.surface,
                      borderColor: category === cat.value ? COLORS.primary : COLORS.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: category === cat.value ? '#FFFFFF' : COLORS.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Mood */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>How are you feeling?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: mood === m.value ? COLORS.primary + '20' : COLORS.surface,
                      borderColor: mood === m.value ? COLORS.primary : COLORS.border,
                    },
                  ]}
                  onPress={() => setMood(mood === m.value ? '' : m.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: mood === m.value ? COLORS.primary : COLORS.text },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Scripture Reference */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
            Scripture Reference (optional)
          </Text>
          <View style={styles.scriptureRow}>
            <TextInput
              style={[
                styles.scriptureInput,
                {
                  backgroundColor: COLORS.surface,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                },
              ]}
              value={bookName}
              onChangeText={setBookName}
              placeholder="Book"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={[
                styles.chapterInput,
                {
                  backgroundColor: COLORS.surface,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                },
              ]}
              value={chapter}
              onChangeText={setChapter}
              placeholder="Ch"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
            <TextInput
              style={[
                styles.chapterInput,
                {
                  backgroundColor: COLORS.surface,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                },
              ]}
              value={verseNumber}
              onChangeText={setVerseNumber}
              placeholder="Vs"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Prompt-based sections */}
        {renderInput('Gratitude', gratitude, setGratitude, true, 'What are you grateful for today?')}
        {renderInput('Learnings', learnings, setLearnings, true, 'What did you learn?')}
        {renderInput('Application', application, setApplication, true, 'How will you apply this?')}
        {renderInput('Prayer Requests', prayers, setPrayers, true, 'What do you want to pray for?')}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  scriptureRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  scriptureInput: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  chapterInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});

export default JournalEntryScreen;