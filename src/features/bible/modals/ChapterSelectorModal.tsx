import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { X, BookOpen } from 'lucide-react-native';
import { ChapterSelectorModalProps } from '../types';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { getColors, FONT_SIZES } from '../../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const COLUMNS = 5;
const GAP = 10;
const H_PAD = 16;
const ITEM_SIZE = Math.floor(
  (Dimensions.get('window').width - H_PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
);

export default function ChapterSelectorModal({
  visible,
  onClose,
  maxChapters,
  currentChapter,
  onSelectChapter,
  isDark,
  bookHeadings,
}: ChapterSelectorModalProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);
  const scrollRef = useRef<ScrollView>(null);

  // ── Animation ─────────────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Scroll to current chapter row after sheet opens
      const rowIndex = Math.floor((currentChapter - 1) / COLUMNS);
      const scrollY = Math.max(0, rowIndex * (ITEM_SIZE + GAP) - ITEM_SIZE);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 320);
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const chapters = useMemo(
    () => Array.from({ length: maxChapters }, (_, i) => i + 1),
    [maxChapters],
  );

  const handleSelect = (ch: number) => {
    onSelectChapter(ch);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: COLORS.cardBackground,
            borderTopColor: COLORS.primary,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: COLORS.border }]} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View
              style={[s.iconWrap, { backgroundColor: `${COLORS.primary}18` }]}
            >
              <BookOpen size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[s.title, { color: COLORS.text }]}>
                {bc?.selectChapter || 'Select Chapter'}
              </Text>
              <Text style={[s.subtitle, { color: COLORS.muted }]}>
                {maxChapters} {bc?.chaptersAvailable || 'chapters available'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: COLORS.surface }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={17} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: COLORS.border }]} />

        {/* Chapter grid */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.grid}
        >
          {chapters.map(ch => {
            const isActive = ch === currentChapter;
            const preview = bookHeadings?.[ch]?.[0]?.heading || null;
            return (
              <TouchableOpacity
                key={ch}
                onPress={() => handleSelect(ch)}
                activeOpacity={0.75}
                style={[
                  s.cell,
                  {
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                    // Subtle shadow on active
                    shadowColor: isActive ? COLORS.primary : 'transparent',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isActive ? 0.35 : 0,
                    shadowRadius: 6,
                    elevation: isActive ? 4 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    s.cellText,
                    {
                      color: isActive ? COLORS.white : COLORS.text,
                      fontWeight: isActive ? '800' : '500',
                    },
                  ]}
                >
                  {ch}
                </Text>

                {/* Reserved preview slot keeps all cells uniform */}
                <Text
                  style={[
                    s.cellPreview,
                    { color: isActive ? 'rgba(255,255,255,0.85)' : COLORS.primary },
                  ]}
                  numberOfLines={1}
                >
                  {preview || ' '}
                </Text>

                {/* Active dot indicator */}
                {isActive && (
                  <View
                    style={[
                      s.activeDot,
                      { backgroundColor: 'rgba(255,255,255,0.6)' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Safe area spacer */}
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 14,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 10,
    paddingBottom: 8,
    rowGap: GAP,
  },
  cell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE + 20,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 3,
  },
  cellText: {
    fontSize: FONT_SIZES.md,
    letterSpacing: -0.2,
  },
  cellPreview: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 1,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
