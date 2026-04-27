/**
 * AdminDailyVerseManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily verse management for admins
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
  getAllDailyVerses,
  addDailyVerse,
  deleteDailyVerse,
  DailyVerse,
} from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';

const AdminDailyVerseManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingVerse, setEditingVerse] = useState<DailyVerse | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('adminVerse');

  const [form, setForm] = useState({
    bookName: '',
    chapter: '',
    verseNumber: '',
    displayDate: new Date().toISOString().split('T')[0],
    reflection: '',
    published: true,
  });

  const fetchVerses = useCallback(async (pg: number = 0) => {
    try {
      const response = await getAllDailyVerses(pg, 12, {
        smartDefault: true,
        futureDays: 30,
      });
      setVerses(response.content || []);
      setTotalPages(response.totalPages);
      setPage(response.currentPage);
    } catch (error) {
      console.error('Failed to fetch daily verses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVerses(page);
    setRefreshing(false);
  }, [fetchVerses, page]);

  const openAddModal = () => {
    setEditingVerse(null);
    setForm({
      bookName: '',
      chapter: '',
      verseNumber: '',
      displayDate: new Date().toISOString().split('T')[0],
      reflection: '',
      published: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (verse: DailyVerse) => {
    setEditingVerse(verse);
    setForm({
      bookName: verse.bookName,
      chapter: String(verse.chapter),
      verseNumber: String(verse.verseNumber),
      displayDate: verse.displayDate.split('T')[0],
      reflection: verse.reflection || '',
      published: verse.isPublished,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (
      !form.bookName ||
      !form.chapter ||
      !form.verseNumber ||
      !form.displayDate
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await addDailyVerse(
        {
          bookName: form.bookName,
          chapter: parseInt(form.chapter),
          verseNumber: parseInt(form.verseNumber),
          displayDate: form.displayDate,
          reflection: form.reflection || undefined,
          published: form.published,
        },
        editingVerse?.id,
      );
      setModalVisible(false);
      fetchVerses(page);
      Alert.alert('Success', 'Daily verse saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save daily verse');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (verse: DailyVerse) => {
    Alert.alert(
      'Delete Verse',
      'Are you sure you want to delete this daily verse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDailyVerse(verse.id);
              setVerses(prev => prev.filter(v => v.id !== verse.id));
              Alert.alert('Success', 'Verse deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete verse');
            }
          },
        },
      ],
    );
  };

  const renderVerse = ({ item }: { item: DailyVerse }) => (
    <View style={styles.verseCard}>
      <View style={styles.verseHeader}>
        <View style={styles.verseRef}>
          <Text style={styles.verseRefText}>
            {item.bookName} {item.chapter}:{item.verseNumber}
          </Text>
          <View
            style={[
              styles.verseBadge,
              item.isPublished
                ? styles.verseBadgePublished
                : styles.verseBadgeDraft,
            ]}
          >
            <Text
              style={[
                styles.verseBadgeText,
                item.isPublished
                  ? styles.verseBadgeTextPublished
                  : styles.verseBadgeTextDraft,
              ]}
            >
              {item.isPublished ? 'Published' : 'Draft'}
            </Text>
          </View>
        </View>
        <Text style={styles.verseDate}>
          {item.displayDate
            ? new Date(item.displayDate).toLocaleDateString()
            : '—'}
        </Text>
      </View>

      {item.reflection && (
        <Text style={styles.verseReflection} numberOfLines={2}>
          {item.reflection}
        </Text>
      )}

      <View style={styles.verseActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
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
      <Text style={styles.emptyText}>No daily verses found</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
        <Text style={styles.emptyButtonText}>Add First Verse</Text>
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
        <Text style={styles.title}>Daily Verses</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Verse</Text>
        </TouchableOpacity>
      </View>

      {/* Verse List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          <FlatList
            data={verses}
            renderItem={renderVerse}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomPadding}>
            <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
          </View>
        </>
      )}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  verseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verseRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verseRefText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
  },
  verseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verseBadgePublished: {
    backgroundColor: '#d1fae5',
  },
  verseBadgeDraft: {
    backgroundColor: '#fef3c7',
  },
  verseBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verseBadgeTextPublished: {
    color: '#059669',
  },
  verseBadgeTextDraft: {
    color: '#92400e',
  },
  verseDate: {
    fontSize: 12,
    color: '#78716c',
  },
  verseReflection: {
    fontSize: 13,
    color: '#57534e',
    marginTop: 8,
    lineHeight: 18,
  },
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '500',
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
    height: 100,
    textAlignVertical: 'top',
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

export default AdminDailyVerseManager;
