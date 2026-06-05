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
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  getAllJournalTemplates,
  createJournalTemplate,
  deleteJournalTemplate,
  JournalTemplate,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  X,
  Star,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const CATEGORIES = [
  { value: 'general' },
  { value: 'study' },
  { value: 'prayer' },
  { value: 'gratitude' },
  { value: 'reflection' },
];

const getCategoryLabel = (value: string, jc: any): string => {
  const labels: Record<string, string> = {
    general: jc?.categoryGeneral || 'General',
    study: jc?.categoryStudy || 'Study',
    prayer: jc?.categoryPrayer || 'Prayer',
    gratitude: jc?.categoryGratitude || 'Gratitude',
    reflection: jc?.categoryReflection || 'Reflection',
  };
  return labels[value] || value;
};


const isIOS = Platform.OS === 'ios';

const AdminJournalTemplates = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const [templatePrompts, setTemplatePrompts] = useState<string[]>(['']);
  const [isDefault, setIsDefault] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllJournalTemplates();
      if (res.returnCode === 200 && res.returnData) {
        let data = res.returnData;
        if (category !== 'all') {
          data = data.filter((t: JournalTemplate) => t.category === category);
        }
        setTemplates(data);
      }
    } catch (error) {
      showToast('error', jc?.templateDeleted || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [category, jc]);

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates().then(() => setRefreshing(false));
  };

  const openModal = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('general');
    setTemplatePrompts(['']);
    setIsDefault(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!templateName.trim() || !templatePrompts.some(p => p.trim())) {
      showToast('error', jc?.nameAndPromptRequired || 'Name and at least one prompt are required');
      return;
    }

    setSaving(true);
    try {
      const data:any = {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        category: templateCategory,
        prompts: templatePrompts.filter(p => p.trim()),
        isDefault,
        isActive: true,
      };

      const res = await createJournalTemplate(data);

      if (res.returnCode === 200) {
        showToast('success', jc?.templateCreated || 'Template created');
        setShowModal(false);
        fetchTemplates();
      } else {
        showToast('error', res.returnMessage || (jc?.nameAndPromptRequired || 'Failed to create'));
      }
    } catch (error) {
      showToast('error', jc?.nameAndPromptRequired || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteJournalTemplate(id);
      if (res.returnCode === 200) {
        showToast('success', jc?.templateDeleted || 'Template deleted');
        fetchTemplates();
      }
    } catch (error) {
      showToast('error', jc?.nameAndPromptRequired || 'Failed to delete template');
    }
  };

  const addPromptField = () => {
    setTemplatePrompts([...templatePrompts, '']);
  };

  const removePromptField = (index: number) => {
    if (templatePrompts.length > 1) {
      setTemplatePrompts(templatePrompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, value: string) => {
    setTemplatePrompts(templatePrompts.map((p, i) => (i === index ? value : p)));
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      study: '#3B82F6',
      prayer: '#8B5CF6',
      gratitude: '#F59E0B',
      reflection: '#10B981',
      general: '#6B7280',
    };
    return colors[cat] || colors.general;
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderTemplate = ({ item }: { item: JournalTemplate }) => (
    <View style={[styles.templateCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
      <View style={[styles.templateHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
            {getCategoryLabel(item.category, jc)}
          </Text>
        </View>
        {item.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: '#FEF3C7', flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Star size={10} color="#D97706" />
            <Text style={[styles.defaultText, { color: '#D97706' }]}>{jc?.defaultBadge || 'Default'}</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.templateName, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>{item.name}</Text>

      {item.description && (
        <Text style={[styles.templateDescription, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.promptsPreview}>
        <Text style={[styles.promptsLabel, { color: COLORS.muted }]}>
          {(jc?.promptsCount || '{count} Prompts:').replace('{count}', String(item.prompts.length))}
        </Text>
        {item.prompts.slice(0, 3).map((prompt, idx) => (
          <Text key={idx} style={[styles.promptItem, { color: COLORS.textSecondary }]} numberOfLines={1}>
            • {prompt}
          </Text>
        ))}
        {item.prompts.length > 3 && (
          <Text style={[styles.moreText, { color: COLORS.muted }]}>
            {(jc?.morePrompts || '+{count} more...').replace('{count}', String(item.prompts.length - 3))}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface, flexDirection: isRtl ? 'row-reverse' : 'row' },{paddingTop: isIOS ? 1.2*SPACING.xxxl : 10}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
          {isRtl ? <ChevronRight size={20} color={COLORS.primary} /> : <ChevronLeft size={20} color={COLORS.primary} />}
          <Text style={[styles.backText, { color: COLORS.primary }]}>{jc?.backLabel || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{jc?.journalTemplates || 'Journal Templates'}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: COLORS.primary }]}
          onPress={openModal}
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
            placeholder={jc?.searchTemplatesPlaceholder || 'Search templates...'}
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

      {/* Templates List */}
      <FlatList
        data={filteredTemplates}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTemplate}
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
              <LayoutTemplate size={48} color={COLORS.muted} />
              <Text style={[styles.emptyText, { color: COLORS.muted }]}>{jc?.noTemplatesFound || 'No templates found'}</Text>
              <Text style={[styles.emptySubtext, { color: COLORS.muted }]}>
                {jc?.noTemplatesSubtitle || 'Create templates to help users journal consistently'}
              </Text>
            </View>
          )
        }
      />

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.modalHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>{jc?.addTemplate || 'Add Template'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={jc?.templateNamePlaceholder || 'Template Name'}
                placeholderTextColor={COLORS.muted}
              />

              <TextInput
                style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                value={templateDescription}
                onChangeText={setTemplateDescription}
                placeholder={jc?.templateDescriptionPlaceholder || 'Description (optional)'}
                placeholderTextColor={COLORS.muted}
                multiline
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: COLORS.textSecondary }]}>{jc?.templateCategoryLabel || 'Category'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.categoryOption,
                          {
                            backgroundColor: templateCategory === cat.value ? COLORS.primary : COLORS.surface,
                            borderColor: templateCategory === cat.value ? COLORS.primary : COLORS.border,
                          },
                        ]}
                        onPress={() => setTemplateCategory(cat.value)}
                      >
                        <Text style={{ color: templateCategory === cat.value ? '#FFFFFF' : COLORS.text, fontSize: FONT_SIZES.sm }}>
                          {getCategoryLabel(cat.value, jc)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={[styles.switchRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.switchLabel, { color: COLORS.text }]}>{jc?.defaultTemplateLabel || 'Set as default template'}</Text>
                <Switch value={isDefault} onValueChange={setIsDefault} />
              </View>

              <Text style={[styles.label, { color: COLORS.textSecondary }]}>{jc?.promptsLabel || 'Prompts:'}</Text>
              {templatePrompts.map((prompt, idx) => (
                <View key={idx} style={[styles.promptRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[styles.promptInput, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                    value={prompt}
                    onChangeText={v => updatePrompt(idx, v)}
                    placeholder={`${jc?.promptsLabel || 'Prompt'} ${idx + 1}`}
                    placeholderTextColor={COLORS.muted}
                    multiline
                  />
                  {templatePrompts.length > 1 && (
                    <TouchableOpacity onPress={() => removePromptField(idx)} style={styles.removeButton}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={[styles.addPromptButton, { borderColor: COLORS.border }]} onPress={addPromptField}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={[styles.addPromptText, { color: COLORS.primary }]}>{jc?.addPrompt || 'Add Prompt'}</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: COLORS.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? (jc?.savingLabel || 'Saving...') : (jc?.createTemplate || 'Create Template')}</Text>
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
  templateCard: { padding: SPACING.md, borderRadius: 12, marginBottom: SPACING.md, borderWidth: 1 },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  categoryBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8 },
  defaultText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  templateName: { fontSize: FONT_SIZES.md, fontWeight: '600', marginBottom: SPACING.xs },
  templateDescription: { fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm },
  promptsPreview: { marginTop: SPACING.sm },
  promptsLabel: { fontSize: FONT_SIZES.xs, fontWeight: '500', marginBottom: 4 },
  promptItem: { fontSize: FONT_SIZES.xs, marginLeft: SPACING.sm },
  moreText: { fontSize: FONT_SIZES.xs, marginLeft: SPACING.sm, marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZES.md, marginTop: SPACING.md },
  emptySubtext: { fontSize: FONT_SIZES.sm, marginTop: SPACING.xs, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600' },
  modalBody: { maxHeight: '60%' },
  input: { borderWidth: 1, borderRadius: 12, padding: SPACING.md, fontSize: FONT_SIZES.md, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  halfInput: { flex: 1 },
  label: { fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs },
  categoryPicker: { flexDirection: 'row' },
  categoryOption: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 12, marginRight: SPACING.sm, borderWidth: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  switchLabel: { fontSize: FONT_SIZES.md },
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  promptInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: SPACING.md, fontSize: FONT_SIZES.md, minHeight: 60 },
  removeButton: { padding: SPACING.sm },
  addPromptButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.md, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: SPACING.md },
  addPromptText: { fontSize: FONT_SIZES.md, fontWeight: '500', marginLeft: SPACING.sm },
  saveButton: { padding: SPACING.md, borderRadius: 12, alignItems: 'center', marginTop: SPACING.md },
  saveButtonText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '600' },
});

export default AdminJournalTemplates;
