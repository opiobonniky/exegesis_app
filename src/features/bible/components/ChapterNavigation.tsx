

import React, { useEffect, useMemo, useRef } from 'react';
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
  ArrowBigLeft,
  ArrowBigRight,
  Square,
  Volume2,
} from 'lucide-react-native';
import { getColors } from '../../../constants/theme';
import { ChapterNavigationProps } from '../types';
import { createBibleStyles } from '../bibleStyle';

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

    // Stop any previous loops first (guards against remount races)
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
            useNativeDriver: true, // ✓ only scaleY — native is fine
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
      // Stop synchronously so native nodes are freed before unmount
      loops.current.forEach(l => l.stop());
      timers.current.forEach(t => clearTimeout(t));
    };
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
  isDark,
  isAudioPlaying = false,
  onAudioChapter,
}: ExtendedChapterNavigationProps) {
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  // ── Pulse glow — opacity only → useNativeDriver: true, zero conflict ───────
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Always stop the previous loop before starting a new one
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
            useNativeDriver: true, // ✓ opacity only
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
  }, [isAudioPlaying]);

  // Pill colours derived from plain state — no Animated interpolation on colour
  const pillBg = isAudioPlaying ? COLORS.primary : COLORS.surface;
  const pillBorder = isAudioPlaying ? 'rgba(255,255,255,0.45)' : COLORS.border;
  const pillGlow = isAudioPlaying ? COLORS.primary : 'transparent';

  return (
    <View style={[styles.navCard,]}>
      <Pressable
        style={[
          styles.navButton,
          currentChapter === 1 && styles.navButtonDisabled,
        ]}
        onPress={onPrev}
        disabled={currentChapter === 1}
      >
        <ArrowBigLeft
          size={24}
          color={currentChapter === 1 ? COLORS.muted : COLORS.text}
        />
      </Pressable>

      <TouchableOpacity style={styles.chapterButton} onPress={onSelectChapter}>
        <Text style={styles.chapterButtonText}>Ch. {currentChapter}</Text>
        <Text style={styles.chapterButtonIcon}>▼</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAudioChapter}
        activeOpacity={0.82}
        disabled={!onAudioChapter}
        style={{ opacity: onAudioChapter ? 1 : 0.5 }}
      >
       
        <View
          style={[
            localStyles.audioPill,
            { backgroundColor: pillBg, borderColor: pillBorder },
          ]}
        >
          
          {isAudioPlaying && (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                localStyles.glowOverlay,
                { backgroundColor: pillGlow, opacity: glowOpacity },
              ]}
              pointerEvents="none"
            />
          )}

          {isAudioPlaying ? (
            <>
              <LiveBars color={COLORS.accent} />
              <Text style={localStyles.pillTextActive}>Stop</Text>
              <Square size={9} color="#fff" fill="#fff" strokeWidth={0} />
            </>
          ) : (
            <>
              <Volume2 size={14} color={COLORS.text} strokeWidth={2.5} />
              <Text style={[localStyles.pillText, { color: COLORS.text }]}>
                Read
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navButton,
          currentChapter >= maxChapters && styles.navButtonDisabled,
        ]}
        onPress={onNext}
        disabled={currentChapter >= maxChapters}
      >
        <ArrowBigRight
          size={24}
          color={currentChapter >= maxChapters ? COLORS.muted : COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local styles
// ─────────────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden', // clips the glow overlay to the pill shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  glowOverlay: {
    borderRadius: 22,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pillTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
  },
});
