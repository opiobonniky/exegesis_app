import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, ChevronLeft, Save } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  parseOptions,
  saveTriviaQuestion,
  TriviaQuestionResponse,
} from '../trivia/services/triviaApi';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export default function AddTriviaQuestion() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const editing = screenRoute.params?.question as
    | TriviaQuestionResponse
    | undefined;

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [category, setCategory] = useState('general');
  const [difficulty, setDifficulty] =
    useState<(typeof DIFFICULTIES)[number]>('medium');
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const parsedOptions = parseOptions(editing.optionsJson);
    setQuestion(editing.question || '');
    setOptions([...parsedOptions, '', '', '', ''].slice(0, 4));
    setCorrectAnswer(editing.correctAnswer ?? 0);
    setExplanation(editing.explanation || '');
    setCategory(editing.category || 'general');
    setDifficulty(
      editing.difficulty === 'easy' || editing.difficulty === 'hard'
        ? editing.difficulty
        : 'medium',
    );
    setBookName(editing.bookName || '');
    setChapter(editing.chapter ? String(editing.chapter) : '');
    setVerseNumber(editing.verseNumber ? String(editing.verseNumber) : '');
    setIsActive(editing.isActive !== false);
  }, [editing]);

  const filledOptions = options.map(opt => opt.trim()).filter(Boolean);
  const canSave = question.trim() && filledOptions.length >= 2;

  const updateOption = (index: number, value: string) => {
    setOptions(prev => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleSave = async () => {
    if (!canSave) {
      showToast('error', 'Question and at least two options are required');
      return;
    }

    if (correctAnswer >= filledOptions.length) {
      showToast('error', 'Select a correct answer that has option text');
      return;
    }

    setSaving(true);
    try {
      await saveTriviaQuestion({
        id: editing?.id,
        question: question.trim(),
        optionsJson: JSON.stringify(filledOptions),
        correctAnswer,
        explanation: explanation.trim() || null,
        category: category.trim() || 'general',
        difficulty,
        bookName: bookName.trim() || null,
        chapter: chapter ? Number(chapter) : null,
        verseNumber: verseNumber ? Number(verseNumber) : null,
        isActive,
      });
      showToast(
        'success',
        editing ? 'Trivia question updated' : 'Trivia question created',
      );
      navigation.goBack();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save trivia question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editing ? 'Edit Trivia Question' : 'Add Trivia Question'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Field
          label="Question *"
          value={question}
          onChangeText={setQuestion}
          placeholder="Who built the ark?"
          multiline
          styles={styles}
          colors={COLORS}
        />

        <Text style={styles.label}>Answer Options *</Text>
        <View style={styles.optionsGrid}>
          {options.map((option, index) => {
            const active = correctAnswer === index;
            return (
              <View key={index} style={styles.optionFieldWrap}>
                <TouchableOpacity
                  style={[
                    styles.correctBadge,
                    active && styles.correctBadgeActive,
                  ]}
                  onPress={() => setCorrectAnswer(index)}
                  activeOpacity={0.8}
                >
                  {active ? <Check size={14} color="#fff" /> : null}
                  <Text
                    style={[
                      styles.correctBadgeText,
                      active && styles.correctBadgeTextActive,
                    ]}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.optionInput}
                  value={option}
                  onChangeText={text => updateOption(index, text)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={COLORS.muted}
                  multiline
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map(item => {
            const active = difficulty === item;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.difficultyChip,
                  active && styles.difficultyChipActive,
                ]}
                onPress={() => setDifficulty(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    active && styles.difficultyTextActive,
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field
          label="Category"
          value={category}
          onChangeText={setCategory}
          placeholder="creation, gospel, prophets"
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Explanation"
          value={explanation}
          onChangeText={setExplanation}
          placeholder="Explain the answer briefly..."
          multiline
          styles={styles}
          colors={COLORS}
        />

        <Text style={styles.sectionTitle}>Optional Scripture Reference</Text>
        <Field
          label="Book"
          value={bookName}
          onChangeText={setBookName}
          placeholder="Genesis"
          styles={styles}
          colors={COLORS}
        />
        <View style={styles.referenceRow}>
          <Field
            label="Chapter"
            value={chapter}
            onChangeText={setChapter}
            placeholder="6"
            keyboardType="number-pad"
            styles={styles}
            colors={COLORS}
            compact
          />
          <Field
            label="Verse"
            value={verseNumber}
            onChangeText={setVerseNumber}
            placeholder="14"
            keyboardType="number-pad"
            styles={styles}
            colors={COLORS}
            compact
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Active</Text>
            <Text style={styles.switchSubtitle}>Available to players</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!canSave || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Save size={19} color="#fff" />
          )}
          <Text style={styles.saveText}>
            {editing ? 'Update Question' : 'Save Question'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  styles,
  colors,
  compact,
}: any) {
  return (
    <View style={[styles.fieldGroup, compact && styles.compactField]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    backButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: COLORS.text,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    content: { padding: 16, paddingBottom: 40 },
    fieldGroup: { marginBottom: SPACING.md },
    compactField: { flex: 1 },
    label: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 7,
    },
    input: {
      color: COLORS.text,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
    },
    multilineInput: { minHeight: 96, textAlignVertical: 'top' },
    optionsGrid: { gap: 10, marginBottom: SPACING.md },
    optionFieldWrap: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
      padding: 10,
      borderRadius: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    correctBadge: {
      width: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    correctBadgeActive: {
      backgroundColor: COLORS.success,
      borderColor: COLORS.success,
    },
    correctBadgeText: { color: COLORS.muted, fontSize: 13, fontWeight: '900' },
    correctBadgeTextActive: { color: '#fff' },
    optionInput: {
      flex: 1,
      color: COLORS.text,
      minHeight: 44,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    difficultyRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
    difficultyChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    difficultyChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    difficultyText: { color: COLORS.muted, fontSize: 13, fontWeight: '800' },
    difficultyTextActive: { color: '#fff' },
    sectionTitle: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: SPACING.sm,
    },
    referenceRow: { flexDirection: 'row', gap: 10 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      marginBottom: SPACING.lg,
    },
    switchTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
    switchSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 18,
      backgroundColor: COLORS.primary,
    },
    saveButtonDisabled: { opacity: 0.55 },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
