import React, { useMemo, useRef, useCallback } from 'react';
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
  Headphones,
  Lightbulb,
  Edit3,
  FileText,
  Star,
  Share2,
  Copy,
  X,
  BookOpen,
  BookText,
} from 'lucide-react-native';
import {
  getColors,
} from '../../../constants/theme';
import { SelectionActionBarProps } from '../types';
import VerseRangeSlider from '../modals/VerseRangeSlider';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

const PANEL_WIDTH = 290;

type ActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isPrimary?: boolean;
  section: 'actions' | 'tools' | 'share';
};

const SECTION_ORDER: Record<string, { label: string; order: number }> = {
  actions: { label: 'Actions', order: 0 },
  tools: { label: 'Tools', order: 1 },
  share: { label: 'Share & Export', order: 2 },
};

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
  COLORS: any;
}) {
  const bgAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () =>
    Animated.timing(bgAnim, { toValue: 1, duration: 120, useNativeDriver: false }).start();

  const handlePressOut = () =>
    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[localStyles.actionRow, { backgroundColor: bgColor }]}>
        <View
          style={[
            localStyles.actionIcon,
            isPrimary
              ? {
                  backgroundColor: COLORS.white,
                  borderColor: 'rgba(255,255,255,0.5)',
                }
              : {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.18)',
                },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            localStyles.actionLabel,
            { color: isPrimary ? COLORS.white : 'rgba(255,255,255,0.88)' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function SelectionActionBar({
  selectedCount,
  selectedVerses,
  totalVerses,
  onRangeChange,
  onListen,
  onExplain,
  onHighlight,
  onNote,
  onFavorite,
  onShare,
  onCopy,
  onClear,
  onJournal,
  isDark,
  isRtl,
}: SelectionActionBarProps & { isRtl?: boolean }) {
  const COLORS = getColors(isDark);

  const sortedVerses = useMemo(
    () => [...selectedVerses].sort((a, b) => a - b),
    [selectedVerses],
  );
  const startVerse = sortedVerses[0] ?? 1;
  const endVerse = sortedVerses[sortedVerses.length - 1] ?? 1;

  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
  }, []);

  const { translations } = useLanguage();
  const bc = translations?.bible;

  const dismiss = useCallback(() => {
    onClear?.();
  }, [onClear]);

  const actions: ActionItem[] = [
    {
      key: 'listen',
      label: bc?.listen || 'Listen',
      icon: <Headphones size={18} color={COLORS.primary} strokeWidth={2} />,
      onPress: () => { onListen?.(); dismiss(); },
      isPrimary: true,
      section: 'actions',
    },
    {
      key: 'journal',
      label: bc?.journal || 'Journal',
      icon: <BookText size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onJournal?.(); dismiss(); },
      section: 'actions',
    },
    {
      key: 'explain',
      label: bc?.explain || 'Explain',
      icon: <Lightbulb size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onExplain?.(); dismiss(); },
      section: 'actions',
    },
    {
      key: 'highlight',
      label: bc?.highlight || 'Highlight',
      icon: <Edit3 size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onHighlight?.(); dismiss(); },
      section: 'tools',
    },
    {
      key: 'note',
      label: bc?.note || 'Note',
      icon: (
        <FileText size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
      ),
      onPress: () => { onNote?.(); dismiss(); },
      section: 'tools',
    },
    {
      key: 'favorite',
      label: bc?.favorite || 'Favorite',
      icon: <Star size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onFavorite?.(); dismiss(); },
      section: 'tools',
    },
    {
      key: 'share',
      label: bc?.share || 'Share',
      icon: <Share2 size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onShare?.(); dismiss(); },
      section: 'share',
    },
    {
      key: 'copy',
      label: bc?.copy || 'Copy',
      icon: <Copy size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: () => { onCopy?.(); dismiss(); },
      section: 'share',
    },
  ];

  const groupedActions = useMemo(() => {
    const groups: { section: string; items: ActionItem[] }[] = [];
    const seen = new Set<string>();
    for (const a of actions) {
      if (!seen.has(a.section)) {
        seen.add(a.section);
        groups.push({ section: a.section, items: [a] });
      } else {
        groups[groups.length - 1].items.push(a);
      }
    }
    return groups;
  }, [actions]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Animated backdrop */}
      <Animated.View
        style={[localStyles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClear}
        />
      </Animated.View>

      <Animated.View
        style={[
          localStyles.container,
          {
            backgroundColor: COLORS.primary,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={[localStyles.header, isRtl && localStyles.headerRtl]}>
          <View style={[localStyles.headerLeft, isRtl && localStyles.headerLeftRtl]}>
            <View style={[localStyles.bookIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <BookOpen size={13} color={COLORS.white} strokeWidth={2.5} />
            </View>
            <View style={localStyles.headerTextGroup}>
              <Text style={[localStyles.countText, { color: COLORS.white }]}>
                {selectedCount}{' '}
                <Text style={localStyles.countSuffix}>
                  {selectedCount === 1
                    ? bc?.verseSelected || 'verse selected'
                    : bc?.versesSelected || 'verses selected'}
                </Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClear}
            style={[localStyles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={15} color={COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Verse Range Slider */}
        {totalVerses > 1 && (
          <View style={localStyles.sliderContainer}>
            <VerseRangeSlider
              totalVerses={totalVerses}
              startVerse={startVerse}
              endVerse={endVerse}
              onRangeChange={onRangeChange}
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
        >
          {groupedActions.map((group) => (
            <View key={group.section}>
              <Text style={[localStyles.sectionHeader, { color: 'rgba(255,255,255,0.45)' }]}>
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
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLeftRtl: {
    flexDirection: 'row-reverse',
  },
  headerTextGroup: {
    flexShrink: 1,
  },
  bookIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countSuffix: {
    fontWeight: '500',
    opacity: 0.7,
    fontSize: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 13,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
});
