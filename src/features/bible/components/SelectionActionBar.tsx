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
  onHighlight,
  onNote,
  onFavorite,
  onShare,
  onCopy,
  onClear,
  onJournal,
  isDark,
}: SelectionActionBarProps) {
  const COLORS = getColors(isDark);

  // Derive current range from selection
  const sortedVerses = useMemo(
    () => [...selectedVerses].sort((a, b) => a - b),
    [selectedVerses],
  );
  const startVerse = sortedVerses[0] ?? 1;
  const endVerse = sortedVerses[sortedVerses.length - 1] ?? 1;

  // Slide-in animation
  const slideAnim = useRef(new Animated.Value(120)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, []);

  const actions: any[] = [
    {
      key: 'listen',
      label: 'Listen',
      icon: <Headphones size={22} color={COLORS.primary} strokeWidth={2} />,
      onPress: onListen,
      isPrimary: true,
    },

    {
      key: 'highlight',
      label: 'Highlight',
      icon: <Edit3 size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onHighlight,
    },
    {
      key: 'note',
      label: 'Note',
      icon: (
        <FileText size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />
      ),
      onPress: onNote,
    },
    {
      key: 'favorite',
      label: 'Favorite',
      icon: <Star size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onFavorite,
    },
    {
      key: 'journal',
      label: 'Journal',
      icon: <BookText size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onJournal,
    },
    {
      key: 'share',
      label: 'Share',
      icon: <Share2 size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onShare,
    },
    {
      key: 'copy',
      label: 'Copy',
      icon: <Copy size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />,
      onPress: onCopy,
    },
  ].filter((action): action is any => action !== null);

  return (
    <Animated.View
      style={[
        localStyles.container,
        {
          backgroundColor: COLORS.primary,
          transform: [{ translateY: slideAnim }],
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
      <View style={localStyles.header}>
        {/* Left: book icon + selection count */}
        <View style={localStyles.headerLeft}>
          <View
            style={[
              localStyles.bookIconWrap,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <BookOpen size={14} color={COLORS.white} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[localStyles.countText, { color: COLORS.white }]}>
              {selectedCount}{' '}
              <Text style={localStyles.countSuffix}>
                {selectedCount === 1 ? 'verse selected' : 'verses selected'}
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
          <X size={16} color={COLORS.white} strokeWidth={2.5} />
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
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 100,
    // Rich shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  accentLine: {
    height: 4,
    width: 40,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countSuffix: {
    fontWeight: '400',
    opacity: 0.85,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
    marginBottom: 10,
  },
  sliderContainer: {
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 4,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 8,
    borderRadius: 1,
    alignSelf: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 62,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    // Inner shadow effect via shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
