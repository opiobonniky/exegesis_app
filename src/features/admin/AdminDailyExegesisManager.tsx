import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import {
  DailyExegesis,
  deleteDailyExegesis,
  getAllDailyExegesis,
} from '../../services/adminApi';
import { showToast } from '../../helpers/Toash.helper';

export default function AdminDailyExegesisManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = createStyles(COLORS);
  const [items, setItems] = useState<DailyExegesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAllDailyExegesis(0, 20, {
        smartDefault: true,
        futureDays: 60,
      });
      setItems(res.content || []);
    } catch {
      showToast('error', 'Failed to load daily exegesis');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (item: DailyExegesis) => {
    Alert.alert('Delete Daily Exegesis', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDailyExegesis(item.id);
            setItems(prev => prev.filter(entry => entry.id !== item.id));
            showToast('success', 'Daily exegesis deleted');
          } catch {
            showToast('error', 'Failed to delete daily exegesis');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: DailyExegesis }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <FileText size={16} color={COLORS.primary} />
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {item.isPublished ? (
          <CheckCircle2 size={15} color={COLORS.success} />
        ) : null}
      </View>
      <Text style={styles.reference}>{item.passageReference}</Text>
      <Text style={styles.preview} numberOfLines={2}>
        {item.teachingBody}
      </Text>
      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Calendar size={12} color={COLORS.muted} />
          <Text style={styles.dateText}>
            {new Date(item.displayDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('EditDailyExegesis', { exegesis: item })
            }
          >
            <Pencil size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => confirmDelete(item)}
          >
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Exegesis</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('AddDailyExegesis')}
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={44} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Daily Exegesis Yet</Text>
            <Text style={styles.emptyText}>
              Tap + to publish the first Lordsbook teaching.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
    },
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
    headerButton: { padding: 8 },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    list: { padding: 16 },
    emptyList: { flexGrow: 1, padding: 16 },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '800' },
    reference: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 8,
    },
    preview: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  });
