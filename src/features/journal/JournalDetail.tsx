/**
 * JournalDetail.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View journal entry details
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../component/language-translation/LanguageProvider';
import {
  getJournalEntry,
  toggleJournalFavorite,
  deleteJournalEntry,
  JournalEntry,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import {
  ArrowLeft,
  Star,
  Edit2,
  Trash2,
  BookOpen,
  Calendar,
  Heart,
  Lightbulb,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const JournalDetail = () => {
  const navigation = useNavigation<any>();
  const routeParams = useRoute() as any;
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = language === 'ar';
  const jc = translations?.journal;

  const entryId = routeParams?.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      const res = await getJournalEntry(entryId);
      if (res.returnCode === 200 && res.returnData) {
        setEntry(res.returnData);
      }
    } catch (error) {
      showToast('error', jc?.failedToLoadEntry || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!entry) return;
    try {
      const res = await toggleJournalFavorite(entry.id);
      if (res.returnCode === 200) {
        setEntry(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch (error) {
      showToast('error', jc?.failedToUpdateFavorite || 'Failed to update favorite');
    }
  };

  const handleEdit = () => {
    navigation.navigate(route.journalEntry, { entryId: entry?.id });
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      const res = await deleteJournalEntry(entry.id);
      if (res.returnCode === 200) {
        showToast('success', jc?.entryDeleted || 'Entry deleted');
        navigation.goBack();
      }
    } catch (error) {
      showToast('error', jc?.failedToDeleteEntry || 'Failed to delete entry');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'ar' ? 'ar-SA' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      study: '#3B82F6',
      prayer: '#8B5CF6',
      gratitude: '#F59E0B',
      reflection: '#10B981',
      application: '#EF4444',
      general: '#6B7280',
    };
    return colors[cat] || colors.general;
  };

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      general: jc?.categoryGeneral || 'General',
      study: jc?.categoryStudy || 'Study',
      prayer: jc?.categoryPrayer || 'Prayer',
      gratitude: jc?.categoryGratitude || 'Gratitude',
      reflection: jc?.categoryReflection || 'Reflection',
      application: jc?.categoryApplication || 'Application',
    };
    return labels[cat] || cat;
  };

  if (loading || !entry) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>{jc?.loadingLabel || 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          {isRtl ? <ChevronRight size={24} color={COLORS.text} /> : <ChevronLeft size={24} color={COLORS.text} />}
        </TouchableOpacity>
        <View style={[styles.headerActions, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerBtn}>
            <Star
              size={22}
              color={entry.isFavorite ? '#F59E0B' : COLORS.muted}
              fill={entry.isFavorite ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
            <Edit2 size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Trash2 size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meta */}
        <View style={[styles.metaContainer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          {entry.category && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(entry.category) + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(entry.category) }]}>
                {getCategoryLabel(entry.category)}
              </Text>
            </View>
          )}
          {entry.mood && (
            <Text style={[styles.moodText, { color: COLORS.textSecondary }]}>
              {jc?.feelingLabel || 'Feeling:'} {entry.mood}
            </Text>
          )}
        </View>

        {/* Title */}
        {entry.title && (
          <Text style={[styles.title, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>{entry.title}</Text>
        )}

        {/* Date & Scripture */}
        <View style={[styles.infoRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[styles.infoItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Calendar size={14} color={COLORS.muted} />
            <Text style={[styles.infoText, { color: COLORS.muted }]}>
              {formatDate(entry.createdOn)}
            </Text>
          </View>
          {entry.bookName && (
            <View style={[styles.infoItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <BookOpen size={14} color={COLORS.muted} />
              <Text style={[styles.infoText, { color: COLORS.muted }]}>
                {entry.bookName} {entry.chapter}:{entry.verseNumber}
              </Text>
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{jc?.journalEntrySection || 'Journal Entry'}</Text>
          <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.content}</Text>
        </View>

        {/* Gratitude */}
        {entry.gratitude && (
          <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Heart size={16} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: COLORS.text, marginLeft: isRtl ? 0 : SPACING.xs, marginRight: isRtl ? SPACING.xs : 0 }]}>{jc?.gratitudeLabel || 'Gratitude'}</Text>
            </View>
            <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.gratitude}</Text>
          </View>
        )}

        {/* Learnings */}
        {entry.learnings && (
          <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Lightbulb size={16} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: COLORS.text, marginLeft: isRtl ? 0 : SPACING.xs, marginRight: isRtl ? SPACING.xs : 0 }]}>{jc?.learningsLabel || 'Learnings'}</Text>
            </View>
            <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.learnings}</Text>
          </View>
        )}

        {/* Application */}
        {entry.application && (
          <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Sparkles size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: COLORS.text, marginLeft: isRtl ? 0 : SPACING.xs, marginRight: isRtl ? SPACING.xs : 0 }]}>{jc?.applicationLabel || 'Application'}</Text>
            </View>
            <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.application}</Text>
          </View>
        )}

        {/* Prayers */}
        {entry.prayers && (
          <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Sparkles size={16} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: COLORS.text, marginLeft: isRtl ? 0 : SPACING.xs, marginRight: isRtl ? SPACING.xs : 0 }]}>{jc?.prayerRequestsLabel || 'Prayer Requests'}</Text>
            </View>
            <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>{entry.prayers}</Text>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  moodText: {
    fontSize: FONT_SIZES.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
  },
  section: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
  },
});

export default JournalDetail;
