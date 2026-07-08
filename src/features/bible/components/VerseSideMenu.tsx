import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  BookMarked,
  BookOpen,
  BookText,
  Copy,
  Edit3,
  FileText,
  Hash,
  Headphones,
  HelpCircle,
  Lightbulb,
  Link2,
  Repeat2,
  Search,
  Share2,
  Sparkles,
  Star,
  Sun,
  X,
} from 'lucide-react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { useSubscription } from '../../../hooks/useSubscription';
import { route } from '../../../component/navigations/routes';
import VerseRangeSlider from '../modals/VerseRangeSlider';

const PANEL_WIDTH = 260;

type ActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isPrimary?: boolean;
  section: 'primary' | 'tools' | 'discover' | 'share';
};

const SECTION_ORDER: Record<string, { label: string; order: number }> = {
  primary: { label: 'Actions', order: 0 },
  tools: { label: 'Study Tools', order: 1 },
  discover: { label: 'Discover', order: 2 },
  share: { label: 'Share & Export', order: 3 },
};

const SECTION_KEYS: (keyof typeof SECTION_ORDER)[] = [
  'primary', 'tools', 'discover', 'share',
];

export interface VerseSideMenuProps {
  visible: boolean;
  onClose: () => void;
  verseNumber: number;
  verseText: string;
  currentBook: string;
  currentChapter: number;
  isDark: boolean;
  navigation?: any;
  isRtl?: boolean;
  isGuest?: boolean;
  onGuestAction?: (message: string) => void;

  /** Verse range / selection state */
  selectedCount?: number;
  selectedVerses?: number[];
  totalVerses?: number;
  onRangeChange?: (start: number, end: number) => void;

  /** Action callbacks */
  onListen?: () => void;
  onExplain?: () => void;
  onHighlight?: () => void;
  onNote?: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onJournal?: () => void;

  /** Side-menu-specific callbacks */
  onOpenNoteModal?: (verseNumber: number) => void;
  onOpenHighlightPicker?: (verseNumber: number) => void;
  onOpenWordStudy?: (verseNumber: number) => void;
  onOpenStudyTools?: (selectedVerses: number[]) => void;
}

