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
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  getJournalEntry,
  toggleJournalFavorite,
  deleteJournalEntry,
  JournalEntry,
} from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import { exportOneJournalEntry } from '../../services/api';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { cacheJournalEntry, getCachedJournalEntry } from '../../services/journalCache';
import { useConnectivity } from '../../providers/ConnectivityProvider';

// atob is available in Hermes (React Native 0.70+) via the global scope
// We declare it here since the TS lib doesn't include it
declare const atob: (input: string) => string;

/** Decode base64 → UTF-8 string. atob gives Latin-1; escape+decodeURIComponent converts to UTF-16. */
const base64Decode = (str: string): string =>
  decodeURIComponent(escape(atob(str)));
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
  Lock,

  Download,
  Share2,
  Hash,
  BookText,
} from 'lucide-react-native';

const JournalDetail = () => {
  const navigation = useNavigation<any>();
  const routeParams = useRoute() as any;
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const entryId = routeParams?.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const { isOnline } = useConnectivity();

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      const res = await getJournalEntry(entryId);
      if (res.returnCode === 200 && res.returnData) {
        setEntry(res.returnData);
        cacheJournalEntry(res.returnData);
      }
    } catch (error) {
      const cached = await getCachedJournalEntry(entryId);
      if (cached) {
        setEntry(cached);
        showToast('info', 'Showing cached entry (offline)');
      } else {
        showToast('error', jc?.failedToLoadEntry || 'Failed to load entry');
      }
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
          {/* Public/Private badge */}
          <View
            style={[
              styles.privacyBadge,
              {
                backgroundColor: entry.isPublished ? '#10B98120' : '#EF444420',
              },
            ]}
          >
            <Lock size={12} color={entry.isPublished ? '#10B981' : '#EF4444'} />
            <Text
              style={[
                styles.privacyBadgeText,
                { color: entry.isPublished ? '#10B981' : '#EF4444' },
              ]}
            >
              {entry.isPublished ? 'Public' : 'Private'}
            </Text>
          </View>
          {/* Source badge — 'From Exegesis Lab' */}
          {entry.source === 'exegesis-lab' && (
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: '#3B82F620' },
              ]}
            >
              <BookText size={12} color="#3B82F6" />
              <Text style={[styles.sourceBadgeText, { color: '#3B82F6' }]}>
                Exegesis Lab
              </Text>
            </View>
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

        {/* Tags */}
        {entry.tags && (
          <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text, marginBottom: SPACING.sm }]}>Tags</Text>
            <View style={[styles.tagRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {entry.tags.split(',').map((tag, i) => (
                <View
                  key={`tag-${i}`}
                  style={[
                    styles.tagPill,
                    { backgroundColor: `${COLORS.primary}15`, borderColor: `${COLORS.primary}25` },
                  ]}
                >
                  <Text style={[styles.tagPillText, { color: COLORS.primary }]}>
                    {tag.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Studied Words (from Lab) */}
        {entry.strongsWords && (() => {
          let words: { strongsId?: string; surfaceText?: string; lemma?: string }[] = [];
          try {
            const parsed = typeof entry.strongsWords === 'string' ? JSON.parse(entry.strongsWords) : entry.strongsWords;
            if (Array.isArray(parsed)) words = parsed;
          } catch {}
          if (words.length === 0) return null;
          return (
            <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
              <View style={styles.sectionHeader}>
                <Hash size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, { color: COLORS.text, marginLeft: SPACING.xs }]}>
                  Studied Words
                </Text>
              </View>
              <View style={styles.strongsWordRow}>
                {words.map((w, i) => (
                  <TouchableOpacity
                    key={`sw-${i}`}
                    style={[
                      styles.strongsWordChip,
                      {
                        backgroundColor: `${COLORS.primary}12`,
                        borderColor: `${COLORS.primary}25`,
                      },
                    ]}
                    onPress={() => {
                      const detail = [
                        w.surfaceText || w.strongsId,
                        w.strongsId ? `Strong's ${w.strongsId}` : '',
                        w.lemma ? `Lemma: ${w.lemma}` : '',
                      ]
                        .filter(Boolean)
                        .join('\n');
                      Alert.alert('Word Study', detail, [
                        { text: 'Close', style: 'cancel' },
                        {
                          text: 'Study in Bible',
                          onPress: () => {
                            if (entry.bookName) {
                              navigation.navigate(route.bible, {
                                bookName: entry.bookName,
                                chapter: entry.chapter || 1,
                              });
                            }
                          },
                        },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.strongsWordText, { color: COLORS.primary }]}>
                      {w.surfaceText || w.strongsId}
                    </Text>
                    {w.strongsId && (
                      <Text style={[styles.strongsWordId, { color: COLORS.muted }]}>
                        {w.strongsId}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Action buttons: Download PDF + Share Text */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
              },
            ]}
            onPress={async () => {
              try {
                const res = await exportOneJournalEntry(entry.id, 'pdf');
                if (res.returnCode === 200 && res.returnData) {
                  const filename = res.returnData.filename || 'journal-entry.pdf';
                  const pdfPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
                  await ReactNativeBlobUtil.fs.writeFile(pdfPath, res.returnData.content!, 'base64');
                  if (Platform.OS === 'android') {
                    await ReactNativeBlobUtil.android.actionViewIntent(pdfPath, 'application/pdf');
                  } else {
                    await Share.share({
                      url: `file://${pdfPath}`,
                      title: filename,
                    });
                  }
                }
              } catch (e: any) {
                showToast('error', e?.message || 'Failed to export PDF');
              }
            }}
            activeOpacity={0.7}
          >
            <Download size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>
              Download PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
              },
            ]}
            onPress={async () => {
              try {
                const res = await exportOneJournalEntry(entry.id, 'txt');
                if (res.returnCode === 200 && res.returnData) {
                  const decoded = base64Decode(res.returnData.content);
                  await Share.share({
                    message: decoded,
                    title: res.returnData.filename || 'journal-entry.txt',
                  });
                }
              } catch (e: any) {
                showToast('error', e?.message || 'Failed to export entry');
              }
            }}
            activeOpacity={0.7}
          >
            <Download size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>
              Download
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
              },
            ]}
            onPress={async () => {
              try {
                const text = [
                  entry.title || '',
                  '',
                  entry.content || '',
                  '',
                  entry.content ? `Reflection: ${entry.content}` : '',
                  entry.prayers ? `Prayer: ${entry.prayers}` : '',
                  entry.application ? `Application: ${entry.application}` : '',
                  '',
                  entry.bookName ? `Passage: ${entry.bookName} ${entry.chapter || ''}${entry.verseNumber ? ':' + entry.verseNumber : ''}` : '',
                  `— Saved from Exegesis Legacy Ledger`,
                ]
                  .filter(Boolean)
                  .join('\n');
                await Share.share({
                  message: text,
                  title: `Journal: ${entry.title || 'Entry'}`,
                });
              } catch (e: any) {
                if (e?.message !== 'User did not share') {
                  console.error('Share failed:', e);
                }
              }
            }}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

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
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privacyBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sourceBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  strongsWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
  },
  strongsWordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  strongsWordText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  strongsWordId: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '400',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});

export default JournalDetail;
