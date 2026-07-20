import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
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
import { useJournalDraft } from '../../hooks/useJournalDraft';
import { useConnectivity } from '../../providers/ConnectivityProvider';
import ActionHeader from '../../reusable/ActionHeader';
import {
  Save,
  Tag,
  Globe,
  Lock,
  FileText,
  BookOpen,
  Heart,
  Lightbulb,
  Sparkles,
  BookText,
  Hash,
  Smile,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';

const CATEGORIES = [
  { value: 'general', icon: FileText },
  { value: 'study', icon: BookOpen },
  { value: 'prayer', icon: Heart },
  { value: 'gratitude', icon: Sparkles },
  { value: 'reflection', icon: Lightbulb },
  { value: 'application', icon: BookText },
];

const MOODS = [
  { value: 'happy', label: '😊' },
  { value: 'grateful', label: '🙏' },
  { value: 'peaceful', label: '🕊️' },
  { value: 'thoughtful', label: '🤔' },
  { value: 'motivated', label: '💪' },
  { value: 'hopeful', label: '🌟' },
  { value: 'challenged', label: '🧗' },
  { value: 'blessed', label: '✨' },
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
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
  const [strongsWords, setStrongsWords] = useState<string | undefined>(undefined);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useConnectivity();
  const [draftRestored, setDraftRestored] = useState(false);

  const formState = useMemo(() => ({
    title, content, category, mood, prayers, gratitude,
    learnings, application, bookName, chapter, verseNumber, tags, isPublished,
  }), [
    title, content, category, mood, prayers, gratitude,
    learnings, application, bookName, chapter, verseNumber, tags, isPublished,
  ]);

  const { hasDraft, restoreDraft, clearDraft } = useJournalDraft(
    `entry_${entryId || 'new'}`,
    formState,
    isEditMode,
  );

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
      if (params.bookName) setBookName(params.bookName);
      if (params.title) setTitle(params.title);
      if (params.category && CATEGORIES.some(item => item.value === params.category)) {
        setCategory(params.category);
      }
      if (params.chapter) setChapter(String(params.chapter));
      if (params.verseStart !== undefined) {
        const verseStr = params.verseEnd !== undefined && params.verseEnd !== params.verseStart
          ? `${params.verseStart}-${params.verseEnd}`
          : String(params.verseStart);
        setVerseNumber(verseStr);
      }
      if (params.reflection) setContent(params.reflection);
      if (params.prayers) setPrayers(params.prayers);
      if (params.application) setApplication(params.application);
      if (params.tags) setTags(params.tags);
      if (params.strongsWords) setStrongsWords(params.strongsWords);
      if (params.isPublic !== undefined) setIsPublished(params.isPublic);
      if (params.passageRef && !params.title) {
        setTitle(`Exegesis: ${params.passageRef}`);
      }

      restoreDraft().then(draft => {
        if (draft) {
          setTitle(draft.title);
          setContent(draft.content);
          setCategory(draft.category);
          setMood(draft.mood);
          setPrayers(draft.prayers);
          setGratitude(draft.gratitude);
          setLearnings(draft.learnings);
          setApplication(draft.application);
          setBookName(draft.bookName);
          setChapter(draft.chapter);
          setVerseNumber(draft.verseNumber);
          setTags(draft.tags);
          setIsPublished(draft.isPublished);
          setDraftRestored(true);
        }
      });
    }
  }, [isEditMode, loadEntry, routeParams?.params, restoreDraft]);

  useEffect(() => {
    if (draftRestored) {
      showToast('info', 'Draft restored');
      setDraftRestored(false);
    }
  }, [draftRestored]);

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
        showToast('success', isEditMode
          ? jc?.entryUpdated || 'Entry updated'
          : jc?.entrySaved || 'Entry saved');
        await clearDraft();
        if (!isEditMode && res.returnData?.id) {
          await syncJournalEntry(res.returnData.id);
        }
        const returnTo = routeParams?.params?.returnTo;
        if (returnTo) navigation.navigate(returnTo);
        else navigation.goBack();
      } else if (res.returnCode === 202) {
        showToast('info', 'Saved offline — will sync when connected');
        await clearDraft();
        const returnTo = routeParams?.params?.returnTo;
        if (returnTo) navigation.navigate(returnTo);
        else navigation.goBack();
      } else {
        showToast('warning', res.returnMessage || jc?.failedToSave || 'Failed to save');
      }
    } catch (error: any) {
      showToast('error', error?.message || jc?.failedToSave || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ActionHeader
        title={isEditMode ? jc?.editEntry || 'Edit Entry' : jc?.newEntry || 'New Entry'}
        onPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}
            onPress={handleSave}
            disabled={saving || syncing}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Save size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        }
      />

      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>
            Offline — saved locally, syncs when connected
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <TextInput
              style={[styles.titleInput, { color: COLORS.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder={jc?.titlePlaceholder || 'Entry title...'}
              placeholderTextColor={COLORS.muted}
              textAlign={isRtl ? 'right' : 'left'}
            />
          </View>

          {/* Content */}
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <View style={[styles.fieldHeader, isRtl && { flexDirection: 'row-reverse' }]}>
              <FileText size={14} color={COLORS.primary} />
              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
                {jc?.contentPlaceholder || 'Journal Entry'} *
              </Text>
            </View>
            <TextInput
              style={[styles.contentInput, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
              value={content}
              onChangeText={setContent}
              placeholder={jc?.contentRequired || 'Write your thoughts...'}
              placeholderTextColor={COLORS.muted}
              multiline
              textAlignVertical="top"
              textAlign={isRtl ? 'right' : 'left'}
            />
          </View>

          {/* Category + Mood row */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Details</Text>
          </View>
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              {jc?.categoryLabel || 'Category'}
            </Text>
            <View style={[styles.chipRow, isRtl && { flexDirection: 'row-reverse' }]}>
              {CATEGORIES.map(cat => {
                const IconComp = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <IconComp size={12} color={isSelected ? '#FFFFFF' : COLORS.textSecondary} />
                    <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : COLORS.text }]}>
                      {getCategoryLabel(cat.value, jc)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              {jc?.moodLabel || 'Mood'}
            </Text>
            <View style={[styles.chipRow, isRtl && { flexDirection: 'row-reverse' }]}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: mood === m.value ? `${COLORS.primary}18` : COLORS.surface,
                      borderColor: mood === m.value ? COLORS.primary : COLORS.border,
                    },
                  ]}
                  onPress={() => setMood(mood === m.value ? '' : m.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Scripture Reference */}
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <View style={[styles.fieldHeader, isRtl && { flexDirection: 'row-reverse' }]}>
              <BookOpen size={14} color={COLORS.primary} />
              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
                {jc?.scriptureRefLabel || 'Scripture Reference'}
              </Text>
            </View>
            <View style={[styles.refRow, isRtl && { flexDirection: 'row-reverse' }]}>
              <TextInput
                style={[styles.refInput, styles.refInputBook, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={bookName}
                onChangeText={setBookName}
                placeholder={jc?.bookPlaceholder || 'Book'}
                placeholderTextColor={COLORS.muted}
              />
              <TextInput
                style={[styles.refInput, styles.refInputSmall, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={chapter}
                onChangeText={setChapter}
                placeholder="Ch"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.refInput, styles.refInputSmall, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={verseNumber}
                onChangeText={setVerseNumber}
                placeholder="Vs"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Tags */}
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <View style={[styles.fieldHeader, isRtl && { flexDirection: 'row-reverse' }]}>
              <Hash size={14} color={COLORS.primary} />
              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Tags</Text>
            </View>
            <View style={[styles.tagInputRow, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Tag size={14} color={COLORS.muted} />
              <TextInput
                style={[styles.tagInput, { color: COLORS.text }]}
                value={tags}
                onChangeText={setTags}
                placeholder="#faith #prayer #study"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Prompt sections */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Reflection</Text>
          </View>

          {[
            { key: 'gratitude', label: jc?.gratitudeLabel || 'Gratitude', icon: Heart, color: '#F59E0B', value: gratitude, setter: setGratitude, placeholder: jc?.gratitudePlaceholder || 'What are you grateful for?' },
            { key: 'learnings', label: jc?.learningsLabel || 'Learnings', icon: Lightbulb, color: '#3B82F6', value: learnings, setter: setLearnings, placeholder: jc?.learningsPlaceholder || 'What did you learn?' },
            { key: 'application', label: jc?.applicationLabel || 'Application', icon: BookText, color: '#10B981', value: application, setter: setApplication, placeholder: jc?.applicationPlaceholder || 'How will you apply this?' },
            { key: 'prayers', label: jc?.prayerRequestsLabel || 'Prayer Requests', icon: Heart, color: '#8B5CF6', value: prayers, setter: setPrayers, placeholder: jc?.prayerRequestsPlaceholder || 'What do you want to pray for?' },
          ].map(section => (
            <View key={section.key} style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
              <View style={[styles.fieldHeader, isRtl && { flexDirection: 'row-reverse' }]}>
                <section.icon size={14} color={section.color} />
                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>{section.label}</Text>
              </View>
              <TextInput
                style={[styles.textarea, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={section.value}
                onChangeText={section.setter}
                placeholder={section.placeholder}
                placeholderTextColor={COLORS.muted}
                multiline
                textAlignVertical="top"
                textAlign={isRtl ? 'right' : 'left'}
              />
            </View>
          ))}

          {/* Privacy toggle */}
          <View style={[styles.fieldCard, { backgroundColor: COLORS.cardBackground }]}>
            <TouchableOpacity
              style={[styles.privacyRow, isRtl && { flexDirection: 'row-reverse' }]}
              onPress={() => setIsPublished(!isPublished)}
              activeOpacity={0.7}
            >
              <View style={[styles.privacyIcon, { backgroundColor: isPublished ? `${COLORS.success}18` : `${COLORS.error}18` }]}>
                {isPublished ? (
                  <Globe size={16} color={COLORS.success} />
                ) : (
                  <Lock size={16} color={COLORS.error} />
                )}
              </View>
              <Text style={[styles.privacyText, { color: COLORS.text }]}>
                {isPublished
                  ? 'Public — anyone can read this'
                  : 'Private — only you can see this'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  fieldCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    paddingVertical: 4,
  },
  contentInput: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    minHeight: 140,
    borderWidth: 1,
    lineHeight: 22,
  },
  textarea: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    minHeight: 100,
    borderWidth: 1,
    lineHeight: 20,
  },
  sectionHeader: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  moodChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  refRow: {
    flexDirection: 'row',
    gap: 8,
  },
  refInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  refInputBook: {
    flex: 2,
  },
  refInputSmall: {
    flex: 1,
    textAlign: 'center',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  tagInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    flex: 1,
  },
});

export default JournalEntryScreen;
