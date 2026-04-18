import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Pause, Play, Square, Rewind, FastForward } from 'lucide-react-native';
import { bibleTTS } from '../../utilits/bibleTTS';

interface BibleAudioPlayerProps {
  verses: Array<{ num: number; text: string }>;
  book: string;
  chapter: number;
  onClose: () => void;
  colors: any;
  next?: () => void;
  previous?: () => void;
}

export default function BibleAudioPlayer({
  verses,
  book,
  chapter,
  onClose,
  colors,
  next,
  previous,
}: BibleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(0.45);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const unsubscribe = bibleTTS.subscribe(state => {
      setIsPlaying(state.isPlaying);
      setIsPaused(state.isPaused);
    });

    return () => {
      unsubscribe();
      bibleTTS.stop();
    };
  }, []);

  useEffect(() => {
    if (verses.length > 0) {
      bibleTTS.stop().then(() => {
        bibleTTS.speakVerses(verses, book, chapter);
      });
    }
  }, [verses]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isPlaying]);

  const handlePlayPause = async () => {
    if (isPlaying && !isPaused) {
      await bibleTTS.pause();
    } else if (isPaused) {
      await bibleTTS.resume();
    } else {
      console.log('Starting TTS for verses:', verses);

      if (!isPlaying) {
        await bibleTTS.speakVerses(verses, book, chapter);
      }
    }
  };

  const handleStop = async () => {
    await bibleTTS.stop();
    onClose();
  };

  const handleSpeedChange = async (newRate: number) => {
    setRate(newRate);
    await bibleTTS.setRate(newRate);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Now Playing</Text>
            <Text style={styles.subtitle}>
              {book} {chapter} • {verses.length} verses
            </Text>
          </View>

          <TouchableOpacity onPress={handleStop} style={styles.closeBtn}>
            <Square size={18} color={colors.error} fill={colors.error} />
          </TouchableOpacity>
        </View>

        {/* VISUALIZER */}
        <Animated.View
          style={[styles.visualizer, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.waveContainer}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.wave,
                  {
                    height: isPlaying ? 28 + i * 6 : 16,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* CONTROLS */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => previous && previous()}
          >
            <Rewind size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause}>
            {isPlaying && !isPaused ? (
              <Pause size={26} color={colors.white} />
            ) : (
              <Play size={26} color={colors.white} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => next && next()}
          >
            <FastForward size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* SPEED */}
        <View style={styles.speedControl}>
          <Text style={styles.speedLabel}>Playback Speed</Text>

          <View style={styles.speedGrid}>
            {[0.25, 0.45, 0.65, 0.85, 1.0].map(speed => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedBtn,
                  rate === speed && styles.speedBtnActive,
                ]}
                onPress={() => handleSpeedChange(speed)}
              >
                <Text
                  style={[
                    styles.speedBtnText,
                    rate === speed && styles.speedBtnTextActive,
                  ]}
                >
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STATUS */}
        <View style={styles.statusBar}>
          <View
            style={[styles.statusDot, isPlaying && styles.statusDotActive]}
          />
          <Text style={styles.statusText}>
            {isPlaying ? (isPaused ? 'Paused' : 'Playing') : 'Ready'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    container: {
      width: '85%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: colors.border ?? 'transparent',
      padding: 16,

      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },

    subtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },

    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBackground ?? colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border ?? 'transparent',
    },

    visualizer: {
      alignItems: 'center',
      marginVertical: 18,
    },

    waveContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 64,
    },

    wave: {
      width: 6,
      borderRadius: 6,
      opacity: 0.85,
    },

    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
      marginBottom: 18,
    },

    controlBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.cardBackground ?? colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border ?? 'transparent',
    },

    playBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },

    speedControl: {
      marginBottom: 16,
    },

    speedLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 8,
    },

    speedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },

    speedBtn: {
      minWidth: 56,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.cardBackground ?? colors.surface,
      borderWidth: 1,
      borderColor: colors.border ?? 'transparent',
      alignItems: 'center',
    },

    speedBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    speedBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },

    speedBtnTextActive: {
      color: colors.white,
    },

    statusBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.muted,
    },

    statusDotActive: {
      backgroundColor: colors.success,
    },

    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
  });
