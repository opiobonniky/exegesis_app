import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../constants/theme';
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
import ActionHeader from '../../reusable/ActionHeader';
import {
  Star,
  Edit3,
  Trash2,
  BookOpen,
  Heart,
  Lightbulb,
  Sparkles,
  Lock,
  Globe,
  Download,
  Share2,
  Hash,
  BookText,
  ChevronDown,
  ChevronUp,
  WifiOff,
} from 'lucide-react-native';

declare const atob: (input: string) => string;

const base64Decode = (str: string): string =>
  decodeURIComponent(escape(atob(str)));

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

const formatDate = (dateStr: string, language: string) => {
  const date = new Date(dateStr);
  const locale =
    language === 'ar' ? 'ar-SA' :
    language === 'es' ? 'es-ES' :
    language === 'fr' ? 'fr-FR' :
    'en-US';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const JournalDetail = () => {
  const navigation = useNavigation<any>();
  const routeParams = useRoute() as any;
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const entryId = routeParams?.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
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
    } catch {
      showToast('error', jc?.failedToUpdateFavorite || 'Failed to update favorite');
    }
  };

  const handleEdit = () => {
    navigation.navigate(route.journalEntry, { entryId: entry?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      jc?.deleteConfirmTitle || 'Delete Entry',
      jc?.deleteConfirmMessage || 'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!entry) return;
            setDeleting(true);
            try {
              const res = await deleteJournalEntry(entry.id);
              if (res.returnCode === 200) {
                showToast('success', jc?.entryDeleted || 'Entry deleted');
                navigation.goBack();
              }
            } catch {
              showToast('error', jc?.failedToDeleteEntry || 'Failed to delete entry');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const expandableSections = [
    entry.gratitude && { key: 'gratitude', label: jc?.gratitudeLabel || 'Gratitude', icon: Heart, color: '#F59E0B', content: entry.gratitude },
    entry.learnings && { key: 'learnings', label: jc?.learningsLabel || 'Learnings', icon: Lightbulb, color: '#3B82F6', content: entry.learnings },
    entry.application && { key: 'application', label: jc?.applicationLabel || 'Application', icon: BookText, color: '#10B981', content: entry.application },
    entry.prayers && { key: 'prayers', label: jc?.prayerRequestsLabel || 'Prayer Requests', icon: Sparkles, color: '#8B5CF6', content: entry.prayers },
  ].filter(Boolean) as { key: string; label: string; icon: any; color: string; content: string }[];

  const hasExpandableContent = expandableSections.length > 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      )}

      <ActionHeader
        title={jc?.journalEntrySection || 'Journal Entry'}
        onPress={() => navigation.goBack()}
        rightComponent={
          <View style={[styles.headerActions, isRtl && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconBtn} activeOpacity={0.7}>
              <Star
                size={20}
                color={entry.isFavorite ? '#F59E0B' : COLORS.muted}
                fill={entry.isFavorite ? '#F59E0B' : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEdit} style={styles.iconBtn} activeOpacity={0.7}>
              <Edit3 size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.iconBtn, { opacity: deleting ? 0.5 : 1 }]}
              disabled={deleting}
              activeOpacity={0.7}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Trash2 size={20} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        {entry.title && (
          <Text style={[styles.title, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {entry.title}
          </Text>
        )}

        {/* Meta badges row */}
        <View style={[styles.metaRow, isRtl && { flexDirection: 'row-reverse' }]}>
          {entry.category && (
            <View style={[styles.badge, { backgroundColor: getCategoryColor(entry.category) + '18' }]}>
              <Text style={[styles.badgeText, { color: getCategoryColor(entry.category) }]}>
                {getCategoryLabel(entry.category)}
              </Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: entry.isPublished ? '#10B98118' : '#EF444418' }]}>
            {entry.isPublished ? (
              <Globe size={12} color="#10B981" />
            ) : (
              <Lock size={12} color="#EF4444" />
            )}
            <Text style={[styles.badgeText, { color: entry.isPublished ? '#10B981' : '#EF4444' }]}>
              {entry.isPublished ? 'Public' : 'Private'}
            </Text>
          </View>
          {entry.source === 'exegesis-lab' && (
            <View style={[styles.badge, { backgroundColor: '#3B82F618' }]}>
              <BookText size={12} color="#3B82F6" />
              <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Exegesis Lab</Text>
            </View>
          )}
        </View>

        {/* Date & Scripture reference */}
        <Text style={[styles.dateText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
          {formatDate(entry.createdOn, language)}
        </Text>
        {entry.bookName && (
          <Text style={[styles.bookRef, { color: COLORS.primary, textAlign: isRtl ? 'right' : 'left' }]}>
            {entry.bookName} {entry.chapter}:{entry.verseNumber}
          </Text>
        )}

        {/* Main Content */}
        <Text style={[styles.sectionTitle, { color: COLORS.text, marginTop: SPACING.lg, textAlign: isRtl ? 'right' : 'left' }]}>
          {jc?.journalEntrySection || 'Journal Entry'}
        </Text>
        <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
          {entry.content}
        </Text>

        {/* Expandable sections: Gratitude, Learnings, Application, Prayers */}
        {hasExpandableContent && (
          <>
            <TouchableOpacity
              style={[styles.expandToggle, { backgroundColor: COLORS.cardBackground }]}
              onPress={() => setShowAllSections(!showAllSections)}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandToggleText, { color: COLORS.primary }]}>
                {showAllSections
                  ? (jc?.hideSections || 'Hide reflection sections')
                  : `${jc?.showSections || 'Show reflection sections'} (${expandableSections.length})`}
              </Text>
              {showAllSections ? (
                <ChevronUp size={14} color={COLORS.primary} />
              ) : (
                <ChevronDown size={14} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            {showAllSections && expandableSections.map(section => (
              <View key={section.key} style={styles.sectionBlock}>
                <View style={[styles.sectionHeader, isRtl && { flexDirection: 'row-reverse' }]}>
                  <section.icon size={16} color={section.color} />
                  <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.label}</Text>
                </View>
                <Text style={[styles.bodyText, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                  {section.content}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Tags */}
        {entry.tags && (
          <View style={styles.sectionBlock}>
            <View style={[styles.sectionHeader, isRtl && { flexDirection: 'row-reverse' }]}>
              <Hash size={16} color={COLORS.muted} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Tags</Text>
            </View>
            <View style={[styles.tagRow, isRtl && { flexDirection: 'row-reverse' }]}>
              {entry.tags.split(',').map((tag, i) => (
                <View
                  key={`tag-${i}`}
                  style={[styles.tagPill, { backgroundColor: `${COLORS.primary}12`, borderColor: `${COLORS.primary}20` }]}
                >
                  <Text style={[styles.tagPillText, { color: COLORS.primary }]}>
                    {tag.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Studied Words */}
        {entry.strongsWords && (() => {
          let words: { strongsId?: string; surfaceText?: string; lemma?: string }[] = [];
          try {
            const parsed = typeof entry.strongsWords === 'string' ? JSON.parse(entry.strongsWords) : entry.strongsWords;
            if (Array.isArray(parsed)) words = parsed;
          } catch {}
          if (words.length === 0) return null;
          return (
            <View style={styles.sectionBlock}>
              <View style={[styles.sectionHeader, isRtl && { flexDirection: 'row-reverse' }]}>
                <BookOpen size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                  Studied Words
                </Text>
              </View>
              <View style={styles.strongsRow}>
                {words.map((w, i) => (
                  <TouchableOpacity
                    key={`sw-${i}`}
                    style={[styles.strongsChip, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}20` }]}
                    onPress={() => {
                      const detail = [
                        w.surfaceText || w.strongsId,
                        w.strongsId ? `Strong's ${w.strongsId}` : '',
                        w.lemma ? `Lemma: ${w.lemma}` : '',
                      ].filter(Boolean).join('\n');
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
                    <Text style={[styles.strongsText, { color: COLORS.primary }]}>
                      {w.surfaceText || w.strongsId}
                    </Text>
                    {w.strongsId && (
                      <Text style={[styles.strongsId, { color: COLORS.muted }]}>
                        {w.strongsId}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
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
                    await Share.share({ url: `file://${pdfPath}`, title: filename });
                  }
                }
              } catch (e: any) {
                showToast('error', e?.message || 'Failed to export PDF');
              }
            }}
            activeOpacity={0.7}
          >
            <Download size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
            onPress={async () => {
              try {
                const res = await exportOneJournalEntry(entry.id, 'txt');
                if (res.returnCode === 200 && res.returnData) {
                  const decoded = base64Decode(res.returnData.content);
                  await Share.share({ message: decoded, title: res.returnData.filename || 'journal-entry.txt' });
                }
              } catch (e: any) {
                showToast('error', e?.message || 'Failed to export entry');
              }
            }}
            activeOpacity={0.7}
          >
            <Download size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>TXT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
            onPress={async () => {
              try {
                const text = [
                  entry.title || '',
                  '',
                  entry.content || '',
                  '',
                  entry.gratitude ? `Gratitude: ${entry.gratitude}` : '',
                  entry.prayers ? `Prayer: ${entry.prayers}` : '',
                  entry.learnings ? `Learnings: ${entry.learnings}` : '',
                  entry.application ? `Application: ${entry.application}` : '',
                  '',
                  entry.bookName ? `Passage: ${entry.bookName} ${entry.chapter || ''}${entry.verseNumber ? ':' + entry.verseNumber : ''}` : '',
                  `— Saved from Exegesis Legacy Ledger`,
                ].filter(Boolean).join('\n');
                await Share.share({ message: text, title: `Journal: ${entry.title || 'Entry'}` });
              } catch (e: any) {
                if (e?.message !== 'User did not share') {
                  console.error('Share failed:', e);
                }
              }
            }}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  bookRef: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  sectionBlock: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expandToggleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  strongsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.xs,
  },
  strongsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  strongsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  strongsId: {
    fontSize: FONT_SIZES.xs,
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
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

export default JournalDetail;
