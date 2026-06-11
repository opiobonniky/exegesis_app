import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isPrimary?: any;
};

// ── Sub-component: animated action button ────────────────────────────────────

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
      toValue: 0.88,
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
        style={[localStyles.actionBtn, { transform: [{ scale }] }]}
      >
        {/* Icon container */}
        <View
          style={[
            localStyles.iconWrap,
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
        {/* Label */}
        <Text
          style={[
            localStyles.actionLabel,
            { color: isPrimary ? COLORS.white : 'rgba(255,255,255,0.85)' },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  // Derive current range from selection
  const sortedVerses = useMemo(
    () => [...selectedVerses].sort((a, b) => a - b),
    [selectedVerses],
  );
  const startVerse = sortedVerses[0] ?? 1;
  const endVerse = sortedVerses[sortedVerses.length - 1] ?? 1;

  const screenWidth = Dimensions.get('window').width;

  // Slide-in animation from the right
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
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
      icon: <Headphones size={19} color={COLORS.primary} strokeWidth={2} />,
      onPress: onListen,
      isPrimary: true,
    },

    {
      key: 'journal',
      label: bc?.journal || 'Journal',
      icon: <BookText size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onJournal,
    },

    {
      key: 'explain',
      label: bc?.explain || 'Explain',
      icon: <Lightbulb size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onExplain,
    },

    {
      key: 'highlight',
      label: bc?.highlight || 'Highlight',
      icon: <Edit3 size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onHighlight,
    },
    {
      key: 'note',
      label: bc?.note || 'Note',
      icon: (
        <FileText size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />
      ),
      onPress: onNote,
    },
    {
      key: 'favorite',
      label: bc?.favorite || 'Favorite',
      icon: <Star size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onFavorite,
    },

    {
      key: 'share',
      label: bc?.share || 'Share',
      icon: <Share2 size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onShare,
    },
    {
      key: 'copy',
      label: bc?.copy || 'Copy',
      icon: <Copy size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onCopy,
    },
  ].filter((action): action is any => action !== null);

  return (
    <Animated.View
      style={[
        localStyles.container,
        {
          backgroundColor: COLORS.primary,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Top decorative accent line */}
      <View
        style={[
          localStyles.accentLine,
          { backgroundColor: 'rgba(255,255,255,0.18)' },
        ]}
      />

      {/* Header row */}
      <View style={[localStyles.header, isRtl && localStyles.headerRtl]}>
        {/* Left: book icon + selection count */}
        <View style={[localStyles.headerLeft, isRtl && localStyles.headerLeftRtl]}>
          <View
            style={[
              localStyles.bookIconWrap,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <BookOpen size={12} color={COLORS.white} strokeWidth={2.5} />
          </View>
          <View>
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

        {/* Right: close button */}
        <TouchableOpacity
          onPress={onClear}
          style={[
            localStyles.closeBtn,
            { backgroundColor: 'rgba(255,255,255,0.18)' },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color={COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View
        style={[
          localStyles.divider,
          { backgroundColor: 'rgba(255,255,255,0.12)' },
        ]}
      />

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

      {/* Actions row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollContent}
        style={localStyles.scrollView}
        decelerationRate="fast"
      >
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            {/* Subtle separator between primary and secondary actions */}
            {index === 2 && (
              <View
                style={[
                  localStyles.verticalDivider,
                  { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              />
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
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  accentLine: {
    height: 3,
    width: 30,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countSuffix: {
    fontWeight: '400',
    opacity: 0.85,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  sliderContainer: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    gap: 2,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 6,
    borderRadius: 1,
    alignSelf: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 52,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
