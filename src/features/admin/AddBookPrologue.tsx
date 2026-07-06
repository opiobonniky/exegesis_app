import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import { BookPrologue, upsertAdminBookPrologue } from '../../services/bookProloguesApi';

export default function AddBookPrologue() {
  const navigation = useNavigation<any>();
  const screenRoute = useRoute<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const editing = screenRoute.params?.prologue as BookPrologue | undefined;
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [audience, setAudience] = useState('');
  const [dateWritten, setDateWritten] = useState('');
  const [locationWritten, setLocationWritten] = useState('');
  const [purpose, setPurpose] = useState('');
  const [keyTheme, setKeyTheme] = useState('');
  const [summary, setSummary] = useState('');
  const [mainThemes, setMainThemes] = useState('');
  const [christConnection, setChristConnection] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setBookName(editing.bookName || '');
    setAuthor(editing.author || '');
    setAudience(editing.audience || '');
    setDateWritten(editing.dateWritten || '');
    setLocationWritten(editing.locationWritten || '');
    setPurpose(editing.purpose || '');
    setKeyTheme(editing.keyTheme || '');
    setSummary(editing.summary || '');
    setMainThemes(Array.isArray(editing.mainThemes) ? editing.mainThemes.join('\n') : '');
    setChristConnection(editing.christConnection || '');
  }, [editing]);

  const handleSave = async () => {
    if (!bookName.trim()) {
      showToast('error', 'Book name is required');
      return;
    }
    setSaving(true);
    try {
      await upsertAdminBookPrologue({
        bookName: bookName.trim(),
        author: author.trim() || null,
        audience: audience.trim() || null,
        dateWritten: dateWritten.trim() || null,
        locationWritten: locationWritten.trim() || null,
        purpose: purpose.trim() || null,
        keyTheme: keyTheme.trim() || null,
        summary: summary.trim() || null,
        mainThemes: mainThemes.split('\n').map(t => t.trim()).filter(Boolean),
        christConnection: christConnection.trim() || null,
      });
      showToast('success', editing ? 'Book prologue updated' : 'Book prologue created');
      navigation.goBack();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save book prologue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><ChevronLeft size={24} color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit Book Prologue' : 'Add Book Prologue'}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label="Book *" value={bookName} onChangeText={setBookName} editable={!editing} styles={styles} colors={COLORS} />
        <Field label="Author" value={author} onChangeText={setAuthor} styles={styles} colors={COLORS} />
        <Field label="Audience" value={audience} onChangeText={setAudience} styles={styles} colors={COLORS} />
        <Field label="Date Written" value={dateWritten} onChangeText={setDateWritten} styles={styles} colors={COLORS} />
        <Field label="Location" value={locationWritten} onChangeText={setLocationWritten} styles={styles} colors={COLORS} />
        <Field label="Purpose" value={purpose} onChangeText={setPurpose} multiline styles={styles} colors={COLORS} />
        <Field label="Key Theme" value={keyTheme} onChangeText={setKeyTheme} styles={styles} colors={COLORS} />
        <Field label="Summary" value={summary} onChangeText={setSummary} multiline styles={styles} colors={COLORS} />
        <Field label="Main Themes (one per line)" value={mainThemes} onChangeText={setMainThemes} multiline styles={styles} colors={COLORS} />
        <Field label="Christ-Centered Connection" value={christConnection} onChangeText={setChristConnection} multiline styles={styles} colors={COLORS} />
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Save size={18} color="#fff" />}
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Book Prologue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, styles, colors, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={[styles.input, props.multiline && styles.textarea, props.editable === false && styles.inputDisabled]} placeholderTextColor={colors.muted} />
    </View>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 42 },
  fieldWrap: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputDisabled: { opacity: 0.65 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  saveButton: { marginTop: 8, height: 52, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
