import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  BookMarked,
  BookOpen,
  BookText,
  ChevronRight,
  Copy,
  FileText,
  FlaskConical,
  Hash,
  Headphones,
  Highlighter,
  Landmark,
  Lightbulb,
  Link2,
  Repeat2,
  Search,
  Share2,
  Star,
  Sun,
  X,
} from 'lucide-react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
} from '../../../constants/theme';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { useSubscription } from '../../../hooks/useSubscription';
import { route } from '../../../component/navigations/routes';
import VerseRangeSlider from '../modals/VerseRangeSlider';

const MAX_PANEL_WIDTH = 430;

type ActionItem = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBackground: string;
  onPress: () => void;
  section: 'study' | 'resources' | 'save' | 'share';
};

const SECTION_ORDER: Record<string, { label: string; order: number }> = {
  study: { label: 'Study Tools', order: 0 },
  resources: { label: 'Resources', order: 1 },
  save: { label: 'Listen, Highlight & Save', order: 2 },
  share: { label: 'Share & Export', order: 3 },
};

const SECTION_KEYS: (keyof typeof SECTION_ORDER)[] = [
  'study', 'resources', 'save', 'share',
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
  description,
  icon,
  iconBackground,
  onPress,
  COLORS,
  isRtl,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBackground: string;
  onPress: () => void;
  COLORS: ReturnType<typeof getColors>;
  isRtl: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.62}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          localStyles.actionRow,
          isRtl && localStyles.actionRowRtl,
        ]}
      >
        <View
          style={[
            localStyles.actionIcon,
            { backgroundColor: iconBackground },
          ]}
        >
          {icon}
        </View>
        <View style={localStyles.actionTextGroup}>
          <Text
            style={[localStyles.actionLabel, { color: COLORS.text }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[localStyles.actionDescription, { color: COLORS.muted }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
        <ChevronRight
          size={19}
          color={COLORS.primary}
          strokeWidth={2.4}
          style={isRtl ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </View>
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
  const { width: screenWidth } = useWindowDimensions();
  const panelWidth = Math.min(screenWidth * 0.72, MAX_PANEL_WIDTH);
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const { hasAccess } = useSubscription();

  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
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
      slideAnim.setValue(panelWidth);
      backdropOpacity.setValue(0);
    }
  }, [visible, slideAnim, backdropOpacity, panelWidth]);

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
      navigation?.navigate(route.bibleStudy, {
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

  const handleBackground = useCallback(() => {
    guard('Background and context requires a free account.', () => {
      navigation?.navigate('VerseResources', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumber,
        tab: 'commentaries',
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

  const handleSearchVerse = useCallback(() => {
    dismiss();
    navigation?.navigate('Search', {
      query: verseText.slice(0, 100), scope: 'bible',
    });
  }, [dismiss, navigation, verseText]);

  const iconColors = {
    navy: isDark ? '#8AB4F8' : '#123D72',
    blue: isDark ? '#68A7FF' : '#0878E8',
    green: isDark ? '#5FE3A1' : '#16A765',
    amber: isDark ? '#FFD166' : '#E9A719',
    purple: isDark ? '#D59CFF' : '#8E35D2',
  };

  const iconBackgrounds = {
    navy: isDark ? '#182B47' : '#EEF0FA',
    blue: isDark ? '#132E50' : '#EAF3FF',
    green: isDark ? '#123B2C' : '#EAF8F0',
    amber: isDark ? '#423616' : '#FFF8E7',
    purple: isDark ? '#362044' : '#F8EAFE',
  };

  const actions: ActionItem[] = [
    {
      key: 'explain',
      label: bc?.explain || 'Explain',
      description: 'Understand the meaning of this verse.',
      icon: <Lightbulb size={24} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: () => { onExplain?.(); dismiss(); },
      section: 'study',
    },
    {
      key: 'strongs',
      label: "Strong's Concordance",
      description: "Explore original language and Strong's references.",
      icon: <Hash size={25} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: handleStrongs,
      section: 'study',
    },
    {
      key: 'study',
      label: 'Study Tools',
      description: 'Abide: look, listen, learn, abide, apply.',
      icon: <FlaskConical size={23} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: handleStudy,
      section: 'study',
    },
    {
      key: 'note',
      label: bc?.notes || 'Notes',
      description: 'Add and view your verse notes.',
      icon: <FileText size={23} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: () => { guard('Notes require a free account.', () => { if (onNote) onNote(); else onOpenNoteModal?.(verseNumber); dismiss(); }); },
      section: 'study',
    },
    {
      key: 'crossrefs',
      label: 'Cross References',
      description: 'See related verses.',
      icon: <Link2 size={23} color={iconColors.blue} strokeWidth={2.2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: handleCrossRefs,
      section: 'resources',
    },
    {
      key: 'background',
      label: 'Background & Context',
      description: 'Historical and cultural insights.',
      icon: <Landmark size={23} color={iconColors.blue} strokeWidth={2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: handleBackground,
      section: 'resources',
    },
    {
      key: 'compare',
      label: 'Compare Translations',
      description: 'See this verse in other versions.',
      icon: <Repeat2 size={23} color={iconColors.blue} strokeWidth={2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: handleCompareTranslations,
      section: 'resources',
    },
    {
      key: 'devotional',
      label: 'Devotional on This Verse',
      description: 'Read a devotional insight.',
      icon: <Sun size={24} color={iconColors.blue} strokeWidth={2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: handleDevotional,
      section: 'resources',
    },
    {
      key: 'studytools',
      label: sortedVerses.length > 1 ? 'Study Tools for Selection' : 'Study Tools for Verse',
      description: 'In-depth tools and commentaries.',
      icon: <BookMarked size={23} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: handleOpenStudyTools,
      section: 'resources',
    },
    {
      key: 'listen',
      label: bc?.audioBible || bc?.playAudio || 'Listen to Audio',
      description: 'Hear this verse read aloud.',
      icon: <Headphones size={23} color={iconColors.green} strokeWidth={2} />,
      iconBackground: iconBackgrounds.green,
      onPress: () => { guard('Audio narration requires a free account.', () => { onListen?.(); dismiss(); }); },
      section: 'save',
    },
    {
      key: 'highlight',
      label: bc?.highlight || 'Highlight Verse',
      description: 'Highlight and color code.',
      icon: <Highlighter size={23} color={iconColors.amber} strokeWidth={2} />,
      iconBackground: iconBackgrounds.amber,
      onPress: () => { guard('Highlights require a free account.', () => { if (onHighlight) onHighlight(); else onOpenHighlightPicker?.(verseNumber); dismiss(); }); },
      section: 'save',
    },
    {
      key: 'favorite',
      label: bc?.favorites || 'Add to Favorites',
      description: 'Save this verse.',
      icon: <Star size={24} color={iconColors.purple} strokeWidth={2} />,
      iconBackground: iconBackgrounds.purple,
      onPress: () => { guard('Favourites require a free account.', () => { onFavorite?.(); dismiss(); }); },
      section: 'save',
    },
    {
      key: 'journal',
      label: bc?.journal || 'Save to Journal',
      description: 'Keep this verse in your journal.',
      icon: <BookText size={23} color={iconColors.purple} strokeWidth={2} />,
      iconBackground: iconBackgrounds.purple,
      onPress: () => {
        if (!hasAccess('legacy_sower')) { dismiss(); navigation?.navigate(route.sower); return; }
        guard('Journal requires a free account.', () => { onJournal?.(); dismiss(); });
      },
      section: 'save',
    },
    {
      key: 'search',
      label: 'Search This Text',
      description: 'Find related words and passages.',
      icon: <Search size={22} color={iconColors.navy} strokeWidth={2} />,
      iconBackground: iconBackgrounds.navy,
      onPress: handleSearchVerse,
      section: 'share',
    },
    {
      key: 'share',
      label: bc?.share || 'Share Verse',
      description: 'Share this verse with others.',
      icon: <Share2 size={22} color={iconColors.blue} strokeWidth={2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: () => { guard('Sharing requires a free account.', () => { onShare?.(); dismiss(); }); },
      section: 'share',
    },
    {
      key: 'copy',
      label: bc?.copy || 'Copy Verse',
      description: 'Copy the verse text and reference.',
      icon: <Copy size={22} color={iconColors.blue} strokeWidth={2} />,
      iconBackground: iconBackgrounds.blue,
      onPress: () => { guard('Copying requires a free account.', () => { onCopy?.(); dismiss(); }); },
      section: 'share',
    },
  ];

  const groupedActions: { section: string; items: ActionItem[] }[] = [];
  for (const sectionKey of SECTION_KEYS) {
    const sectionActions = actions.filter(action => action.section === sectionKey);
    if (sectionActions.length > 0) {
      groupedActions.push({ section: sectionKey, items: sectionActions });
    }
  }

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
            width: panelWidth,
            backgroundColor: COLORS.surface,
            borderLeftColor: COLORS.border,
            transform: [{ translateX: slideAnim }],
            shadowColor: COLORS.shadowColor,
          },
        ]}
      >
        {/* Header */}
        <View style={[localStyles.header, isRtl && localStyles.headerRtl]}>
          <View
            style={[localStyles.headerLeft, isRtl && localStyles.headerLeftRtl]}
          >
            <View
              style={[
                localStyles.bookIconWrap,
                isDark
                  ? localStyles.bookIconDark
                  : localStyles.bookIconLight,
              ]}
            >
              <BookOpen
                size={23}
                color={isDark ? '#8AB4F8' : '#123D72'}
                strokeWidth={2}
              />
            </View>
            <View style={localStyles.headerTextGroup}>
              <Text style={[localStyles.countText, { color: COLORS.text }]}>
                {verseRef}
              </Text>
              <Text
                style={[localStyles.versePreview, { color: COLORS.muted }]}
                numberOfLines={1}
              >
                “{verseText.slice(0, 60)}{verseText.length > 60 ? '…' : ''}”
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              localStyles.closeBtn,
              isDark ? localStyles.closeBtnDark : localStyles.closeBtnLight,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={COLORS.text} strokeWidth={2.2} />
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
          {groupedActions.map((group, groupIndex) => (
            <View key={group.section} style={localStyles.sectionGroup}>
              {groupIndex > 0 ? (
                <View
                  style={[
                    localStyles.sectionDivider,
                    { backgroundColor: COLORS.border },
                  ]}
                />
              ) : null}
              <Text style={[localStyles.sectionHeader, { color: COLORS.muted }]}>
                {SECTION_ORDER[group.section]?.label || group.section}
              </Text>
              {group.items.map((action) => (
                <ActionButton
                  key={action.key}
                  label={action.label}
                  description={action.description}
                  icon={action.icon}
                  iconBackground={action.iconBackground}
                  onPress={action.onPress}
                  COLORS={COLORS}
                  isRtl={isRtl}
                />
              ))}
            </View>
          ))}

          {/* Bottom safe padding */}
          <View
            style={
              Platform.OS === 'ios'
                ? localStyles.bottomSafeIos
                : localStyles.bottomSafeAndroid
            }
          />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 28,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 28,
    zIndex: 200,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
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
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIconLight: {
    backgroundColor: '#EEF0FA',
  },
  bookIconDark: {
    backgroundColor: '#182B47',
  },
  countText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  versePreview: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 2,
    fontStyle: 'italic',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnLight: {
    backgroundColor: '#F1F2F7',
  },
  closeBtnDark: {
    backgroundColor: '#263248',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
  sliderContainer: {
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: SPACING.sm,
  },
  sectionGroup: {
    marginBottom: SPACING.sm,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 7,
    gap: 13,
  },
  actionRowRtl: {
    flexDirection: 'row-reverse',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 1,
  },
  bottomSafeIos: {
    height: 20,
  },
  bottomSafeAndroid: {
    height: 12,
  },
});
