import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Pressable,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import {
  Bookmark,
  Trash2,
  BookOpen,
  ChevronRight,
  Info,
  Sparkles,
  Stars,
} from 'lucide-react-native';
import ActionModal from '../../reusable/ActionModal';
import BottomTab from '../../component/navigations/BottomTab';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { AppContext } from '../../common/AppContext';
import { sendPostRequest } from '../../services/api';
import { route } from '../../component/navigations/routes';
import { showToast } from '../../helpers/Toash.helper';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import useBible from '../../features/bible/hooks/useBible';

// ── Types ─────────────────────────────────────────────────────────────────────

type RootStackParamList = {
  [route.bible]: { bookName: string; chapter: number; verseNumber: number };
};

type FavoriteItem = {
  id: number;
  verse: string;
  reference: string;
  message: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
};

type AppColors = ReturnType<typeof getColors>;

// ── Per-card accent palette ───────────────────────────────────────────────────

const CARD_ACCENTS = [
  { strip: '#C9A96E', light: 'rgba(201,169,110,0.10)' },
  { strip: '#7B9E87', light: 'rgba(123,158,135,0.10)' },
  { strip: '#9B7FA6', light: 'rgba(155,127,166,0.10)' },
  { strip: '#C97B5A', light: 'rgba(201,123,90,0.10)' },
  { strip: '#5A8AA6', light: 'rgba(90,138,166,0.10)' },
];

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ COLORS }: { COLORS: AppColors }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });
  const bg = { backgroundColor: COLORS.border };

  return (
    <Animated.View
      style={[
        skeletonStyles.card,
        {
          backgroundColor: COLORS.cardBackground,
          borderColor: COLORS.border,
          opacity,
        },
      ]}
    >
      <View
        style={[skeletonStyles.strip, { backgroundColor: COLORS.border }]}
      />
      <View style={skeletonStyles.body}>
        <View style={[skeletonStyles.quote, bg]} />
        <View style={[skeletonStyles.line, bg, { width: '92%' }]} />
        <View style={[skeletonStyles.line, bg, { width: '78%' }]} />
        <View
          style={[
            skeletonStyles.line,
            bg,
            { width: '60%', marginBottom: SPACING.lg },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[skeletonStyles.pill, bg, { width: 100 }]} />
          <View style={[skeletonStyles.pill, bg, { width: 68 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  strip: { width: 4 },
  body: { flex: 1, padding: SPACING.lg, gap: 10 },
  quote: { width: 30, height: 28, borderRadius: 6, marginBottom: 4 },
  line: { height: 11, borderRadius: 6 },
  pill: { height: 26, borderRadius: 13 },
});

// ── FavoriteCard ──────────────────────────────────────────────────────────────

function FavoriteCard({
  item,
  index,
  COLORS,
  onReadPress,
  onLearnMore,
  onDelete,
  verseText,
  verseLoading,
  isRtl = false,
  bc,
}: {
  item: FavoriteItem;
  index: number;
  COLORS: AppColors;
  onReadPress: () => void;
  onLearnMore: () => void;
  onDelete: () => void;
  verseText: string;
  verseLoading: boolean;
  isRtl?: boolean;
  bc?: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 65,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay: index * 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.972,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={onReadPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* Shadow wrapper */}
        <View style={[cardStyles.shadow, { shadowColor: accent.strip }]}>
          <View
            style={[
              cardStyles.card,
              isRtl && { flexDirection: 'row-reverse' },
              {
                backgroundColor: COLORS.cardBackground,
                borderColor: COLORS.border,
              },
            ]}
          >
            {/* Accent strip */}
            <View
              style={[
                isRtl ? cardStyles.stripRtl : cardStyles.strip,
                { backgroundColor: accent.strip },
              ]}
            />

            <View style={cardStyles.content}>
              {/* Header row: book pill + delete */}
              <View style={[cardStyles.headerRow, isRtl && { flexDirection: 'row-reverse' }]}>
                <View
                  style={[
                    cardStyles.refPill,
                    isRtl && { flexDirection: 'row-reverse' },
                    {
                      backgroundColor: accent.light,
                      borderColor: accent.strip + '40',
                    },
                  ]}
                >
                  <BookOpen size={10} color={accent.strip} strokeWidth={2.8} />
                  <Text style={[cardStyles.refText, { color: accent.strip }]}>
                    {item.bookName} {item.chapter}:{item.verseNumber}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    cardStyles.deleteBtn,
                    {
                      backgroundColor: COLORS.error + '10',
                      borderColor: COLORS.error + '28',
                    },
                  ]}
                  onPress={onDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={13} color={COLORS.error} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Big decorative quote + verse */}
              <Text style={[cardStyles.openQuote, { color: accent.strip }]}>
                "
              </Text>             
               <Text style={[cardStyles.verseText, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}
                numberOfLines={4}
              >
                {verseLoading ? (bc?.loadingMessage || 'Loading...') : verseText}
              </Text>

              {/* Divider */}
              <View
                style={[cardStyles.divider, { backgroundColor: COLORS.border }]}
              />

              {/* Footer actions */}
              <View style={[cardStyles.footerRow, isRtl && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity
                  style={[
                    cardStyles.actionBtn,
                    isRtl && { flexDirection: 'row-reverse' },
                    {
                      backgroundColor: accent.light,
                      borderColor: accent.strip + '40',
                    },
                  ]}
                  onPress={onReadPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <BookOpen size={12} color={accent.strip} strokeWidth={2.5} />
                  <Text
                    style={[cardStyles.actionBtnText, { color: accent.strip }]}
                  >
                    {bc?.read || 'Read'}
                  </Text>
                  <ChevronRight
                    size={11}
                    color={accent.strip}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    cardStyles.actionBtn,
                    isRtl && { flexDirection: 'row-reverse' },
                    {
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                    },
                  ]}
                  onPress={onLearnMore}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Info size={12} color={COLORS.muted} strokeWidth={2} />
                  <Text
                    style={[cardStyles.actionBtnText, { color: COLORS.muted }]}
                  >
                    {bc?.explain || 'Explain'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  shadow: {
    borderRadius: BORDER_RADIUS.xl,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  card: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
  },
  stripRtl: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    padding: SPACING.md + 2,
    paddingLeft: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  refPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  refText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openQuote: {
    fontSize: 42,
    lineHeight: 36,
    fontWeight: '900',
    opacity: 0.38,
    marginLeft: -3,
    marginBottom: 2,
  },
  verseText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 23,
    letterSpacing: 0.15,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginBottom: SPACING.sm,
    marginHorizontal: -2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ COLORS, isRtl, bc }: { COLORS: AppColors; isRtl?: boolean; bc?: any }) {
  const pulseAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[emptyStyles.wrap, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={[COLORS.accentLight, COLORS.cardBackground]}
          style={[emptyStyles.ring, { borderColor: COLORS.border }]}
        >
          <Bookmark size={42} color={COLORS.accent} strokeWidth={1.4} />
        </LinearGradient>
      </Animated.View>

      <Text style={[emptyStyles.title, { color: COLORS.text }]}>
        {bc?.noFavorites || 'No favorites yet'}
      </Text>
      <Text style={[emptyStyles.body, { color: COLORS.muted }]}>
        {'While reading, bookmark verses that move you.\nThey\'ll live here, ready whenever you return.'}
      </Text>

      <View style={[emptyStyles.dotRow, isRtl && { flexDirection: 'row-reverse' }]}>
        {[0.25, 0.5, 1, 0.5, 0.25].map((op, i) => (
          <View
            key={i}
            style={[
              emptyStyles.dot,
              { backgroundColor: COLORS.accent, opacity: op },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingBottom: 80,
    gap: SPACING.lg,
  },
  ring: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 260,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

// ── Stats badge ───────────────────────────────────────────────────────────────

function StatsBadge({ count, COLORS, bc }: { count: number; COLORS: AppColors; bc?: any }) {
  return (
    <View
      style={[
        badgeStyles.wrap,
        {
          backgroundColor: COLORS.accent + '16',
          borderColor: COLORS.accent + '32',
        },
      ]}
    >
      <Sparkles size={11} color={COLORS.accent} strokeWidth={2.5} />
      <Text style={[badgeStyles.text, { color: COLORS.accent }]}>
        {(bc?.savedVerses || '{count} saved verse').replace('{count}', String(count))}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  text: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Favorites() {
  const app = useContext(AppContext);
  const navigation =
    useNavigation<
      StackNavigationProp<RootStackParamList, typeof route.bible>
    >();
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showRemoveModal, setShowRemoveModal] = useState<FavoriteItem | null>(
    null,
  );
  const [verseTexts, setVerseTexts] = useState<Record<number, string>>({});
  const [verseLoading, setVerseLoading] = useState<Record<number, boolean>>({});

  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);

  // Bible hook for accessing verse data
  const {
    getVerseTextAsync,
    isOnline,
    getVerseText: getVerseTextSync // Keep sync version as fallback
  } = useBible();

  // ── Data ─────────────────────────────────────────────────────────────────────

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sendPostRequest('bible', 'get-favorites', {});
      if (response.returnCode === 200 && response.returnData) {
        setFavorites(response.returnData.favorites);

        // Load verse texts for all favorites
        const versePromises = response.returnData.favorites.map(async (fav) => {
          const favId = fav.id;
          setVerseLoading(prev => ({ ...prev, [favId]: true }));

          try {
            // Try to get verse text from backend if online, fallback to local
            const text = await getVerseTextAsync(
              fav.bookName,
              fav.chapter,
              fav.verseNumber
            );

            // If we got text from backend, use it
            // If not (null), fall back to local data
            let finalText = '';
            if (text !== null) {
              finalText = text;
            } else {
              // Fallback to local data
              finalText = getVerseTextSync(
                fav.bookName,
                fav.chapter,
                fav.verseNumber
              ) ?? '';
            }

            setVerseTexts(prev => ({ ...prev, [favId]: finalText }));
          } catch (error) {
            console.error(`Error fetching verse for favorite ${favId}:`, error);
            // Fallback to local data on error
            const localText = getVerseTextSync(
              fav.bookName,
              fav.chapter,
              fav.verseNumber
            ) ?? '';
            setVerseTexts(prev => ({ ...prev, [favId]: localText }));
          } finally {
            setVerseLoading(prev => ({ ...prev, [favId]: false }));
          }
        });

        await Promise.all(versePromises);
      } else {
        showToast(
          'error',
          response.returnMessage || 'Failed to load favorites',
        );
      }
    } catch {
      showToast('error', 'An error occurred loading favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [loadFavorites]);

  const handleDeleteConfirm = async () => {
    if (!showRemoveModal) return;
    try {
      setDeleting(true);
      const response = await sendPostRequest('bible', 'delete-favorite', {
        favoriteIds: [showRemoveModal.id],
      });
      if (response.returnCode === 200) {
        setFavorites(prev => prev.filter(f => f.id !== showRemoveModal.id));
        setShowRemoveModal(null);
        // Clean up verse text and loading state for deleted favorite
        setVerseTexts(prev => {
          const newTexts = { ...prev };
          delete newTexts[showRemoveModal.id];
          return newTexts;
        });
        setVerseLoading(prev => {
          const newLoading = { ...prev };
          delete newLoading[showRemoveModal.id];
          return newLoading;
        });
        showToast('success', 'Removed from favourites');
      } else {
        showToast('error', response.returnMessage || 'Failed to remove');
      }
    } catch {
      showToast('error', 'Error removing favourite');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[screenStyles.safe, { backgroundColor: COLORS.background }]}
    >
      <ActionHeader
        title={bc?.favorites || 'Favorites'}
        rightComponent={
          <Stars size={20} color={COLORS.accent} strokeWidth={2} />
        }
        onPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={screenStyles.skeletonWrap}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} COLORS={COLORS} />
          ))}
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[
            screenStyles.listContent,
            favorites.length === 0 && screenStyles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
          ListHeaderComponent={
            favorites.length > 0 ? (
              <StatsBadge count={favorites.length} COLORS={COLORS} bc={bc} />
            ) : null
          }
          ListEmptyComponent={<EmptyState COLORS={COLORS} isRtl={isRtl} bc={bc} />}
          renderItem={({ item, index }) => (
            <FavoriteCard
              item={item}
              index={index}
              COLORS={COLORS}
              isRtl={isRtl}
              bc={bc}
              onReadPress={() =>
                navigation.navigate(route.bible, {
                  bookName: item.bookName,
                  chapter: item.chapter,
                  verseNumber: item.verseNumber,
                })
              }
              onLearnMore={() =>
                (navigation as any).navigate(route.favorites, {
                  bookName: item.bookName,
                  chapter: item.chapter,
                  verseNumber: item.verseNumber,
                })
              }
              onDelete={() => setShowRemoveModal(item)}
              verseText={verseTexts[item.id] ?? ''}
              verseLoading={verseLoading[item.id] ?? false}
            />
          )}
        />
      )}

      <ActionModal
        visible={!!showRemoveModal}
        severity="warning"
        title={bc?.removeFavorite || 'Remove Favorite'}
        message={showRemoveModal ? `Remove ${showRemoveModal.bookName} ${showRemoveModal.chapter}:${showRemoveModal.verseNumber}?` : ''}
        confirmLabel={deleting ? (bc?.removing || 'Removing…') : (bc?.removeFavorite || 'Remove')}
        cancelLabel={bc?.keep || 'Keep'}
        onCancel={() => setShowRemoveModal(null)}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}

const screenStyles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  skeletonWrap: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 110,
    gap: SPACING.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});