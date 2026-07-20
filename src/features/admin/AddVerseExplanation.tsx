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
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  addVerseExplanation,
  VerseExplanationItem,
} from '../../services/adminApi';
import BookPickerModal from './components/BookPickerModal';
import NumberPickerModal from './components/NumberPickerModal';

export default function AddVerseExplanation() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const editing = screenRoute.params?.explanation as VerseExplanationItem | undefined;
  const isEditing = !!editing;

  const [bookName, setBookName] = useState('Genesis');
  const [chapter, setChapter] = useState('1');
  const [verseNumber, setVerseNumber] = useState('1');
  const [explanation, setExplanation] = useState('');
  const [learnMore, setLearnMore] = useState('');
  const [bibleVersion, setBibleVersion] = useState('BSB');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);

  useEffect(() => {
    if (editing) {
      setBookName(editing.bookName || 'Genesis');
      setChapter(String(editing.chapter || 1));
      setVerseNumber(String(editing.verseNumber || 1));
      setExplanation(editing.explanation || '');
      setLearnMore(editing.learnMore || '');
      setBibleVersion(editing.bibleVersion || 'BSB');
    }
  }, [editing]);

  const handleSave = async () => {
    if (!bookName.trim() || !chapter || !verseNumber) {
      showToast('error', 'Book, chapter, and verse are required');
      return;
    }

    const ch = Number(chapter);
    const vs = Number(verseNumber);
    if (!ch || !vs) {
      showToast('error', 'Chapter and verse must be valid numbers');
      return;
    }

    if (!explanation.trim() && !learnMore.trim()) {
      showToast('error', 'At least explanation or learn more content is required');
      return;
    }

    setSaving(true);
    try {
      await addVerseExplanation({
        id: editing?.id,
        bookName: bookName.trim(),
        chapter: ch,
        verseNumber: vs,
        explanation: explanation.trim() || undefined,
        learnMore: learnMore.trim() || undefined,
        bibleVersion: bibleVersion || undefined,
      });
      showToast('success', isEditing ? 'Explanation updated' : 'Explanation created');
      navigation.goBack();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!bookName.trim() || !chapter || !verseNumber) {
      showToast('error', 'Select book, chapter, and verse first');
      return;
    }
    setGenerating(true);
    try {
      const { sendPostRequest } = await import('../../services/api');
      const res = await sendPostRequest<any>('bible', 'generate-verse-explanation', {
        bookName: bookName.trim(),
        chapter: Number(chapter),
        verseNumber: Number(verseNumber),
      });
      if (res.returnCode === 200 && res.returnData) {
        if (res.returnData.explanation) setExplanation(res.returnData.explanation);
        if (res.returnData.learnMore) setLearnMore(res.returnData.learnMore);
        showToast('success', 'Explanation generated');
      } else {
        showToast('error', res.returnMessage || 'Generation failed');
      }
    } catch {
      showToast('error', 'AI generation not available');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Explanation' : 'Add Explanation'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bible Reference */}
        <Text style={styles.sectionTitle}>Bible Reference</Text>
        <View style={styles.refRow}>
          <TouchableOpacity
            style={[styles.refPicker, { flex: 2, borderColor: COLORS.border }]}
            onPress={() => setShowBookPicker(true)}
          >
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={[styles.refPickerText, { color: COLORS.text }]}>{bookName}</Text>
            <ChevronDown size={14} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refPicker, { flex: 1, borderColor: COLORS.border }]}
            onPress={() => setShowChapterPicker(true)}
          >
            <Text style={[styles.refPickerText, { color: COLORS.text }]}>Ch. {chapter}</Text>
            <ChevronDown size={14} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refPicker, { flex: 1, borderColor: COLORS.border }]}
            onPress={() => setShowVersePicker(true)}
          >
            <Text style={[styles.refPickerText, { color: COLORS.text }]}>V. {verseNumber}</Text>
            <ChevronDown size={14} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Generate AI */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <Sparkles size={16} color={COLORS.primary} />
          )}
          <Text style={styles.generateText}>
            {generating ? 'Generating...' : 'Generate with AI'}
          </Text>
        </TouchableOpacity>

        {/* Explanation */}
        <Text style={styles.fieldLabel}>Explanation</Text>
        <TextInput
          style={styles.textarea}
          value={explanation}
          onChangeText={setExplanation}
          placeholder="Write the verse explanation..."
          placeholderTextColor={COLORS.muted}
          multiline
          textAlignVertical="top"
        />

        {/* Learn More */}
        <Text style={styles.fieldLabel}>Learn More</Text>
        <TextInput
          style={styles.textarea}
          value={learnMore}
          onChangeText={setLearnMore}
          placeholder="Additional content for 'Learn More' section..."
          placeholderTextColor={COLORS.muted}
          multiline
          textAlignVertical="top"
        />

        {/* Bible Version */}
        <Text style={styles.fieldLabel}>Bible Version</Text>
        <TextInput
          style={styles.input}
          value={bibleVersion}
          onChangeText={setBibleVersion}
          placeholder="e.g. BSB, KJV, NIV"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Save size={18} color="#fff" />
          )}
          <Text style={styles.saveText}>
            {saving ? 'Saving...' : isEditing ? 'Update Explanation' : 'Save Explanation'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BookPickerModal
        visible={showBookPicker}
        selectedBook={bookName}
        onSelect={(book) => setBookName(book)}
        onClose={() => setShowBookPicker(false)}
        colors={COLORS}
      />

      <NumberPickerModal
        visible={showChapterPicker}
        title="Chapter"
        initialValue={chapter}
        onSelect={(value) => {
          setChapter(value);
          setShowChapterPicker(false);
        }}
        onClose={() => setShowChapterPicker(false)}
        colors={COLORS}
      />

      <NumberPickerModal
        visible={showVersePicker}
        title="Verse"
        initialValue={verseNumber}
        onSelect={(value) => {
          setVerseNumber(value);
          setShowVersePicker(false);
        }}
        onClose={() => setShowVersePicker(false)}
        colors={COLORS}
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 42 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  refRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  refPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, backgroundColor: COLORS.cardBackground },
  refPickerText: { fontSize: 14, fontWeight: '700', flex: 1 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, height: 44, backgroundColor: COLORS.primary + '10', marginBottom: 20 },
  generateText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  fieldLabel: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  textarea: { minHeight: 140, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, lineHeight: 20, textAlignVertical: 'top', marginBottom: 16 },
  saveButton: { marginTop: 8, height: 52, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
