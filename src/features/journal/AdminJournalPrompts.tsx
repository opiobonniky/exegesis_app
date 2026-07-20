/**
 * AdminJournalPrompts.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin journal prompts management screen
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  getAllJournalPrompts,
  createJournalPrompt,
  updateJournalPrompt,
  deleteJournalPrompt,
  JournalPrompt,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  X,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { ALL_BOOKS } from '../../constants/bibleBooks';

const CATEGORIES = [
  { value: 'general' },
  { value: 'study' },
  { value: 'prayer' },
  { value: 'gratitude' },
  { value: 'reflection' },
  { value: 'application' },
  { value: 'explanation' },
];

const getCategoryLabel = (value: string, jc: any): string => {
  const labels: Record<string, string> = {
    general: jc?.categoryGeneral || 'General',
    study: jc?.categoryStudy || 'Study',
    prayer: jc?.categoryPrayer || 'Prayer',
    gratitude: jc?.categoryGratitude || 'Gratitude',
    reflection: jc?.categoryReflection || 'Reflection',
    application: jc?.categoryApplication || 'Application',
    explanation: jc?.categoryExplanation || 'Verse Explanation',
  };
  return labels[value] || value;
};

const BOOKS = ALL_BOOKS;

const isIOS = Platform.OS === 'ios';

const AdminJournalPrompts = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<JournalPrompt | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [promptText, setPromptText] = useState('');
  const [promptCategory, setPromptCategory] = useState('general');
  const [promptDescription, setPromptDescription] = useState('');
  const [promptOrder, setPromptOrder] = useState('0');
  const [promptIsActive, setPromptIsActive] = useState(true);
  const [promptBook, setPromptBook] = useState('');
  const [promptChapter, setPromptChapter] = useState('');
  const [promptVerse, setPromptVerse] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const payload: any = {};
      if (category !== 'all') payload.category = category;
      payload.isActive = true;

      const res = await getAllJournalPrompts(payload);
      if (res.returnCode === 200 && res.returnData) {
        setPrompts(res.returnData);
      }
    } catch (error) {
      showToast('error', jc?.failedToLoadEntry || 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [category, jc]);

  useEffect(() => {
    fetchPrompts();
  }, [category]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrompts().then(() => setRefreshing(false));
  };

  const openModal = (prompt?: JournalPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptText(prompt.prompt);
      setPromptCategory(prompt.category);
      setPromptDescription(prompt.description || '');
      setPromptOrder(String(prompt.order));
      setPromptIsActive(prompt.isActive);
      setPromptBook(prompt.bookName || '');
      setPromptChapter(prompt.chapter ? String(prompt.chapter) : '');
      setPromptVerse(prompt.verseNumber ? String(prompt.verseNumber) : '');
    } else {
      setEditingPrompt(null);
      setPromptText('');
      setPromptCategory('general');
      setPromptDescription('');
      setPromptOrder('0');
      setPromptIsActive(true);
      setPromptBook('');
      setPromptChapter('');
      setPromptVerse('');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!promptText.trim()) {
      showToast('error', jc?.promptRequired || 'Please enter a prompt');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        prompt: promptText.trim(),
        category: promptCategory,
        description: promptDescription.trim() || undefined,
        order: parseInt(promptOrder, 10) || 0,
        isActive: promptIsActive,
      };

      if (promptBook.trim()) data.bookName = promptBook.trim();
      if (promptChapter) data.chapter = parseInt(promptChapter, 10);
      if (promptVerse) data.verseNumber = parseInt(promptVerse, 10);

      let res;
      if (editingPrompt) {
        data.id = editingPrompt.id;
        res = await updateJournalPrompt(data);
      } else {
        res = await createJournalPrompt(data);
      }

      if (res.returnCode === 200) {
        showToast('success', editingPrompt ? (jc?.promptUpdated || 'Prompt updated') : (jc?.promptCreated || 'Prompt created'));
        setShowModal(false);
        fetchPrompts();
      } else {
        showToast('error', res.returnMessage || (jc?.failedToSave || 'Failed to save'));
      }
    } catch (error) {
      showToast('error', jc?.failedToSave || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteJournalPrompt(id);
      if (res.returnCode === 200) {
        showToast('success', jc?.promptDeleted || 'Prompt deleted');
        fetchPrompts();
      }
    } catch (error) {
      showToast('error', jc?.failedToDeleteEntry || 'Failed to delete prompt');
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      study: '#3B82F6',
      prayer: '#8B5CF6',
      gratitude: '#F59E0B',
      reflection: '#10B981',
      application: '#EF4444',
      explanation: '#EC4899',
      general: '#6B7280',
    };
    return colors[cat] || colors.general;
  };

  const renderPrompt = ({ item }: { item: JournalPrompt }) => (
    <View style={[styles.promptCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
      <View style={[styles.promptHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
            {getCategoryLabel(item.category, jc)}
          </Text>
        </View>
        <View style={[styles.promptActions, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => openModal(item)}>
            <Edit2 size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.promptText, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>{item.prompt}</Text>

      {item.description && (
        <Text style={[styles.promptDescription, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {item.bookName && (
        <View style={[styles.scriptureRef, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <BookOpen size={12} color={COLORS.muted} />
          <Text style={[styles.scriptureText, { color: COLORS.muted }]}>
            {item.bookName} {item.chapter}:{item.verseNumber || 'all'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background },{paddingTop: isIOS ? SPACING.xxxl : 0}]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
          {isRtl ? <ChevronRight size={20} color={COLORS.primary} /> : <ChevronLeft size={20} color={COLORS.primary} />}
          <Text style={[styles.backText, { color: COLORS.primary }]}>{jc?.backLabel || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{jc?.journalPrompts || 'Journal Prompts'}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: COLORS.primary }]}
          onPress={() => openModal()}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: COLORS.surface, borderColor: COLORS.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Search size={18} color={COLORS.muted} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}
            placeholder={jc?.searchPromptsPlaceholder || 'Search prompts...'}
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ value: 'all' }, ...CATEGORIES]}
          keyExtractor={item => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === item.value ? COLORS.primary : COLORS.surface,
                  borderColor: category === item.value ? COLORS.primary : COLORS.border,
                },
              ]}
              onPress={() => setCategory(item.value)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: category === item.value ? '#FFFFFF' : COLORS.text },
                ]}
              >
                {item.value === 'all' ? (jc?.categoryAll || 'All') : getCategoryLabel(item.value, jc)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Prompts List */}
      <FlatList
        data={prompts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPrompt}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Loader2 size={32} color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: COLORS.muted }]}>{jc?.noPromptsFound || 'No prompts found'}</Text>
            </View>
          )
        }
      />

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.modalHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                {editingPrompt ? (jc?.editPrompt || 'Edit Prompt') : (jc?.newPrompt || 'New Prompt')}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
              value={promptText}
              onChangeText={setPromptText}
              placeholder={jc?.enterPromptPlaceholder || 'Enter prompt...'}
              placeholderTextColor={COLORS.muted}
              multiline
            />

            <TextInput
              style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
              value={promptDescription}
              onChangeText={setPromptDescription}
              placeholder={jc?.promptDescriptionPlaceholder || 'Description (optional)'}
              placeholderTextColor={COLORS.muted}
            />

            <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>{jc?.orderLabel || 'Order'}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                  value={promptOrder}
                  onChangeText={setPromptOrder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>{jc?.activeLabel || 'Active'}</Text>
                <Switch value={promptIsActive} onValueChange={setPromptIsActive} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.bookSelector, { backgroundColor: COLORS.surface, borderColor: COLORS.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
              onPress={() => setShowBookPicker(!showBookPicker)}
            >
              <Text style={[styles.bookSelectorText, { color: promptBook ? COLORS.text : COLORS.muted }]}>
                {promptBook || (jc?.selectBookPlaceholder || 'Select Book (optional)')}
              </Text>
              <ChevronDown size={18} color={COLORS.muted} />
            </TouchableOpacity>

            {showBookPicker && (
              <View style={[styles.bookList, { backgroundColor: COLORS.surface }]}>
                <FlatList
                  data={BOOKS}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.bookItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                      onPress={() => {
                        setPromptBook(item);
                        setShowBookPicker(false);
                      }}
                    >
                      <Text style={{ color: COLORS.text }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 200 }}
                />
              </View>
            )}

            <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <TextInput
                style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={promptChapter}
                onChangeText={setPromptChapter}
                placeholder={jc?.chapterFieldLabel || 'Chapter'}
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={promptVerse}
                onChangeText={setPromptVerse}
                placeholder={jc?.verseOptionalLabel || 'Verse (optional)'}
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: COLORS.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? (jc?.savingLabel || 'Saving...') : (jc?.savePrompt || 'Save Prompt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backText: { fontSize: FONT_SIZES.md, fontWeight: '600' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600' },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 12, borderWidth: 1, gap: SPACING.sm },
  searchInput: { flex: 1, fontSize: FONT_SIZES.md },
  categoryContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  categoryChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 20, marginRight: SPACING.sm, borderWidth: 1 },
  categoryChipText: { fontSize: FONT_SIZES.sm, fontWeight: '500' },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  promptCard: { padding: SPACING.md, borderRadius: 12, marginBottom: SPACING.md, borderWidth: 1 },
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  categoryBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  promptActions: { flexDirection: 'row', gap: SPACING.md },
  promptText: { fontSize: FONT_SIZES.md, marginBottom: SPACING.xs },
  promptDescription: { fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs },
  scriptureRef: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  scriptureText: { fontSize: FONT_SIZES.xs },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZES.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: SPACING.md, fontSize: FONT_SIZES.md, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  halfInput: { flex: 1 },
  label: { fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs },
  bookSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderRadius: 12, borderWidth: 1, marginBottom: SPACING.md },
  bookSelectorText: { fontSize: FONT_SIZES.md },
  bookList: { maxHeight: 200, borderRadius: 12, marginBottom: SPACING.md },
  bookItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  saveButton: { padding: SPACING.md, borderRadius: 12, alignItems: 'center', marginTop: SPACING.md },
  saveButtonText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '600' },
});

export default AdminJournalPrompts;
