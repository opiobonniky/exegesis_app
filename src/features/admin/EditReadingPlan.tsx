/**
 * EditReadingPlan.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Edit an existing reading plan
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  updateReadingPlan,
  addAssignment,
  addQuizQuestions,
  deleteQuizQuestion,
  getPlanAssignments,
  getPlanQuizQuestions,
  getAllReadingPlansAdmin,
  ReadingPlan,
} from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  HelpCircle,
  Save,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

interface Chapter {
  book: string;
  chapter: number;
}

interface QuizQuestion {
  questionId?: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
  _new?: boolean;
}

interface DayAssignment {
  id?: number;
  dayNumber: number;
  title: string;
  chapters: Chapter[];
  reflectionQuestions: string[];
  quizQuestions: QuizQuestion[];
  _exists: boolean;
}

interface PlanMeta {
  planId: string;
  title: string;
  description: string;
  totalDays: number;
  questionsEnabled: boolean;
  category: string;
  difficulty: string;
  isActive: boolean;
}

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
  _new: true,
});

const emptyDay = (n: number): DayAssignment => ({
  dayNumber: n,
  title: '',
  chapters: [{ book: '', chapter: 1 }],
  reflectionQuestions: [''],
  quizQuestions: [],
  _exists: false,
});

const EditReadingPlan: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { planId } = route.params || {};
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const styles = getStyles(theme);

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [days, setDays] = useState<DayAssignment[]>([]);
  const [expandedDay, setExpandedDay] = useState<number>(-1);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ dayIdx: number; qIdx: number; questionId?: number } | null>(null);

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const allRes = await getAllReadingPlansAdmin(1, 100);
      const planMeta = allRes.plans?.find((p: ReadingPlan) => p.planId === planId);
      
      if (!planMeta) {
        showToast('error', 'Plan not found');
        navigation.goBack();
        return;
      }
      
      setMeta({
        planId: planMeta.planId,
        title: planMeta.title || '',
        description: planMeta.description || '',
        totalDays: planMeta.totalDays || 0,
        questionsEnabled: planMeta.questionsEnabled || false,
        category: (planMeta.category || 'intro').toLowerCase(),
        difficulty: (planMeta.difficulty || 'easy').toLowerCase(),
        isActive: planMeta.isActive || false,
      });

      const total = planMeta.totalDays || 0;
      const nums = Array.from({ length: total }, (_, i) => i + 1);
      
      const [aResults, qResults] = await Promise.all([
        Promise.all(
          nums.map((d) =>
            getPlanAssignments(planId, d),
          ),
        ),
        Promise.all(
          nums.map((d) =>
            getPlanQuizQuestions(planId, d),
          ),
        ),
      ]);

      setDays(
        nums.map((dayNum, i) => {
          const aRes = aResults[i];
          const qRes = qResults[i];
          const quizQuestions: QuizQuestion[] =
            qRes?.returnCode === 200 && Array.isArray(qRes?.returnData)
              ? qRes.returnData.map((q: any) => ({
                  questionId: q.questionId,
                  question: q.question || '',
                  options: q.optionsJson ? JSON.parse(q.optionsJson) : ['', '', '', ''],
                  correctAnswer: q.correctAnswer || 0,
                  explanation: q.explanation || '',
                  _new: false,
                }))
              : [];
              
          if (aRes?.returnCode === 200 && aRes?.returnData) {
            return {
              id: aRes.returnData.id,
              dayNumber: dayNum,
              title: aRes.returnData.title || '',
              chapters: aRes.returnData.chapters || [{ book: '', chapter: 1 }],
              reflectionQuestions: aRes.returnData.reflectionQuestions?.length
                ? aRes.returnData.reflectionQuestions
                : [''],
              quizQuestions,
              _exists: true,
            };
          }
          return emptyDay(dayNum);
        }),
      );
    } catch (e: any) {
      showToast('error', e.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }, [planId, navigation]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const updateMeta = <K extends keyof PlanMeta>(k: K, v: PlanMeta[K]) =>
    setMeta((m) => (m ? { ...m, [k]: v } : m));

  const saveMeta = async () => {
    if (!meta) return;
    if (!meta.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    setSavingMeta(true);
    try {
      const res = await updateReadingPlan(meta.planId, {
        title: meta.title,
        description: meta.description,
        category: meta.category,
        difficulty: meta.difficulty,
        questionsEnabled: meta.questionsEnabled,
        isActive: meta.isActive,
      });
      showToast('success', 'Plan info saved');
    } catch (e: any) {
      showToast('error', e.message || 'Save failed');
    } finally {
      setSavingMeta(false);
    }
  };

  const updateDay = (i: number, patch: Partial<DayAssignment>) =>
    setDays((p) =>
      p.map((d, x) => (x === i ? { ...d, ...patch } : d)),
    );

  const saveDay = async (dayIdx: number) => {
    if (!meta || !planId) return;
    const day = days[dayIdx];
    if (!day.title.trim()) {
      showToast('error', `Day ${day.dayNumber}: title required`);
      return;
    }
    if (day.chapters.some((c) => !c.book.trim())) {
      showToast('error', `Day ${day.dayNumber}: all chapters need a book`);
      return;
    }

    setSavingDay(day.dayNumber);
    try {
      const ep = day._exists ? 'update-assignment' : 'add-assignment';
      const payload: any = {
        planId,
        dayNumber: day.dayNumber,
        title: day.title,
        chapters: day.chapters,
        reflectionQuestions: day.reflectionQuestions.filter((r) => r.trim()),
      };
      if (day._exists && day.id) {
        payload.assignmentId = day.id;
      }
      
      await addAssignment(payload);
      
      const newQs = day.quizQuestions.filter((q) => q._new);
      for (const q of newQs) {
        await addQuizQuestions({
          planId,
          dayNumber: day.dayNumber,
          questions: [q],
        });
      }
      
      showToast('success', `Day ${day.dayNumber} saved`);
      loadPlan();
      setExpandedDay(-1);
    } catch (e: any) {
      showToast('error', e.message || 'Save failed');
    } finally {
      setSavingDay(null);
    }
  };

  const openDeleteQuiz = (
    dayIdx: number,
    qIdx: number,
    questionId?: number,
  ) => {
    if (!questionId) {
      updateDay(dayIdx, {
        quizQuestions: days[dayIdx].quizQuestions.filter((_, x) => x !== qIdx),
      });
      return;
    }
    setDeleteTarget({ dayIdx, qIdx, questionId });
  };

  const confirmDeleteQuiz = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuizQuestion(deleteTarget.questionId!);
      showToast('success', 'Question deleted');
      setDays((prev) =>
        prev.map((d, i) =>
          i === deleteTarget.dayIdx
            ? {
                ...d,
                quizQuestions: d.quizQuestions.filter(
                  (_, x) => x !== deleteTarget.qIdx,
                ),
              }
            : d,
        ),
      );
      setDeleteTarget(null);
    } catch (e: any) {
      showToast('error', e.message || 'Delete failed');
    }
  };

  const addChapter = (i: number) =>
    updateDay(i, { chapters: [...days[i].chapters, { book: '', chapter: 1 }] });
  const removeChapter = (i: number, ci: number) =>
    days[i].chapters.length > 1 &&
    updateDay(i, { chapters: days[i].chapters.filter((_, x) => x !== ci) });
  const updateChapter = (i: number, ci: number, p: Partial<Chapter>) =>
    updateDay(i, {
      chapters: days[i].chapters.map((c, x) => (x === ci ? { ...c, ...p } : c)),
    });

  const addReflection = (i: number) =>
    updateDay(i, { reflectionQuestions: [...days[i].reflectionQuestions, ''] });
  const updateReflection = (i: number, ri: number, v: string) =>
    updateDay(i, {
      reflectionQuestions: days[i].reflectionQuestions.map((r, x) =>
        x === ri ? v : r,
      ),
    });
  const removeReflection = (i: number, ri: number) =>
    days[i].reflectionQuestions.length > 1 &&
    updateDay(i, {
      reflectionQuestions: days[i].reflectionQuestions.filter(
        (_, x) => x !== ri,
      ),
    });

  const addQuiz = (i: number) =>
    updateDay(i, { quizQuestions: [...days[i].quizQuestions, emptyQuiz()] });
  const updateQuiz = (i: number, qi: number, p: Partial<QuizQuestion>) =>
    updateDay(i, {
      quizQuestions: days[i].quizQuestions.map((q, x) =>
        x === qi ? { ...q, ...p } : q,
      ),
    });
  const updateQuizOption = (i: number, qi: number, oi: number, v: string) => {
    const opts = [...days[i].quizQuestions[qi].options] as [
      string,
      string,
      string,
      string,
    ];
    opts[oi] = v;
    updateQuiz(i, qi, { options: opts });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading plan…</Text>
      </View>
    );
  }

  if (!meta) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Plan not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDayCard = (day: DayAssignment, dayIdx: number) => {
    const isOpen = expandedDay === day.dayNumber;
    const isSaving = savingDay === day.dayNumber;
    const isExists = day._exists;

    return (
      <View
        key={day.dayNumber}
        style={[
          styles.dayCard,
          isOpen && styles.dayCardOpen,
          isExists && styles.dayCardExists,
          !isExists && styles.dayCardPending,
        ]}
      >
        <TouchableOpacity
          style={styles.dayCardHeader}
          onPress={() => setExpandedDay(isOpen ? -1 : day.dayNumber)}
        >
          <View
            style={[
              styles.dayNumber,
              isExists && styles.dayNumberExists,
              !isExists && styles.dayNumberPending,
            ]}
          >
            {isExists ? (
              <CheckCircle2 size={14} color={theme.success} />
            ) : (
              <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
            )}
          </View>
          <View style={styles.dayInfo}>
            <Text
              style={[
                styles.dayTitle,
                isExists && styles.dayTitleExists,
                !isExists && styles.dayTitleEmpty,
              ]}
            >
              {day.title || `Day ${day.dayNumber} — not configured`}
            </Text>
            {isExists ? (
              <View style={styles.dayMeta}>
                <Text style={styles.dayChapters}>
                  {day.chapters.map((c) => `${c.book} ${c.chapter}`).join(' · ')}
                </Text>
                {day.reflectionQuestions.filter(r => r.trim()).length > 0 && (
                  <Text style={styles.dayMetaItem}>
                    {day.reflectionQuestions.filter(r => r.trim()).length} reflections
                  </Text>
                )}
                {day.quizQuestions.length > 0 && (
                  <Text style={styles.dayMetaItem}>
                    {day.quizQuestions.length} quiz{day.quizQuestions.length > 1 ? 'zes' : ''}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.dayPendingText}>
                Tap to configure
              </Text>
            )}
          </View>
          <View style={styles.dayStatus}>
            {isExists && (
              <Text style={styles.statusUnsaved}>saved</Text>
            )}
            {isOpen ? (
              <ChevronUp size={18} color={theme.muted} />
            ) : (
              <ChevronDown size={18} color={theme.muted} />
            )}
          </View>
        </TouchableOpacity>

        {isOpen && (
          <ScrollView style={styles.dayCardBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Day Title</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={styles.input}
                value={day.title}
                onChangeText={(text) => updateDay(dayIdx, { title: text })}
                placeholder="e.g. Creation — In the beginning"
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Chapters</Text>
                <Text style={styles.required}>*</Text>
              </View>
              {day.chapters.map((ch, ci) => (
                <View key={ci} style={styles.chapterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.bookPicker, { borderColor: theme.border }]}>
                      <Text style={styles.bookPickerText}>
                        {ch.book || 'Select book'}
                      </Text>
                      <ChevronDown size={16} color={theme.muted} />
                    </TouchableOpacity>
                  </ScrollView>
                  <TextInput
                    style={[styles.input, styles.chapterInput]}
                    value={String(ch.chapter)}
                    onChangeText={(text) =>
                      updateChapter(dayIdx, ci, { chapter: parseInt(text) || 1 })
                    }
                    keyboardType="number-pad"
                    placeholder="Ch"
                    placeholderTextColor={theme.muted}
                  />
                  {day.chapters.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeChapter(dayIdx, ci)}
                    >
                      <X size={16} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addLink} onPress={() => addChapter(dayIdx)}>
                <Plus size={14} color={theme.primary} />
                <Text style={styles.addLinkText}>Add Chapter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reflection Questions</Text>
              {day.reflectionQuestions.map((q, ri) => (
                <View key={ri} style={styles.chapterRow}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    value={q}
                    onChangeText={(text) => updateReflection(dayIdx, ri, text)}
                    placeholder={`Reflection ${ri + 1}`}
                    placeholderTextColor={theme.muted}
                  />
                  {day.reflectionQuestions.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeReflection(dayIdx, ri)}
                    >
                      <X size={16} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addLink} onPress={() => addReflection(dayIdx)}>
                <Plus size={14} color={theme.primary} />
                <Text style={styles.addLinkText}>Add Reflection</Text>
              </TouchableOpacity>
            </View>

            {meta.questionsEnabled && (
              <View style={styles.inputGroup}>
                <View style={styles.quizHeader}>
                  <HelpCircle size={16} color="#7c3aed" />
                  <Text style={styles.label}>Quiz Questions</Text>
                </View>
                {day.quizQuestions.map((quiz, qi) => (
                  <View key={qi} style={styles.quizCard}>
                    <View style={styles.quizCardHeader}>
                      <View style={styles.quizBadges}>
                        <Text style={styles.quizNumber}>Q{qi + 1}</Text>
                        {quiz._new && (
                          <Text style={styles.quizNew}>new</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() =>
                          openDeleteQuiz(dayIdx, qi, quiz.questionId)
                        }
                      >
                        <Trash2 size={14} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={quiz.question}
                      onChangeText={(text) =>
                        updateQuiz(dayIdx, qi, { question: text })
                      }
                      placeholder="Question text…"
                      placeholderTextColor={theme.muted}
                      multiline
                    />
                    <View style={styles.optionsGrid}>
                      {quiz.options.map((option, oi) => (
                        <View key={oi} style={styles.optionRow}>
                          <TouchableOpacity
                            style={[
                              styles.optionRadio,
                              quiz.correctAnswer === oi && styles.optionRadioActive,
                            ]}
                            onPress={() =>
                              updateQuiz(dayIdx, qi, { correctAnswer: oi })
                            }
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
                            style={[styles.input, styles.optionInput]}
                            value={option}
                            onChangeText={(text) =>
                              updateQuizOption(dayIdx, qi, oi, text)
                            }
                            placeholder={`Option ${oi + 1}`}
                            placeholderTextColor={theme.muted}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Explanation</Text>
                      <TextInput
                        style={[styles.input, styles.textAreaSmall]}
                        value={quiz.explanation}
                        onChangeText={(text) =>
                          updateQuiz(dayIdx, qi, { explanation: text })
                        }
                        placeholder="Explain why this is correct..."
                        placeholderTextColor={theme.muted}
                        multiline
                      />
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.addLink} onPress={() => addQuiz(dayIdx)}>
                  <Plus size={14} color={theme.primary} />
                  <Text style={styles.addLinkText}>Add Question</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveDayBtn,
                isExists && styles.saveDayBtnPrimary,
              ]}
              onPress={() => saveDay(dayIdx)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={16} color={isExists ? '#fff' : theme.text} />
                  <Text
                    style={[
                      styles.saveDayText,
                      isExists && styles.saveDayTextPrimary,
                    ]}
                  >
                    Save Day {day.dayNumber}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={loadPlan} style={styles.refreshBtn}>
          <RefreshCw size={20} color={theme.muted} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <BookOpen size={20} color={theme.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Edit Plan</Text>
          <Text style={styles.headerSubtitle}>{meta.planId}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={20} color={theme.primary} />
            <Text style={styles.cardTitle}>Plan Info</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Update metadata — days cannot change
          </Text>
          
          <View style={styles.form}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active</Text>
              </View>
              <Switch
                value={meta.isActive}
                onValueChange={(v) => updateMeta('isActive', v)}
                trackColor={{ false: theme.inactiveBg, true: theme.successLight }}
                thumbColor={meta.isActive ? theme.success : theme.inactiveText}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={meta.title}
                onChangeText={(text) => updateMeta('title', text)}
                placeholder="Plan title"
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={meta.description}
                onChangeText={(text) => updateMeta('description', text)}
                placeholder="Brief description…"
                placeholderTextColor={theme.muted}
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.optionsRow}>
                  {CATEGORIES.map((cat) => (
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Difficulty</Text>
              <View style={styles.optionsRow}>
                {DIFFICULTIES.map((diff) => (
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

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <HelpCircle size={20} color={theme.primary} />
                <View>
                  <Text style={styles.switchLabel}>Quiz Questions</Text>
                  <Text style={styles.switchSubLabel}>
                    Enable daily quizzes for readers
                  </Text>
                </View>
              </View>
              <Switch
                value={meta.questionsEnabled}
                onValueChange={(v) => updateMeta('questionsEnabled', v)}
                trackColor={{ false: theme.inactiveBg, true: theme.successLight }}
                thumbColor={
                  meta.questionsEnabled ? theme.success : theme.inactiveText
                }
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                savingMeta && styles.saveBtnDisabled,
              ]}
              onPress={saveMeta}
              disabled={savingMeta}
            >
              {savingMeta ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Info</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Assignments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color={theme.primary} />
            <Text style={styles.cardTitle}>Daily Assignments</Text>
          </View>
          <Text style={styles.daysCount}>{meta.totalDays} days</Text>
          
          <ScrollView style={styles.daysList} showsVerticalScrollIndicator={false}>
            {days.map((day, dayIdx) => renderDayCard(day, dayIdx))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: theme.muted,
      marginTop: 12,
    },
    errorText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    backLink: {
      fontSize: 14,
      color: theme.primary,
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surface,
    },
    backButton: {
      padding: 8,
    },
    refreshBtn: {
      padding: 8,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
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
      flexDirection: 'row',
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
    daysCount: {
      fontSize: 12,
      paddingHorizontal: 16,
      color: theme.textSecondary,
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
      flexDirection: 'row',
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
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    halfInput: {
      flex: 1,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      marginBottom: 16,
    },
    switchInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
      gap: 8,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
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
    dayCardExists: {
      borderColor: theme.border,
    },
    dayCardPending: {
      borderStyle: 'dashed',
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    dayCardHeader: {
      flexDirection: 'row',
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
    dayNumberExists: {
      backgroundColor: theme.success + '20',
    },
    dayNumberPending: {
      backgroundColor: theme.inactiveBg,
    },
    dayNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
    },
    dayInfo: {
      flex: 1,
      marginLeft: 12,
    },
    dayTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    dayTitleExists: {
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
    dayMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    dayMetaItem: {
      fontSize: 10,
      color: theme.primary,
      fontWeight: '600',
    },
    dayPendingText: {
      fontSize: 11,
      color: theme.muted,
      fontStyle: 'italic',
      marginTop: 4,
    },
    dayStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusUnsaved: {
      fontSize: 10,
      color: theme.success,
      fontWeight: '600',
    },
    dayCardBody: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      minHeight: 300,
    },
    chapterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    bookPicker: {
      flexDirection: 'row',
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 4,
    },
    addLinkText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    quizHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    quizCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    quizCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    quizBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    quizNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
    },
    quizNew: {
      fontSize: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.primary + '20',
      color: theme.primary,
      fontWeight: '600',
    },
    optionsGrid: {
      gap: 10,
      marginVertical: 12,
    },
    optionRow: {
      flexDirection: 'row',
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
    saveDayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.inactiveBg,
      gap: 8,
    },
    saveDayBtnPrimary: {
      backgroundColor: theme.primary,
    },
    saveDayText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    saveDayTextPrimary: {
      color: '#fff',
    },
  });

export default EditReadingPlan;