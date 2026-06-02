import React, { useEffect, useRef } from 'react';
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
import {
  X,
  BookOpen,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import { ExplanationModalProps } from '../types';
import { useLanguage, toArabicIndic, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.78;

export default function ExplanationModal({
  visible,
  onClose,
  verses,
  selectedVerses,
  explanation,
  currentBook,
  currentChapter,
  onReadMore,
  isDark,
}: ExplanationModalProps) {
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;
  const COLORS = getColors(isDark);

  // ── Animations ─────────────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Staggered entrance: overlay → sheet → content
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          speed: 16,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
  const verseRef =
    sortedVerses.length === 1
      ? `${currentBook} ${currentChapter}:${sortedVerses[0]}`
      : `${currentBook} ${currentChapter}:${sortedVerses[0]}–${sortedVerses[sortedVerses.length - 1]}`;

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
            transform: [{ translateY: sheetTranslateY }],
            // Top border accent
            borderTopColor: COLORS.primary,
          },
        ]}
      >
        {/* ── Drag handle ──────────────────────────────────────────────── */}
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: COLORS.border }]} />
        </View>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Animated.View style={[s.header, { opacity: contentFade }]}>
          {/* Left: icon + titles */}
          <View style={s.headerLeft}>
            <View
              style={[
                s.headerIconWrap,
                { backgroundColor: `${COLORS.primary}18` },
              ]}
            >
              <BookOpen size={20} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[s.headerTitle, { color: COLORS.text }]}>
                {bc?.verseExplanation || 'Verse Explanation'}
              </Text>
              <Text style={[s.headerRef, { color: COLORS.primary }]}>
                {verseRef}
              </Text>
            </View>
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: COLORS.surface }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>

        {/* Thin accent rule under header */}
        <View style={[s.headerDivider, { backgroundColor: COLORS.border }]} />

        {/* ── Scrollable content ────────────────────────────────────────── */}
        <Animated.View style={[s.scrollWrapper, { opacity: contentFade }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* ── Selected verses block ───────────────────────────────── */}
            <View
              style={[
                s.versesCard,
                { backgroundColor: COLORS.surface, borderColor: COLORS.border },
              ]}
            >
              {/* Label row */}
              <View style={s.versesLabelRow}>
                <View
                  style={[
                    s.versesLabelDot,
                    { backgroundColor: COLORS.primary },
                  ]}
                />
                <Text style={[s.versesLabel, { color: COLORS.muted }]}>
                  {bc?.selectedVersesLabel || 'SELECTED VERSES'}
                </Text>
              </View>

              {sortedVerses.map((v, index) => (
                <View
                  key={v}
                  style={[
                    s.verseRow,
                    index < sortedVerses.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                    },
                  ]}
                >
                  {/* Verse number pill */}
                  <View
                    style={[
                      s.verseNumPill,
                      { backgroundColor: `${COLORS.primary}18` },
                    ]}
                  >
                    <Text style={[s.verseNumText, { color: COLORS.primary }]}>
                      {toArabicIndic(isRtl, v)}
                    </Text>
                  </View>
                  {/* Verse text */}
                  <Text style={[s.verseBodyText, { color: COLORS.text }]}>
                    {verses[v]}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Explanation block ────────────────────────────────────── */}
            <View
              style={[
                s.explanationCard,
                { backgroundColor: COLORS.surface, borderColor: COLORS.border },
              ]}
            >
              {/* Card header */}
              <View
                style={[
                  s.explanationCardHeader,
                  { borderBottomColor: COLORS.border },
                ]}
              >
                <View
                  style={[
                    s.sparkleWrap,
                    { backgroundColor: `${COLORS.primary}18` },
                  ]}
                >
                  <Sparkles size={16} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View>
                  <Text
                    style={[s.explanationCardTitle, { color: COLORS.text }]}
                  >
                    {bc?.meaningAndContext || 'Meaning & Context'}
                  </Text>
                  <Text
                    style={[s.explanationCardSubtitle, { color: COLORS.muted }]}
                  >
                    {bc?.aiPoweredInsight || 'AI-powered insight'}
                  </Text>
                </View>
              </View>

              {/* Body text with left accent border */}
              <View
                style={[
                  s.explanationBody,
                  { borderLeftColor: `${COLORS.primary}40` },
                ]}
              >
                <Text style={[s.explanationText, { color: COLORS.text }]}>
                  {explanation}
                </Text>
              </View>

              {/* Read more CTA */}
              <TouchableOpacity
                style={[s.readMoreBtn, { backgroundColor: COLORS.primary }]}
                onPress={onReadMore}
                activeOpacity={0.85}
              >
                <Text style={[s.readMoreText, { color: COLORS.white }]}>
                  {bc?.fullDeepDive || 'Full Deep Dive'}
                </Text>
                <ChevronRight
                  size={16}
                  color={COLORS.white}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom spacer for safe area */}
            <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    overflow: 'hidden',
    // Rich shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
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
    flex: 1,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerRef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // ── Verses card ────────────────────────────────────────────────────────────
  versesCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  versesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  versesLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  versesLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verseNumPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 2,
  },
  verseNumText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  verseBodyText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // ── Explanation card ───────────────────────────────────────────────────────
  explanationCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  explanationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sparkleWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explanationCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  explanationCardSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  explanationBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 3,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  readMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
