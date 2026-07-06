/**
 * JournalEntry.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Create or edit journal entry screen
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useLanguage,
  isRtlLanguage,
} from '../../component/language-translation/LanguageProvider';
import {
  createJournalEntry,
  updateJournalEntry,
  getJournalEntry,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import { useSessionSync } from '../../hooks/useSessionSync';
import {
  Save,
  ChevronLeft,
  ChevronRight,
  Tag,
  Globe,
  Lock,
} from 'lucide-react-native';

const CATEGORIES = [
  { value: 'general' },
  { value: 'study' },
  { value: 'prayer' },
  { value: 'gratitude' },
  { value: 'reflection' },
  { value: 'application' },
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

const getCategoryLabel = (value: string, jc: any): string => {
  const labels: Record<string, string> = {
    general: jc?.categoryGeneral || 'General',
    study: jc?.categoryStudy || 'Study',
    prayer: jc?.categoryPrayer || 'Prayer',
    gratitude: jc?.categoryGratitude || 'Gratitude',
    reflection: jc?.categoryReflection || 'Reflection',
    application: jc?.categoryApplication || 'Application',
  };
  return labels[value] || value;
};

const JournalEntryScreen = () => {
  const navigation = useNavigation<any>();
  const routeParams = useRoute() as any;
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const entryId = routeParams?.params?.entryId;
  const isEditMode = !!entryId;
  const { syncing, syncJournalEntry } = useSessionSync({
    sessionId: routeParams?.params?.sessionId,
  });

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
  const [tags, setTags] = useState('');
  const [strongsWords, setStrongsWords] = useState<string | undefined>(
    undefined,
  );
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadEntry = useCallback(async () => {
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
        setTags(entry.tags || '');
        setStrongsWords(entry.strongsWords || undefined);
        if (entry.isPublished !== undefined) setIsPublished(entry.isPublished);
        setBookName(entry.bookName || '');
        if (entry.chapter) setChapter(String(entry.chapter));
        if (entry.verseNumber) setVerseNumber(String(entry.verseNumber));
      }
    } catch {
      showToast('error', jc?.failedToLoadEntry || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  }, [entryId, jc?.failedToLoadEntry]);

  useEffect(() => {
    if (isEditMode) {
      loadEntry();
    } else {
      const params = routeParams?.params || {};
      if (params.bookName) {
        setBookName(params.bookName);
      }
      if (params.title) {
        setTitle(params.title);
      }
      if (
        params.category &&
        CATEGORIES.some(item => item.value === params.category)
      ) {
        setCategory(params.category);
      }
      if (params.chapter) {
        setChapter(String(params.chapter));
      }
      if (params.verseStart !== undefined) {
        const verseStr =
          params.verseEnd !== undefined && params.verseEnd !== params.verseStart
            ? `${params.verseStart}-${params.verseEnd}`
            : String(params.verseStart);
        setVerseNumber(verseStr);
      }
      // Pre-fill from Exegesis Lab
      if (params.reflection) setContent(params.reflection);
      if (params.prayers) setPrayers(params.prayers);
      if (params.application) setApplication(params.application);
      if (params.tags) setTags(params.tags);
      if (params.strongsWords) setStrongsWords(params.strongsWords);
      if (params.isPublic !== undefined) setIsPublished(params.isPublic);
      if (params.passageRef && !params.title) {
        // Auto-title from passage reference
        setTitle(`Exegesis: ${params.passageRef}`);
      }
    }
  }, [isEditMode, loadEntry, routeParams?.params]);

  const handleSave = async () => {
    if (!content.trim()) {
      showToast('error', jc?.contentEmptyError || 'Please write some content');
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
      if (tags.trim()) data.tags = tags.trim();
      if (strongsWords) data.strongsWords = strongsWords;
      if (isPublished !== undefined) data.isPublished = isPublished;
      if (!isEditMode && routeParams?.params?.source) {
        data.source = routeParams.params.source;
      }

      let res;
      if (isEditMode) {
        data.id = entryId;
        res = await updateJournalEntry(data);
      } else {
        res = await createJournalEntry(data);
      }

      if (res.returnCode === 200) {
        showToast(
          'success',
          isEditMode
            ? jc?.entryUpdated || 'Entry updated'
            : jc?.entrySaved || 'Entry saved',
        );

        // Sync journal entry ID back to Lab session (if applicable)
        if (!isEditMode && res.returnData?.id) {
          await syncJournalEntry(res.returnData.id);
        }

        const returnTo = routeParams?.params?.returnTo;
        if (returnTo) {
          navigation.navigate(returnTo);
        } else {
          navigation.goBack();
        }
      } else {
        showToast(
          'error',
          res.returnMessage || jc?.failedToSave || 'Failed to save',
        );
      }
    } catch {
      showToast('error', jc?.failedToSave || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    multiline = false,
    placeholder?: string,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
        {label}
      </Text>
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
        placeholderTextColor={COLORS.muted}
        multiline={multiline}
        textAlign={isRtl ? 'right' : 'left'}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: COLORS.surface,
              flexDirection: isRtl ? 'row-reverse' : 'row',
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            {isRtl ? (
              <ChevronRight size={24} color={COLORS.text} />
            ) : (
              <ChevronLeft size={24} color={COLORS.text} />
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>
            {isEditMode
              ? jc?.editEntry || 'Edit Entry'
              : jc?.newEntry || 'New Entry'}
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: COLORS.primary,
                marginRight: isRtl ? 0 : undefined,
              },
            ]}
            onPress={handleSave}
            disabled={saving || syncing || loading}
          >
            <Save size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          {renderInput(
            jc?.titleOptional || 'Title (optional)',
            title,
            setTitle,
            false,
            jc?.titlePlaceholder || 'Give your entry a title...',
          )}

          {/* Content */}
          {renderInput(
            jc?.contentPlaceholder || "What's on your mind? *",
            content,
            setContent,
            true,
            jc?.contentRequired ||
              'Write your thoughts, reflections, or prayers...',
          )}

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
              {jc?.categoryLabel || 'Category'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={[
                  styles.chipContainer,
                  { flexDirection: isRtl ? 'row-reverse' : 'row' },
                ]}
              >
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          category === cat.value
                            ? COLORS.primary
                            : COLORS.surface,
                        borderColor:
                          category === cat.value
                            ? COLORS.primary
                            : COLORS.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            category === cat.value ? '#FFFFFF' : COLORS.text,
                        },
                      ]}
                    >
                      {getCategoryLabel(cat.value, jc)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Mood */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
              {jc?.moodLabel || 'How are you feeling?'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={[
                  styles.chipContainer,
                  { flexDirection: isRtl ? 'row-reverse' : 'row' },
                ]}
              >
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          mood === m.value
                            ? COLORS.primary + '20'
                            : COLORS.surface,
                        borderColor:
                          mood === m.value ? COLORS.primary : COLORS.border,
                      },
                    ]}
                    onPress={() => setMood(mood === m.value ? '' : m.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            mood === m.value ? COLORS.primary : COLORS.text,
                        },
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
              {jc?.scriptureRefLabel || 'Scripture Reference (optional)'}
            </Text>
            <View
              style={[
                styles.scriptureRow,
                { flexDirection: isRtl ? 'row-reverse' : 'row' },
              ]}
            >
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
                placeholder={jc?.bookPlaceholder || 'Book'}
                placeholderTextColor={COLORS.muted}
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
                placeholder={jc?.chapterPlaceholder || 'Ch'}
                placeholderTextColor={COLORS.muted}
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
                placeholder={jc?.versePlaceholder || 'Vs'}
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Prompt-based sections */}
          {/* Tags */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
              {'Tags'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderRadius: 12,
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
                paddingHorizontal: SPACING.md,
              }}
            >
              <Tag size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[
                  {
                    flex: 1,
                    paddingVertical: SPACING.md,
                    fontSize: FONT_SIZES.md,
                    color: COLORS.text,
                  },
                ]}
                value={tags}
                onChangeText={setTags}
                placeholder={'#faith #prayer #study'}
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Privacy toggle */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: SPACING.sm,
              }}
              onPress={() => setIsPublished(!isPublished)}
              activeOpacity={0.7}
            >
              {isPublished ? (
                <Globe size={18} color={COLORS.success} />
              ) : (
                <Lock size={18} color={COLORS.error} />
              )}
              <Text style={[{ color: COLORS.text, fontSize: FONT_SIZES.sm }]}>
                {isPublished
                  ? 'Public — anyone can read this'
                  : 'Private — only you can see this'}
              </Text>
            </TouchableOpacity>
          </View>

          {renderInput(
            jc?.gratitudeLabel || 'Gratitude',
            gratitude,
            setGratitude,
            true,
            jc?.gratitudePlaceholder || 'What are you grateful for today?',
          )}
          {renderInput(
            jc?.learningsLabel || 'Learnings',
            learnings,
            setLearnings,
            true,
            jc?.learningsPlaceholder || 'What did you learn?',
          )}
          {renderInput(
            jc?.applicationLabel || 'Application',
            application,
            setApplication,
            true,
            jc?.applicationPlaceholder || 'How will you apply this?',
          )}
          {renderInput(
            jc?.prayerRequestsLabel || 'Prayer Requests',
            prayers,
            setPrayers,
            true,
            jc?.prayerRequestsPlaceholder || 'What do you want to pray for?',
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