function ActionButton({
  label,
  icon,
  onPress,
  isPrimary,
  COLORS,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isPrimary?: boolean;
  COLORS: ReturnType<typeof getColors>;
}) {
  const bgAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () =>
    Animated.timing(bgAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();

  const handlePressOut = () =>
    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          localStyles.actionRow,
          {
            backgroundColor: isPrimary ? bgColor : COLORS.background,
            borderColor: COLORS.border,
          },
        ]}
      >
        <View
          style={[
            localStyles.actionIcon,
            isPrimary
              ? {
                  backgroundColor: isPrimary ? COLORS.primary : COLORS.background,
                  borderColor: isPrimary ? COLORS.primary : COLORS.border,
                }
              : {
                  backgroundColor: `${COLORS.primary}15`,
                  borderColor: `${COLORS.primary}30`,
                },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            localStyles.actionLabel,
            {
              color: isPrimary ? COLORS.primary : COLORS.text,
              fontWeight: isPrimary ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function VerseSideMenu({
  visible,
  onClose,
  verseNumber,
  verseText,
  currentBook,
  currentChapter,
  isDark,
  navigation,
  isRtl = false,
  isGuest = false,
  onGuestAction,
  selectedCount = 1,
  selectedVerses = [],
  totalVerses = 1,
  onRangeChange,
  onListen,
  onExplain,
  onHighlight,
  onNote,
  onFavorite,
  onShare,
  onCopy,
  onJournal,
  onOpenNoteModal,
  onOpenHighlightPicker,
  onOpenWordStudy,
  onOpenStudyTools,
}: VerseSideMenuProps) {
  const COLORS = getColors(isDark);
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const { hasAccess } = useSubscription();

  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 6,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(PANEL_WIDTH);
      backdropOpacity.setValue(0);
    }
  }, [visible, slideAnim, backdropOpacity]);

  const sortedVerses = useMemo(
    () => [...selectedVerses].sort((a, b) => a - b),
    [selectedVerses],
  );
  const startVerse = sortedVerses[0] ?? verseNumber;
  const endVerse = sortedVerses[sortedVerses.length - 1] ?? verseNumber;

  const verseRef = `${currentBook} ${currentChapter}:${verseNumber}`;

  const guard = useCallback(
    (msg: string, callback: () => void) => {
      if (isGuest) {
        onClose();
        setTimeout(() => onGuestAction?.(msg), 350);
        return;
      }
      callback();
    },
    [isGuest, onGuestAction, onClose],
  );

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleStudy = useCallback(() => {
    if (!hasAccess('legacy_sower')) {
      dismiss();
      navigation?.navigate(route.sower);
      return;
    }
    guard('Study this verse requires a free account.', () => {
      const verses = sortedVerses.length > 0 ? sortedVerses : [verseNumber];
      navigation?.navigate('LabFlow', {
        bookName: currentBook,
        chapter: currentChapter,
        verseStart: verses[0],
        verseEnd: verses[verses.length - 1],
        stage: 'look',
      });
      dismiss();
    });
  }, [guard, hasAccess, navigation, currentBook, currentChapter, sortedVerses, verseNumber, dismiss]);

  const handleStrongs = useCallback(() => {
    guard("Strong's Concordance requires a free account.", () => {
      onOpenWordStudy?.(verseNumber);
      dismiss();
    });
  }, [guard, onOpenWordStudy, verseNumber, dismiss]);

  const handleCrossRefs = useCallback(() => {
    guard('Cross references require a free account.', () => {
      navigation?.navigate('VerseResources', {
        bookName: currentBook, chapter: currentChapter,
        verseNumber, tab: 'cross-references',
      });
      dismiss();
    });
  }, [guard, navigation, currentBook, currentChapter, verseNumber, dismiss]);

  const handleCompareTranslations = useCallback(() => {
    guard('Translation comparison requires a free account.', () => {
      navigation?.navigate('VerseResources', {
        bookName: currentBook, chapter: currentChapter,
        verseNumber, tab: 'compare',
      });
      dismiss();
    });
  }, [guard, navigation, currentBook, currentChapter, verseNumber, dismiss]);

  const handleDevotional = useCallback(() => {
    guard('Daily devotions require a free account.', () => {
      navigation?.navigate('DailyDevotional', {
        bookName: currentBook, chapter: currentChapter, verse: verseNumber,
      });
      dismiss();
    });
  }, [guard, navigation, currentBook, currentChapter, verseNumber, dismiss]);

  const handleOpenStudyTools = useCallback(() => {
    const verses = sortedVerses.length > 0 ? sortedVerses : [verseNumber];
    onOpenStudyTools?.(verses);
    dismiss();
  }, [onOpenStudyTools, sortedVerses, verseNumber, dismiss]);

  const handleTrivia = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleSearchVerse = useCallback(() => {
    dismiss();
    navigation?.navigate('Search', {
      query: verseText.slice(0, 100), scope: 'bible',
    });
  }, [dismiss, navigation, verseText]);

  const actions: ActionItem[] = [
    {
      key: 'listen',
      label: bc?.audioBible || bc?.playAudio || 'Listen',
      icon: <Headphones size={16} color={COLORS.primary} strokeWidth={2} />,
      onPress: () => { guard('Audio narration requires a free account.', () => { onListen?.(); dismiss(); }); },
      isPrimary: true,
      section: 'primary',
    },
    {
      key: 'study',
      label: sortedVerses.length > 1 ? 'Open Selection in Lab' : 'Open Verse in Lab',
      icon: <Sparkles size={16} color={COLORS.primary} strokeWidth={2} />,
      onPress: handleStudy,
      section: 'primary',
    },
    {
      key: 'explain',
      label: bc?.explain || 'Explain',
      icon: <Lightbulb size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { onExplain?.(); dismiss(); },
      section: 'primary',
    },
    {
      key: 'journal',
      label: bc?.journal || 'Journal',
      icon: <BookText size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => {
        if (!hasAccess('legacy_sower')) { dismiss(); navigation?.navigate(route.sower); return; }
        guard('Journal requires a free account.', () => { onJournal?.(); dismiss(); });
      },
      section: 'primary',
    },
    {
      key: 'strongs',
      label: "Open Strong's",
      icon: <Hash size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleStrongs,
      section: 'tools',
    },
    {
      key: 'note',
      label: bc?.notes || 'Note',
      icon: <FileText size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { guard('Notes require a free account.', () => { onNote?.(); dismiss(); }); },
      section: 'tools',
    },
    {
      key: 'highlight',
      label: bc?.highlight || 'Highlight',
      icon: <Edit3 size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { guard('Highlights require a free account.', () => { onHighlight?.(); dismiss(); }); },
      section: 'tools',
    },
    {
      key: 'favorite',
      label: bc?.favorites || 'Favorite',
      icon: <Star size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { guard('Favourites require a free account.', () => { onFavorite?.(); dismiss(); }); },
      section: 'tools',
    },
    {
      key: 'crossrefs',
      label: 'Cross References',
      icon: <Link2 size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleCrossRefs,
      section: 'discover',
    },
    {
      key: 'compare',
      label: 'Compare Translations',
      icon: <Repeat2 size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleCompareTranslations,
      section: 'discover',
    },
    {
      key: 'devotional',
      label: 'Devotional on This Verse',
      icon: <Sun size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleDevotional,
      section: 'discover',
    },
    {
      key: 'studytools',
      label: sortedVerses.length > 1 ? 'Study Tools for Selection' : 'Study Tools for Verse',
      icon: <BookMarked size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleOpenStudyTools,
      section: 'discover',
    },
    {
      key: 'trivia',
      label: 'Trivia from This Verse',
      icon: <HelpCircle size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleTrivia,
      section: 'discover',
    },
    {
      key: 'search',
      label: 'Search This Text',
      icon: <Search size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: handleSearchVerse,
      section: 'share',
    },
    {
      key: 'share',
      label: bc?.share || 'Share',
      icon: <Share2 size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { guard('Sharing requires a free account.', () => { onShare?.(); dismiss(); }); },
      section: 'share',
    },
    {
      key: 'copy',
      label: bc?.copy || 'Copy',
      icon: <Copy size={16} color={COLORS.textSecondary} strokeWidth={2} />,
      onPress: () => { guard('Copying requires a free account.', () => { onCopy?.(); dismiss(); }); },
      section: 'share',
    },
  ];

  const groupedActions = useMemo(() => {
    const groups: { section: string; items: ActionItem[] }[] = [];
    for (const sectionKey of SECTION_KEYS) {
      const sectionActions = actions.filter((a) => a.section === sectionKey);
      if (sectionActions.length > 0) {
        groups.push({ section: sectionKey, items: sectionActions });
      }
    }
    return groups;
  }, [actions]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          localStyles.backdrop,
          { backgroundColor: COLORS.overlay, opacity: backdropOpacity },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          localStyles.container,
          {
            backgroundColor: COLORS.cardBackground,
            borderLeftColor: COLORS.border,
            transform: [{ translateX: slideAnim }],
            shadowColor: COLORS.shadowColor,
          },
        ]}
      >
        {/* Header */}
        <View style={[localStyles.header, isRtl && localStyles.headerRtl]}>
          <View style={[localStyles.headerLeft, isRtl && localStyles.headerLeftRtl]}>
            <View
              style={[
                localStyles.bookIconWrap,
                { backgroundColor: `${COLORS.primary}15` },
              ]}
            >
              <BookOpen size={14} color={COLORS.primary} strokeWidth={2.5} />
            </View>
            <View style={localStyles.headerTextGroup}>
              <Text style={[localStyles.countText, { color: COLORS.text }]}>
                {verseRef}
              </Text>
              <Text
                style={[localStyles.versePreview, { color: COLORS.muted }]}
                numberOfLines={1}
              >
                "{verseText.slice(0, 60)}{verseText.length > 60 ? '…' : ''}"
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              localStyles.closeBtn,
              { backgroundColor: `${COLORS.muted}18` },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[localStyles.divider, { backgroundColor: COLORS.border }]} />

        {/* Verse Range Slider */}
        {totalVerses > 1 && sortedVerses.length > 1 && (
          <View style={localStyles.sliderContainer}>
            <VerseRangeSlider
              totalVerses={totalVerses}
              startVerse={startVerse}
              endVerse={endVerse}
              onRangeChange={onRangeChange ?? (() => {})}
              isDark={isDark}
              accentColor={COLORS.accent}
            />
          </View>
        )}

        {/* Action groups */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={localStyles.scrollContent}
          style={localStyles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          {groupedActions.map((group) => (
            <View key={group.section} style={localStyles.sectionGroup}>
              <Text style={[localStyles.sectionHeader, { color: COLORS.muted }]}>
                {SECTION_ORDER[group.section]?.label || group.section}
              </Text>
              {group.items.map((action) => (
                <ActionButton
                  key={action.key}
                  label={action.label}
                  icon={action.icon}
                  onPress={action.onPress}
                  isPrimary={action.isPrimary}
                  COLORS={COLORS}
                />
              ))}
            </View>
          ))}

          {/* Bottom safe padding */}
          <View style={{ height: Platform.OS === 'ios' ? 20 : 12 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 199,
  },
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 60 : 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    zIndex: 200,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerLeftRtl: {
    flexDirection: 'row-reverse',
  },
  headerTextGroup: {
    flexShrink: 1,
    minWidth: 0,
  },
  bookIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  versePreview: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 1,
    fontStyle: 'italic',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.lg,
  },
  sliderContainer: {
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  sectionGroup: {
    marginBottom: SPACING.xs,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    gap: 10,
    marginHorizontal: 2,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.1,
    flex: 1,
  },
});
