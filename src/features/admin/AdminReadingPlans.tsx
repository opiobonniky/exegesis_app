/**
 * AdminReadingPlans.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reading plans management for admins - list, create, edit
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getAllReadingPlansAdmin,
  createReadingPlan,
  deleteReadingPlan,
  ReadingPlan,
} from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';

const AdminReadingPlans: React.FC = () => {
  const navigation = useNavigation<any>();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('adminPlans');

  const [form, setForm] = useState({
    title: '',
    description: '',
    totalDays: '',
    category: 'General',
    difficulty: 'Easy',
    questionsEnabled: false,
    isActive: true,
  });

  const categories = ['General', 'Chronological', 'Topical', 'Genre', 'Character'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const fetchPlans = useCallback(async (pg: number = 1) => {
    try {
      const response = await getAllReadingPlansAdmin(pg, 20);
      setPlans(response.plans || []);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlans(page);
    setRefreshing(false);
  }, [fetchPlans, page]);

  const openAddModal = () => {
    setForm({
      title: '',
      description: '',
      totalDays: '',
      category: 'General',
      difficulty: 'Easy',
      questionsEnabled: false,
      isActive: true,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.totalDays) {
      Alert.alert('Error', 'Title and total days are required');
      return;
    }

    setSaving(true);
    try {
      await createReadingPlan({
        title: form.title,
        description: form.description || undefined,
        totalDays: parseInt(form.totalDays),
        category: form.category,
        difficulty: form.difficulty,
        questionsEnabled: form.questionsEnabled,
        isActive: form.isActive,
      });
      setModalVisible(false);
      fetchPlans(page);
      Alert.alert('Success', 'Reading plan created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create reading plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (plan: ReadingPlan) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReadingPlan(plan.planId);
              setPlans((prev) => prev.filter((p) => p.planId !== plan.planId));
              Alert.alert('Success', 'Plan deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ],
    );
  };

  const difficultyColor = (diff?: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return '#059669';
      case 'medium':
        return '#d97706';
      case 'hard':
        return '#dc2626';
      default:
        return '#78716c';
    }
  };

  const renderPlan = ({ item }: { item: ReadingPlan }) => (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planInfo}>
          <Text style={styles.planTitle}>{item.title}</Text>
          <View style={styles.planMeta}>
            <Text style={styles.planDays}>{item.totalDays} days</Text>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficultyColor(item.difficulty) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: difficultyColor(item.difficulty) },
                ]}
              >
                {item.difficulty}
              </Text>
            </View>
            {item.questionsEnabled && (
              <View style={styles.quizBadge}>
                <Text style={styles.quizText}>Quiz</Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.isActive ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.isActive
                ? styles.statusTextActive
                : styles.statusTextInactive,
            ]}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.planDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.planFooter}>
        {item.category && (
          <Text style={styles.planCategory}>{item.category}</Text>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No reading plans yet</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
        <Text style={styles.emptyButtonText}>Create First Plan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reading Plans</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ New Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total Plans</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {plans.filter((p) => p.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {plans.filter((p) => p.questionsEnabled).length}
          </Text>
          <Text style={styles.statLabel}>With Quiz</Text>
        </View>
      </View>

      {/* Plans List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          <FlatList
            data={plans}
            renderItem={renderPlan}
            keyExtractor={(item) => item.planId}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomPadding} />
          <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      )}

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reading Plan</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
              placeholder="e.g., One Year Bible"
              placeholderTextColor="#a8a29e"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              placeholder="Optional description..."
              placeholderTextColor="#a8a29e"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Total Days *</Text>
            <TextInput
              style={styles.input}
              value={form.totalDays}
              onChangeText={(text) => setForm({ ...form, totalDays: text })}
              placeholder="e.g., 365"
              placeholderTextColor="#a8a29e"
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.optionsRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.optionButton,
                    form.category === cat && styles.optionButtonActive,
                  ]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.category === cat && styles.optionTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Difficulty</Text>
            <View style={styles.optionsRow}>
              {difficulties.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.optionButton,
                    form.difficulty === diff && styles.optionButtonActive,
                  ]}
                  onPress={() => setForm({ ...form, difficulty: diff })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.difficulty === diff && styles.optionTextActive,
                    ]}
                  >
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() =>
                setForm({ ...form, questionsEnabled: !form.questionsEnabled })
              }
            >
              <Text style={styles.toggleLabel}>Enable Quiz Questions</Text>
              <View
                style={[
                  styles.toggle,
                  form.questionsEnabled && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    form.questionsEnabled && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <Text style={styles.toggleLabel}>Active</Text>
              <View style={[styles.toggle, form.isActive && styles.toggleActive]}>
                <View
                  style={[
                    styles.toggleKnob,
                    form.isActive && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 14,
    color: '#2563eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1917',
  },
  statLabel: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  planDays: {
    fontSize: 12,
    color: '#78716c',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quizBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quizText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#f5f5f4',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#78716c',
  },
  planDescription: {
    fontSize: 13,
    color: '#57534e',
    marginTop: 8,
    lineHeight: 18,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  planCategory: {
    fontSize: 12,
    color: '#a8a29e',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#78716c',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f7f5f2',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalCancel: {
    fontSize: 14,
    color: '#78716c',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1917',
  },
  modalSave: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#57534e',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1c1917',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#2563eb',
  },
  optionText: {
    fontSize: 13,
    color: '#57534e',
  },
  optionTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#1c1917',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#2563eb',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    marginLeft: 2,
  },
  toggleKnobActive: {
    marginLeft: 'auto',
    marginRight: 2,
  },
  bottomPadding: {
    height: 80,
  },
});

export default AdminReadingPlans;