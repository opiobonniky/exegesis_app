import React, { useContext, useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, ChevronLeft, Save } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import { addDailyExegesis, DailyExegesis } from '../../services/adminApi';
import { showToast } from '../../helpers/Toash.helper';

const toLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddDailyExegesis() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = createStyles(COLORS);
  const editing = screenRoute.params?.exegesis as DailyExegesis | undefined;

  const [title, setTitle] = useState('');
  const [passageReference, setPassageReference] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [contextSummary, setContextSummary] = useState('');
  const [teachingBody, setTeachingBody] = useState('');
  const [application, setApplication] = useState('');
  const [prayer, setPrayer] = useState('');
  const [tags, setTags] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title || '');
    setPassageReference(editing.passageReference || '');
    setIntroduction(editing.introduction || '');
    setContextSummary(editing.contextSummary || '');
    setTeachingBody(editing.teachingBody || '');
    setApplication(editing.application || '');
    setPrayer(editing.prayer || '');
    setTags(editing.tags || '');
    setDisplayDate(new Date(editing.displayDate));
    setPublished(editing.isPublished);
  }, [editing]);

  const canSave =
    title.trim() && passageReference.trim() && teachingBody.trim();

  const handleSave = async () => {
    if (!canSave) {
      showToast('error', 'Title, passage, and teaching are required');
      return;
    }

    setSaving(true);
    try {
      await addDailyExegesis(
        {
          title: title.trim(),
          passageReference: passageReference.trim(),
          introduction: introduction.trim() || null,
          contextSummary: contextSummary.trim() || null,
          teachingBody: teachingBody.trim(),
          application: application.trim() || null,
          prayer: prayer.trim() || null,
          tags: tags.trim() || null,
          displayDate: toLocalDateInput(displayDate),
          published,
        },
        editing?.id,
      );
      showToast(
        'success',
        editing ? 'Daily exegesis updated' : 'Daily exegesis published',
      );
      navigation.goBack();
    } catch {
      showToast('error', 'Failed to save daily exegesis');
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
          {editing ? 'Edit Daily Exegesis' : 'Add Daily Exegesis'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Field
          label="Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="The Love of God Revealed"
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Passage Reference *"
          value={passageReference}
          onChangeText={setPassageReference}
          placeholder="John 3:16-21"
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Introduction"
          value={introduction}
          onChangeText={setIntroduction}
          placeholder="Short introduction..."
          multiline
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Context Summary"
          value={contextSummary}
          onChangeText={setContextSummary}
          placeholder="What is happening around this passage?"
          multiline
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Teaching Body *"
          value={teachingBody}
          onChangeText={setTeachingBody}
          placeholder="Verse-by-verse or section teaching..."
          multiline
          tall
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Application"
          value={application}
          onChangeText={setApplication}
          placeholder="How should the reader respond?"
          multiline
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Prayer"
          value={prayer}
          onChangeText={setPrayer}
          placeholder="Prayer prompt..."
          multiline
          styles={styles}
          colors={COLORS}
        />
        <Field
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder="love,gospel,john"
          styles={styles}
          colors={COLORS}
        />

        <Text style={styles.label}>Publish Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Calendar size={18} color={COLORS.primary} />
          <Text style={styles.dateText}>
            {displayDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showDatePicker ? (
          <DateTimePicker
            value={displayDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setDisplayDate(date);
            }}
          />
        ) : null}

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Published</Text>
            <Text style={styles.switchSubtitle}>Visible to readers</Text>
          </View>
          <Switch value={published} onValueChange={setPublished} />
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
            {editing ? 'Update Exegesis' : 'Save Exegesis'}
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
  tall,
  styles,
  colors,
}: any) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          tall && styles.tallArea,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
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
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: COLORS.text,
      fontSize: 18,
      fontWeight: '800',
    },
    content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    fieldGroup: { marginBottom: SPACING.md },
    label: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 7,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      color: COLORS.text,
      backgroundColor: COLORS.cardBackground,
      fontSize: 15,
    },
    textArea: { minHeight: 96, paddingTop: 12, lineHeight: 21 },
    tallArea: { minHeight: 160 },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: COLORS.cardBackground,
      marginBottom: SPACING.md,
    },
    dateText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      marginBottom: SPACING.lg,
    },
    switchTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
    switchSubtitle: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: COLORS.primary,
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
