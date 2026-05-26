/**
 * CreateReadingPlan.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Create a new reading plan with step-by-step interface
 * Supports translations and RTL layout.
 */

import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Switch,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createReadingPlan,
  addAssignment,
  addQuizQuestions,
} from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { getBibleBooks, Book } from '../../utilits/bibleUtils';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  HelpCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

interface Chapter {
  book: string;
  chapter: number;
}

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}

interface DayAssignment {
  dayNumber: number;
  title: string;
  chapters: Chapter[];
  reflectionQuestions: string[];
  quizQuestions: QuizQuestion[];
}

interface PlanMeta {
  title: string;
  description: string;
  totalDays: number;
  questionsEnabled: boolean;
  category: string;
  difficulty: string;
}

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalm', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

const CATEGORIES = [
  { value: 'intro', label: 'Introduction' },
  { value: 'whole-bible', label: 'Whole Bible' },
  { value: 'nt', label: 'New Testament' },
  { value: 'ot', label: 'Old Testament' },
  { value: 'book', label: 'Single Book' },
  { value: 'topical', label: 'Topical' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STEPS = [
  { id: 1, icon: BookOpen },
  { id: 2, icon: Calendar },
  { id: 3, icon: CheckCircle2 },
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
    successLight: `${colors.success}33`,
    error: colors.error,
    inactiveBg: colors.surface,
    inactiveText: colors.muted,
  };
};

const emptyQuiz = (): QuizQuestion => ({
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
});

const emptyDay = (n: number): DayAssignment => ({
  dayNumber: n,
  title: '',
  chapters: [{ book: '', chapter: 1 }],
  reflectionQuestions: [''],
  quizQuestions: [],
});

const isDayComplete = (d: DayAssignment) =>
  d.title.trim() !== '' && d.chapters.some(c => c.book.trim() !== '');

const CreateReadingPlan: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const theme = getTheme(isDark);
  const ac = translations?.admin;
  const styles = getStyles(theme, isRtl);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState<PlanMeta>({
    title: '',
    description: '',
    totalDays: 1,
    questionsEnabled: true,
    category: 'intro',
    difficulty: 'easy',
  });
  const [days, setDays] = useState<DayAssignment[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | undefined>(undefined);

  // Book picker state
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  const [targetDayIdx, setTargetDayIdx] = useState(0);

  const allBooks = getBibleBooks();
  const filteredBooks = bookSearch
    ? allBooks.filter(b =>
        b.name.toLowerCase().includes(bookSearch.toLowerCase()),
      )
    : allBooks;

  const openBookPicker = (dayIdx: number, chapterIdx: number) => {
    setExpandedDay(dayIdx + 1);
    setSelectedChapterIdx(chapterIdx);
    setBookPickerVisible(true);
  };

  const selectBookFromPicker = (bookName: string) => {
    if (expandedDay && days[expandedDay - 1]) {
      handleUpdateDay(expandedDay - 1, {
        chapters: days[expandedDay - 1].chapters.map((c, x) =>
          x === selectedChapterIdx ? { ...c, book: bookName } : c,
        ),
      });
    }
    setBookPickerVisible(false);
    setBookSearch('');
  };

  const updateMeta = <K extends keyof PlanMeta>(key: K, val: PlanMeta[K]) =>
    setMeta(m => ({ ...m, [key]: val }));

  const normaliseDays = (total: number) =>
    setDays(prev => {
      const next = [...prev];
      while (next.length < total) next.push(emptyDay(next.length + 1));
      if (next.length > total) next.splice(total);
      return next;
    });

  const handleUpdateDay = useCallback(
    (dayIdx: number, patch: Partial<DayAssignment>) =>
      setDays(p => p.map((d, x) => (x === dayIdx ? { ...d, ...patch } : d))),
    [],
  );

  const goToStep2 = () => {
    if (!meta.title.trim()) {
      showToast('error', ac?.createPlanValidateTitle || 'Title is required');
      return;
    }
    if (meta.totalDays < 1) {
      showToast('error', ac?.createPlanValidateDays || 'At least 1 day required');
      return;
    }
    if (meta.totalDays > 365) {
      showToast('error', ac?.createPlanValidateMaxDays || 'Maximum 365 days');
      return;
    }
    normaliseDays(meta.totalDays);
    setExpandedDay(1);
    setStep(2);
  };

  const goToStep3 = () => {
    const incomplete = days.findIndex(d => {
      const hasTitle = d.title.trim() !== '';
      const hasChapters = d.chapters.some(c => c.book.trim() !== '');
      return (hasTitle && !hasChapters) || (!hasTitle && hasChapters);
    });
    if (incomplete !== -1) {
      showToast('error', (ac?.createPlanValidateIncomplete || 'Day {count} is incomplete').replace('{count}', String(days[incomplete].dayNumber)));
      setExpandedDay(days[incomplete].dayNumber);
      return;
    }
    if (days.filter(isDayComplete).length === 0) {
      showToast('error', ac?.createPlanValidateNoComplete || 'Complete at least 1 day');
      setExpandedDay(1);
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const planRes = await createReadingPlan({
        title: meta.title,
        description: meta.description,
        totalDays: meta.totalDays,
        questionsEnabled: meta.questionsEnabled,
        category: meta.category,
        difficulty: meta.difficulty,
      });

      const planId = planRes.planId;

      for (const day of days.filter(isDayComplete)) {
        const aRes = await addAssignment({
          planId,
          dayNumber: day.dayNumber,
          title: day.title,
          chapters: day.chapters,
          reflectionQuestions: day.reflectionQuestions.filter(r => r.trim()),
        });

        if (aRes.returnCode !== 200) {
          showToast(
            'error',
            (ac?.createPlanDayFailed || 'Day {count} failed').replace('{count}', String(day.dayNumber)),
          );
          return;
        }

        if (meta.questionsEnabled && day.quizQuestions.length > 0) {
          const qRes = await addQuizQuestions({
            planId,
            dayNumber: day.dayNumber,
            questions: day.quizQuestions,
          });
          if (qRes.returnCode !== 200) {
            showToast('error', (ac?.createPlanQuizFailed || 'Quiz for Day {count} failed').replace('{count}', String(day.dayNumber)));
            return;
          }
        }
      }

      showToast('success', ac?.createPlanSuccess || 'Reading plan created!');
      navigation.goBack();
    } catch (e: any) {
      showToast('error', e.message || ac?.createPlanNetworkError || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    ac?.createPlanStepPlanInfo || 'Plan Info',
    ac?.createPlanStepDailyContent || 'Daily Content',
    ac?.createPlanStepReviewSave || 'Review & Save',
  ];

  const renderStepIndicator = () => (
    <View style={[styles.stepContainer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      {STEPS.map((s, i) => {
        const active = step === s.id;
        const done = step > s.id;
        const Icon = s.icon;
        return (
          <View key={s.id} style={[styles.stepItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.stepButton,
                { flexDirection: isRtl ? 'row-reverse' : 'row' },
                active && styles.stepActive,
                done && styles.stepDone,
              ]}
              onPress={() => s.id < step && setStep(s.id)}
            >
              {done ? (
                <CheckCircle2 size={18} color={theme.success} />
              ) : (
                <Icon size={16} color={active ? '#fff' : theme.muted} />
              )}
              <Text
                style={[
                  styles.stepLabel,
                  active && styles.stepLabelActive,
                  done && styles.stepLabelDone,
                  isRtl && { textAlign: 'right' },
                ]}
              >
                {stepLabels[i]}
              </Text>
            </TouchableOpacity>
            {i < STEPS.length - 1 && (
              <View
                style={[styles.stepLine, step > s.id && styles.stepLineDone]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.card}>
      <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <BookOpen size={20} color={theme.primary} />
        <Text style={[styles.cardTitle, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 8 }]}>{ac?.createPlanCardDetails || 'Plan Details'}</Text>
      </View>
      <Text style={[styles.cardSubtitle, isRtl && { textAlign: 'right' }]}>
        {ac?.createPlanCardDetailsSub || 'Basic metadata for the reading plan'}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={[styles.labelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormTitleLabel || 'Title'}</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TextInput
            style={[styles.input, isRtl && { textAlign: 'right' }]}
            value={meta.title}
            onChangeText={text => updateMeta('title', text)}
            placeholder={ac?.createPlanTitlePlaceholder || "e.g. One Week Bible Highlights"}
            placeholderTextColor={theme.muted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormDescriptionLabel || 'Description'}</Text>
          <TextInput
            style={[styles.input, styles.textArea, isRtl && { textAlign: 'right' }]}
            value={meta.description}
            onChangeText={text => updateMeta('description', text)}
            placeholder={ac?.createPlanDescPlaceholder || "Brief description of this plan…"}
            placeholderTextColor={theme.muted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={[styles.labelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormTotalDaysLabel || 'Total Days'}</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputSmall, isRtl && { textAlign: 'right' }]}
            value={String(meta.totalDays)}
            onChangeText={text =>
              updateMeta('totalDays', Math.max(1, parseInt(text) || 1))
            }
            placeholder="1"
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormCategoryLabel || 'Category'}</Text>
          <View style={[styles.optionsRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.optionButton,
                  { borderColor: theme.border },
                  meta.category === cat.value && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => updateMeta('category', cat.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    meta.category === cat.value && { color: '#fff' },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormDifficultyLabel || 'Difficulty'}</Text>
          <View style={[styles.optionsRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {DIFFICULTIES.map(diff => (
              <TouchableOpacity
                key={diff.value}
                style={[
                  styles.optionButton,
                  { borderColor: theme.border },
                  meta.difficulty === diff.value && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => updateMeta('difficulty', diff.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    meta.difficulty === diff.value && { color: '#fff' },
                  ]}
                >
                  {diff.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[styles.switchInfo, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <HelpCircle size={20} color={theme.primary} />
            <View>
              <Text style={[styles.switchLabel, isRtl && { textAlign: 'right' }]}>{ac?.planFormQuizLabel || 'Quiz Questions'}</Text>
              <Text style={[styles.switchSubLabel, isRtl && { textAlign: 'right' }]}>
                {ac?.planFormQuizSubLabel || 'Enable daily quizzes for readers'}
              </Text>
            </View>
          </View>
          <Switch
            value={meta.questionsEnabled}
            onValueChange={v => updateMeta('questionsEnabled', v)}
            trackColor={{ false: theme.inactiveBg, true: theme.successLight }}
            thumbColor={
              meta.questionsEnabled ? theme.success : theme.inactiveText
            }
          />
        </View>
      </View>
    </View>
  );

  const renderDayCard = (day: DayAssignment, dayIdx: number) => {
    const isOpen = expandedDay === day.dayNumber;
    const complete = isDayComplete(day);
    const partial =
      !complete &&
      (day.title.trim() !== '' || day.chapters.some(c => c.book.trim() !== ''));
    const addChapter = () =>
      handleUpdateDay(dayIdx, {
        chapters: [...day.chapters, { book: '', chapter: 1 }],
      });
    const removeChapter = (ci: number) =>
      day.chapters.length > 1 &&
      handleUpdateDay(dayIdx, {
        chapters: day.chapters.filter((_, x) => x !== ci),
      });
    const updateChapter = (ci: number, p: Partial<Chapter>) =>
      handleUpdateDay(dayIdx, {
        chapters: day.chapters.map((c, x) => (x === ci ? { ...c, ...p } : c)),
      });

    const addReflection = () =>
      handleUpdateDay(dayIdx, {
        reflectionQuestions: [...day.reflectionQuestions, ''],
      });
    const updateReflection = (ri: number, v: string) =>
      handleUpdateDay(dayIdx, {
        reflectionQuestions: day.reflectionQuestions.map((r, x) =>
          x === ri ? v : r,
        ),
      });
    const removeReflection = (ri: number) =>
      day.reflectionQuestions.length > 1 &&
      handleUpdateDay(dayIdx, {
        reflectionQuestions: day.reflectionQuestions.filter((_, x) => x !== ri),
      });

    const addQuiz = () =>
      handleUpdateDay(dayIdx, {
        quizQuestions: [...day.quizQuestions, emptyQuiz()],
      });
    const updateQuiz = (qi: number, p: Partial<QuizQuestion>) =>
      handleUpdateDay(dayIdx, {
        quizQuestions: day.quizQuestions.map((q, x) =>
          x === qi ? { ...q, ...p } : q,
        ),
      });
    const removeQuiz = (qi: number) =>
      handleUpdateDay(dayIdx, {
        quizQuestions: day.quizQuestions.filter((_, x) => x !== qi),
      });
    const updateQuizOption = (qi: number, oi: number, val: string) => {
      const opts = [...day.quizQuestions[qi].options] as [
        string, string, string, string,
      ];
      opts[oi] = val;
      updateQuiz(qi, { options: opts });
    };

    return (
      <View
        key={day.dayNumber}
        style={[
          styles.dayCard,
          isOpen && styles.dayCardOpen,
          complete && styles.dayCardComplete,
          partial && styles.dayCardPartial,
        ]}
      >
        <TouchableOpacity
          style={[styles.dayCardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          onPress={() => setExpandedDay(isOpen ? undefined : day.dayNumber)}
        >
          <View
            style={[
              styles.dayNumber,
              complete && styles.dayNumberComplete,
              partial && styles.dayNumberPartial,
            ]}
          >
            {complete ? (
              <CheckCircle2 size={16} color={theme.success} />
            ) : (
              <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
            )}
          </View>
          <View style={[styles.dayInfo, { marginLeft: isRtl ? 0 : 12, marginRight: isRtl ? 12 : 0 }]}>
            <Text
              style={[
                styles.dayTitle,
                complete && styles.dayTitleComplete,
                !complete && !partial && styles.dayTitleEmpty,
                isRtl && { textAlign: 'right' },
              ]}
            >
              {day.title || (ac?.createPlanDayTitleEmpty || 'Day {count}').replace('{count}', String(day.dayNumber))}
            </Text>
            {complete && (
              <Text style={[styles.dayChapters, isRtl && { textAlign: 'right' }]}>
                {day.chapters
                  .filter(c => c.book)
                  .map(c => `${c.book} ${c.chapter}`)
                  .join(', ')}
              </Text>
            )}
          </View>
          <View style={[styles.dayStatus, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {complete && <Text style={styles.statusReady}>{ac?.createPlanReady || 'Ready'}</Text>}
            {partial && <Text style={styles.statusPartial}>{ac?.createPlanPartial || 'Partial'}</Text>}
            {isOpen ? (
              <ChevronUp size={18} color={theme.muted} />
            ) : (
              <ChevronDown size={18} color={theme.muted} />
            )}
          </View>
        </TouchableOpacity>

        {isOpen && (
          <ScrollView
            style={styles.dayCardBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <View style={[styles.labelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormDayTitleLabel || 'Day Title'}</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[styles.input, isRtl && { textAlign: 'right' }]}
                value={day.title}
                onChangeText={text => handleUpdateDay(dayIdx, { title: text })}
                placeholder={ac?.planFormDayTitlePlaceholder || "e.g. Creation — In the beginning"}
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.labelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormChaptersLabel || 'Chapters'}</Text>
                <Text style={styles.required}>*</Text>
              </View>
              {day.chapters.map((ch, ci) => (
                <View key={ci} style={[styles.chapterRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.bookPicker, { borderColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                    onPress={() => openBookPicker(dayIdx, ci)}
                  >
                    <Text
                      style={[
                        styles.bookPickerText,
                        !ch.book && { color: theme.muted },
                        isRtl && { textAlign: 'right' },
                      ]}
                    >
                      {ch.book || (ac?.planFormSelectBook || 'Select book')}
                    </Text>
                    <ChevronDown size={16} color={theme.muted} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.chapterInput, isRtl && { textAlign: 'right' }]}
                    value={String(ch.chapter)}
                    onChangeText={text =>
                      updateChapter(ci, { chapter: parseInt(text) || 1 })
                    }
                    keyboardType="number-pad"
                    placeholder="Ch"
                    placeholderTextColor={theme.muted}
                  />
                  {day.chapters.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeChapter(ci)}
                    >
                      <X size={16} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={[styles.addLink, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} onPress={addChapter}>
                <Plus size={14} color={theme.primary} />
                <Text style={styles.addLinkText}>{ac?.planFormAddChapter || 'Add Chapter'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormReflectionLabel || 'Reflection Questions'}</Text>
              {day.reflectionQuestions.map((q, ri) => (
                <View key={ri} style={[styles.chapterRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[styles.input, styles.flex1, isRtl && { textAlign: 'right' }]}
                    value={q}
                    onChangeText={text => updateReflection(ri, text)}
                    placeholder={(ac?.planFormReflectionPlaceholder || 'Reflection question {count}').replace('{count}', String(ri + 1))}
                    placeholderTextColor={theme.muted}
                  />
                  {day.reflectionQuestions.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeReflection(ri)}
                    >
                      <X size={16} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={[styles.addLink, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} onPress={addReflection}>
                <Plus size={14} color={theme.primary} />
                <Text style={styles.addLinkText}>{ac?.planFormAddReflection || 'Add Reflection'}</Text>
              </TouchableOpacity>
            </View>

            {meta.questionsEnabled && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormQuizQuestionsLabel || 'Quiz Questions'}</Text>
                {day.quizQuestions.map((quiz, qi) => (
                  <View key={qi} style={styles.quizCard}>
                    <View style={[styles.quizHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.quizNumber}>Q{qi + 1}</Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeQuiz(qi)}
                      >
                        <X size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea, isRtl && { textAlign: 'right' }]}
                      value={quiz.question}
                      onChangeText={text => updateQuiz(qi, { question: text })}
                      placeholder={ac?.planFormQuizPlaceholder || "Question text…"}
                      placeholderTextColor={theme.muted}
                      multiline
                    />
                    <View style={styles.optionsGrid}>
                      {quiz.options.map((option, oi) => (
                        <View key={oi} style={[styles.optionRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                          <TouchableOpacity
                            style={[
                              styles.optionRadio,
                              quiz.correctAnswer === oi && styles.optionRadioActive,
                            ]}
                            onPress={() => updateQuiz(qi, { correctAnswer: oi })}
                          >
                            {quiz.correctAnswer === oi ? (
                              <CheckCircle2 size={12} color="#fff" />
                            ) : (
                              <Text style={styles.optionLabel}>
                                {['A', 'B', 'C', 'D'][oi]}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, styles.optionInput, isRtl && { textAlign: 'right' }]}
                            value={option}
                            onChangeText={text => updateQuizOption(qi, oi, text)}
                            placeholder={(ac?.planFormOptionPlaceholder || 'Option {count}').replace('{count}', String(oi + 1))}
                            placeholderTextColor={theme.muted}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, isRtl && { textAlign: 'right' }]}>{ac?.planFormExplanationLabel || 'Explanation'}</Text>
                      <TextInput
                        style={[styles.input, styles.textAreaSmall, isRtl && { textAlign: 'right' }]}
                        value={quiz.explanation}
                        onChangeText={text => updateQuiz(qi, { explanation: text })}
                        placeholder={ac?.planFormExplanationPlaceholder || "Explain why this is correct..."}
                        placeholderTextColor={theme.muted}
                        multiline
                      />
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={[styles.addLink, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} onPress={addQuiz}>
                  <Plus size={14} color={theme.primary} />
                  <Text style={styles.addLinkText}>{ac?.planFormAddQuestion || 'Add Question'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderStep2 = () => (
    <View style={styles.card}>
      <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Calendar size={20} color={theme.primary} />
        <Text style={[styles.cardTitle, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 8 }]}>
          {(ac?.createPlanCardDailyContent || 'Daily Content — {count} Days').replace('{count}', String(meta.totalDays))}
        </Text>
      </View>
      <Text style={[styles.cardSubtitle, isRtl && { textAlign: 'right' }]}>
        {ac?.createPlanCardDailyContentSub || 'Assign chapters and questions per day'}
      </Text>
      <Text style={[styles.readyCount, isRtl && { textAlign: 'right' }]}>
        {(ac?.createPlanReadyCount || '{ready}/{total} ready').replace('{ready}', String(days.filter(isDayComplete).length)).replace('{total}', String(meta.totalDays))}
      </Text>

      <ScrollView style={styles.daysList} showsVerticalScrollIndicator={false}>
        {days.map((day, dayIdx) => renderDayCard(day, dayIdx))}
      </ScrollView>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.card}>
      <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <CheckCircle2 size={20} color={theme.primary} />
        <Text style={[styles.cardTitle, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 8 }]}>{ac?.createPlanCardReview || 'Review & Confirm'}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={[styles.reviewTitle, isRtl && { textAlign: 'right' }]}>{meta.title}</Text>
        {meta.description.trim() !== '' && (
          <Text style={[styles.reviewDesc, isRtl && { textAlign: 'right' }]}>{meta.description}</Text>
        )}
        <View style={[styles.reviewBadges, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Text style={styles.reviewBadge}>{meta.totalDays} days</Text>
          <Text style={styles.reviewBadge}>
            {CATEGORIES.find(c => c.value === meta.category)?.label}
          </Text>
          <Text style={styles.reviewBadge}>{meta.difficulty}</Text>
          {meta.questionsEnabled && (
            <Text style={[styles.reviewBadge, styles.quizBadge]}>
              Quiz enabled
            </Text>
          )}
        </View>
      </View>

      <View style={styles.assignmentsList}>
        <Text style={[styles.assignmentsTitle, isRtl && { textAlign: 'right' }]}>{ac?.createPlanDayAssignments || 'Day Assignments'}</Text>
        {days.map(day => {
          const ok = isDayComplete(day);
          return (
            <View
              key={day.dayNumber}
              style={[styles.assignmentItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }, ok && styles.assignmentOk]}
            >
              <View
                style={[
                  styles.assignmentNumber,
                  ok && styles.assignmentNumberOk,
                ]}
              >
                <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
              </View>
              <View style={[styles.assignmentInfo, { marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0 }]}>
                {ok ? (
                  <>
                    <Text style={[styles.assignmentTitle, isRtl && { textAlign: 'right' }]}>{day.title}</Text>
                    <Text style={[styles.assignmentChapters, isRtl && { textAlign: 'right' }]}>
                      {day.chapters.map(c => `${c.book} ${c.chapter}`).join(', ')}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.assignmentPending, isRtl && { textAlign: 'right' }]}>
                    {ac?.createPlanNotConfigured || 'Not configured — can add via Edit after saving'}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          {isRtl ? <ChevronRight size={20} color={theme.primary} /> : <ChevronLeft size={20} color={theme.primary} />}
        </TouchableOpacity>
        <View style={[styles.headerIcon, { marginLeft: isRtl ? 0 : 12, marginRight: isRtl ? 12 : 0 }]}>
          <BookOpen size={20} color={theme.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, isRtl && { textAlign: 'right' }]}>{ac?.createPlanTitle || 'Create Reading Plan'}</Text>
          <Text style={[styles.headerSubtitle, isRtl && { textAlign: 'right' }]}>{ac?.createPlanSubtitle || 'Admin — full plan builder'}</Text>
        </View>
      </View>

      <View style={styles.gradient} />

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={[styles.footer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBack, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            onPress={() => setStep(step - 1)}
          >
            {isRtl ? <ArrowRight size={18} color={theme.text} /> : <ArrowLeft size={18} color={theme.text} />}
            <Text style={styles.footerBackText}>{ac?.planFormBack || 'Back'}</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerNext, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            onPress={step === 1 ? goToStep2 : goToStep3}
          >
            <Text style={styles.footerNextText}>
              {step === 1 ? (ac?.createPlanNextBtn || 'Daily Content') : (ac?.createPlanReviewBtn || 'Review Plan')}
            </Text>
            {isRtl ? <ArrowLeft size={18} color="#fff" /> : <ArrowRight size={18} color="#fff" />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.footerBtn,
              styles.footerSave,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
              submitting && styles.footerBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.footerSaveText}>{ac?.createPlanSaveBtn || 'Create Reading Plan'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Book Picker Modal */}
      <Modal visible={bookPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }, isRtl && { textAlign: 'right' }]}>
                {ac?.planFormModalSelectBook || 'Select Book'}
              </Text>
              <TouchableOpacity onPress={() => setBookPickerVisible(false)}>
                <X size={20} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { borderColor: theme.border, backgroundColor: theme.bg, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Search size={18} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }, isRtl && { textAlign: 'right' }]}
                placeholder={ac?.planFormSearchBooks || 'Search books...'}
                placeholderTextColor={theme.muted}
                value={bookSearch}
                onChangeText={setBookSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredBooks}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.bookItem, { borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                  onPress={() => selectBookFromPicker(item.name)}
                >
                  <Text style={[styles.bookItemText, { color: theme.text }, isRtl && { textAlign: 'right' }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.bookItemChapters, { color: theme.muted }, isRtl && { textAlign: 'right' }]}>
                    {(ac?.planFormChaptersCount || '{count} chapters').replace('{count}', String(item.chapters))}
                  </Text>
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
      backgroundColor: theme.bg,
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surface,
    },
    backButton: {
      padding: 8,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
      marginLeft: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
    gradient: {
      height: 4,
      backgroundColor: theme.primary,
    },
    stepContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    stepItem: {
      flex: 1,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    stepButton: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    stepActive: {
      backgroundColor: theme.primary,
    },
    stepDone: {
      backgroundColor: 'transparent',
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
      color: theme.muted,
    },
    stepLabelActive: {
      color: '#fff',
    },
    stepLabelDone: {
      color: theme.success,
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.border,
      marginHorizontal: 8,
    },
    stepLineDone: {
      backgroundColor: theme.success,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.cardBackground,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginLeft: 8,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.muted,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    readyCount: {
      fontSize: 12,
      color: theme.success,
      fontWeight: '600',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    form: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 6,
    },
    labelRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
    },
    required: {
      color: theme.error,
    },
    input: {
      backgroundColor: theme.cardBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
    },
    inputSmall: {
      width: 80,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    optionsRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      marginTop: 8,
    },
    switchInfo: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      flex: 1,
    },
    switchLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    switchSubLabel: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
    daysList: {
      flex: 1,
    },
    dayCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardBackground,
      overflow: 'hidden',
    },
    dayCardOpen: {
      borderColor: theme.primary,
    },
    dayCardComplete: {
      borderColor: theme.success + '50',
      backgroundColor: theme.success + '10',
    },
    dayCardPartial: {
      borderColor: '#f59e0b50',
      backgroundColor: '#fef3c710',
    },
    dayCardHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      padding: 12,
    },
    dayNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    dayNumberComplete: {
      backgroundColor: theme.success + '20',
    },
    dayNumberPartial: {
      backgroundColor: '#fef3c720',
    },
    dayNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
    },
    dayInfo: {
      flex: 1,
    },
    dayTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    dayTitleComplete: {
      color: theme.text,
    },
    dayTitleEmpty: {
      color: theme.muted,
      fontStyle: 'italic',
    },
    dayChapters: {
      fontSize: 11,
      color: theme.muted,
      marginTop: 2,
    },
    dayStatus: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusReady: {
      fontSize: 10,
      color: theme.success,
      fontWeight: '600',
    },
    statusPartial: {
      fontSize: 10,
      color: '#f59e0b',
      fontWeight: '600',
    },
    dayCardBody: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      minHeight: 300,
    },
    chapterRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    bookPicker: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderRadius: 10,
      backgroundColor: theme.surface,
      gap: 8,
    },
    bookPickerText: {
      fontSize: 14,
      color: theme.muted,
    },
    chapterInput: {
      width: 60,
      textAlign: 'center',
    },
    flex1: {
      flex: 1,
    },
    removeBtn: {
      padding: 8,
    },
    addLink: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 4,
    },
    addLinkText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    quizCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    quizHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    quizNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
    },
    optionsGrid: {
      gap: 10,
      marginVertical: 12,
    },
    optionRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    optionRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionRadioActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    optionInput: {
      flex: 1,
      minHeight: 44,
    },
    optionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    textAreaSmall: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    reviewCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      margin: 16,
    },
    reviewTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    reviewDesc: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    reviewBadges: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    reviewBadge: {
      fontSize: 11,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.surface,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    quizBadge: {
      backgroundColor: '#ede9fe',
      color: '#7c3aed',
    },
    assignmentsList: {
      padding: 16,
    },
    assignmentsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
    },
    assignmentItem: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.surface,
      marginBottom: 8,
    },
    assignmentOk: {
      backgroundColor: theme.cardBackground,
    },
    assignmentNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.inactiveBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignmentNumberOk: {
      backgroundColor: theme.primary + '20',
    },
    assignmentInfo: {
      flex: 1,
    },
    assignmentTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    assignmentChapters: {
      fontSize: 11,
      color: theme.muted,
      marginTop: 2,
    },
    assignmentPending: {
      fontSize: 12,
      color: theme.muted,
      fontStyle: 'italic',
    },
    footer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    footerBtn: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    footerBack: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    footerBackText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    footerNext: {
      flex: 2,
      backgroundColor: theme.primary,
    },
    footerNextText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    footerSave: {
      flex: 2,
      backgroundColor: theme.primary,
    },
    footerSaveText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    footerBtnDisabled: {
      opacity: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      maxHeight: '80%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    searchContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      fontSize: 15,
    },
    bookItem: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    bookItemText: {
      fontSize: 15,
      fontWeight: '500',
    },
    bookItemChapters: {
      fontSize: 12,
    },
  });

export default CreateReadingPlan;
