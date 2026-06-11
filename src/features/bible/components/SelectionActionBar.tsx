import React, { useMemo, useRef } from 'react';
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
  FONT_SIZES,
  BORDER_RADIUS,
  SPACING,
} from '../../../constants/theme';
import { SelectionActionBarProps } from '../types';
import VerseRangeSlider from '../modals/VerseRangeSlider';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

const PANEL_WIDTH = 270;

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
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[localStyles.actionRow, { transform: [{ scale }] }]}
      >
        <View
          style={[
            localStyles.actionIcon,
            isPrimary
              ? {
                  backgroundColor: COLORS.white,
                  borderColor: 'rgba(255,255,255,0.6)',
                }
              : {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            localStyles.actionLabel,
            { color: isPrimary ? COLORS.white : 'rgba(255,255,255,0.85)' },
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
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, []);

  const { translations } = useLanguage();
  const bc = translations?.bible;

  const actions: any[] = [
    {
      key: 'listen',
      label: bc?.listen || 'Listen',
      icon: <Headphones size={18} color={COLORS.primary} strokeWidth={2} />,
      onPress: onListen,
      isPrimary: true,
    },
    {
      key: 'journal',
      label: bc?.journal || 'Journal',
      icon: <BookText size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onJournal,
    },
    {
      key: 'explain',
      label: bc?.explain || 'Explain',
      icon: <Lightbulb size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onExplain,
    },
    {
      key: 'highlight',
      label: bc?.highlight || 'Highlight',
      icon: <Edit3 size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onHighlight,
    },
    {
      key: 'note',
      label: bc?.note || 'Note',
      icon: (
        <FileText size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
      ),
      onPress: onNote,
    },
    {
      key: 'favorite',
      label: bc?.favorite || 'Favorite',
      icon: <Star size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onFavorite,
    },
    {
      key: 'share',
      label: bc?.share || 'Share',
      icon: <Share2 size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onShare,
    },
    {
      key: 'copy',
      label: bc?.copy || 'Copy',
      icon: <Copy size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onCopy,
    },
  ].filter((action): action is any => action !== null);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClear}
      />
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
            <View style={[localStyles.bookIconWrap, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <BookOpen size={13} color={COLORS.white} strokeWidth={2.5} />
            </View>
            <Text style={[localStyles.countText, { color: COLORS.white }]}>
              {selectedCount}{' '}
              <Text style={localStyles.countSuffix}>
                {selectedCount === 1
                  ? bc?.verseSelected || 'verse selected'
                  : bc?.versesSelected || 'verses selected'}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClear}
            style={[localStyles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={14} color={COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[localStyles.divider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />

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

        {/* Actions list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={localStyles.scrollContent}
          style={localStyles.scrollView}
        >
          {actions.map((action, index) => (
            <React.Fragment key={action.key}>
              {index === 2 && (
                <View style={[localStyles.separator, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              )}
              <ActionButton
                label={action.label}
                icon={action.icon}
                onPress={action.onPress}
                isPrimary={action.isPrimary}
                COLORS={COLORS}
              />
            </React.Fragment>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLeftRtl: {
    flexDirection: 'row-reverse',
  },
  bookIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countSuffix: {
    fontWeight: '400',
    opacity: 0.85,
    fontSize: 11,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sliderContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  separator: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
});
