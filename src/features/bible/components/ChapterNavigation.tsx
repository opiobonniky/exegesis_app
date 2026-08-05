import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Square,
  Volume2,
} from 'lucide-react-native';
import {
  useLanguage,
  toArabicIndic,
} from '../../../component/language-translation/LanguageProvider';
import { ChapterNavigationProps } from '../types';

// ── Design tokens (from biblescreen.jpeg) ─────────────────────────────────────
const BAR_BG = '#25385C';
const PILL_BG = '#55719B';
const ARROW = '#FFFFFF';

// ─────────────────────────────────────────────────────────────────────────────
// LiveBars — only ever uses useNativeDriver: true (scaleY transform)
// ─────────────────────────────────────────────────────────────────────────────

function LiveBars({ color }: { color: string }) {
  const bars = useRef(
    [0.4, 0.7, 1.0, 0.6, 0.35].map(v => new Animated.Value(v)),
  ).current;
  const loops = useRef<Animated.CompositeAnimation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const cfgs = [
      { peak: 0.95, dur: 310 },
      { peak: 0.55, dur: 430 },
      { peak: 1.0, dur: 270 },
      { peak: 0.65, dur: 390 },
      { peak: 0.8, dur: 340 },
    ];

    loops.current.forEach(l => l.stop());
    timers.current.forEach(t => clearTimeout(t));
    loops.current = [];
    timers.current = [];

    cfgs.forEach(({ peak, dur }, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bars[i], {
            toValue: peak,
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bars[i], {
            toValue: 0.15,
            duration: dur * 0.85,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      const t = setTimeout(() => loop.start(), i * 65);
      loops.current.push(loop);
      timers.current.push(t);
    });

    return () => {
      loops.current.forEach(l => l.stop());
      timers.current.forEach(t => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={barStyles.row}>
      {bars.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            barStyles.bar,
            { backgroundColor: color, transform: [{ scaleY: anim }] },
          ]}
        />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 18 },
  bar: { width: 2.5, height: 14, borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ExtendedChapterNavigationProps extends ChapterNavigationProps {
  isAudioPlaying?: boolean;
  onAudioChapter?: () => void;
  isRtl?: boolean;
  translations?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterNavigation
// ─────────────────────────────────────────────────────────────────────────────

export default function ChapterNavigation({
  currentChapter,
  maxChapters,
  onPrev,
  onNext,
  onSelectChapter,
  isAudioPlaying = false,
  onAudioChapter,
  isRtl,
  translations: translationsProp,
}: ExtendedChapterNavigationProps) {
  const { translations: langTranslations } = useLanguage();
  const t = translationsProp || langTranslations;

  const isFirstChapter = currentChapter <= 1;
  const isLastChapter = currentChapter >= maxChapters;

  // ── Pulse glow — opacity only → useNativeDriver: true ─────────────────────
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (pulseLoop.current) {
      pulseLoop.current.stop();
      pulseLoop.current = null;
    }

    if (isAudioPlaying) {
      glowOpacity.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      pulseLoop.current = loop;
    } else {
      glowOpacity.setValue(0);
    }

    return () => {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioPlaying]);

  return (
    <View style={[localStyles.bar, isRtl && localStyles.barRtl]}>
      {/* ── Prev ── */}
      <Pressable
        style={localStyles.arrowBtn}
        onPress={onPrev}
        disabled={isFirstChapter}
      >
        {isRtl ? (
          <ArrowRight
            size={22}
            color={isFirstChapter ? 'rgba(255,255,255,0.35)' : ARROW}
            strokeWidth={2.6}
          />
        ) : (
          <ArrowLeft
            size={22}
            color={isFirstChapter ? 'rgba(255,255,255,0.35)' : ARROW}
            strokeWidth={2.6}
          />
        )}
      </Pressable>

      {/* ── Center pills ── */}
      <View style={[localStyles.center, isRtl && localStyles.centerRtl]}>
        <TouchableOpacity
          style={localStyles.pill}
          onPress={onSelectChapter}
          activeOpacity={0.8}
        >
          <Text style={localStyles.pillText}>
            {t?.bible?.chapter || 'Chapter'} {toArabicIndic(isRtl ?? false, currentChapter)}
          </Text>
          <Text style={localStyles.pillChevron}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAudioChapter}
          activeOpacity={0.82}
          disabled={!onAudioChapter}
          style={localStyles.pill}
        >
          {isAudioPlaying ? (
            <>
              <LiveBars color="#F0B429" />
              <Text style={localStyles.pillText}>
                {t?.bible?.stop || 'Stop'}
              </Text>
              <Square size={8} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
            </>
          ) : (
            <>
              <Volume2 size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={localStyles.pillText}>
                {t?.bible?.read || 'Read'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Next ── */}
      <Pressable
        style={localStyles.arrowBtn}
        onPress={onNext}
        disabled={isLastChapter}
      >
        {isRtl ? (
          <ArrowLeft
            size={22}
            color={isLastChapter ? 'rgba(255,255,255,0.35)' : ARROW}
            strokeWidth={2.6}
          />
        ) : (
          <ArrowRight
            size={22}
            color={isLastChapter ? 'rgba(255,255,255,0.35)' : ARROW}
            strokeWidth={2.6}
          />
        )}
      </Pressable>
    </View>
  );
}

const localStyles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BAR_BG,
    paddingHorizontal: 10,
    height: 44,
  },
  barRtl: {
    flexDirection: 'row-reverse',
  },
  arrowBtn: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  centerRtl: {
    flexDirection: 'row-reverse',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PILL_BG,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pillChevron: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
  },
});
