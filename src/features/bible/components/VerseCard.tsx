import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SPACING } from '../../../constants/theme';
import { Heart, X, Sun, BookMarked } from 'lucide-react-native';
import ExpandableText from '../../bible/ExpandableText';
import VerseActionCard from './VerseActionCard';
import VerseExplanationContent from './VerseExplanationContent';
import VerseRollPanel, {
  VerseRollPanelHandle,
} from './VerseRollPanel';
import VerseStrongsContent from './VerseStrongsContent';
import VerseBackgroundContent from './VerseBackgroundContent';
import VerseJournalContent from './VerseJournalContent';
import { BookPrologue } from '../../../services/bookProloguesApi';
import { bibleTTS } from '../../../utilits/bibleTTS';
import { useLanguage, isRtlLanguage, toArabicIndic } from '../../../component/language-translation/LanguageProvider';
import {
  StrongsWordData,
  StrongsEntry,
} from '../../../services/strongsService';

// ── Types ─────────────────────────────────────────────────────────────────────

type WordSpan = { start: number; length: number };

type VerseCardProps = {
  verseNum: string;
  verseNumber: number;
  text: string;
  isSelected: boolean;
  isFavorite: boolean;
  highlightColor?: string;
  isTargetHighlight: boolean;
  isActiveAudio: boolean;
  wordMap: WordSpan[] | null;
  highlightAnim: Animated.Value;
  fontSize: number;
  colors: any;
  styles: any;
  showActions?: boolean;
  isExplaining?: boolean;
  onPress: () => void;
  onRemoveHighlight: (verseNumber: number) => void;
  onExplain?: () => void;
  onStrongs?: () => void;
  onBackground?: () => void;
  onStudyTools?: () => void;
  onJournal?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onCloseStart?: () => void;
  explanationData?: {
    explanation: string;
    learnMore: string;
    ai?: any;
  } | null;
  onDailyVerse?: () => void;
  onCloseDailyVerse?: () => void;
  showDailyVerse?: boolean;
  dailyVerseData?: { reflection?: string; explanation?: string; learnMore?: string };
  journalPrompts?: any[];
  navigation?: any;
  currentBook?: string;
  currentChapter?: number;
  studyToolHighlight?: { label: string; color: string } | null;
  /** Word-level Strong's Concordance data for this verse */
  verseWords?: StrongsWordData[];
  /** Called when user taps a word that has Strong's data */
  onWordPress?: (word: StrongsWordData) => void;
  /** Inline Strong's panel data (rendered instead of a bottom sheet). */
  strongsData?: {
    word: StrongsWordData;
    entry: StrongsEntry | null;
    ai?: any;
    loading: boolean;
  } | null;
  onCloseStrongs?: () => void;
  /** Inline Background panel data (rendered instead of a modal). */
  backgroundData?: {
    background: string | null;
    prologue: BookPrologue | null;
    ai?: any;
    loading: boolean;
  } | null;
  onCloseBackground?: () => void;
  /** Inline Journal panel flag (rendered instead of navigating to a screen). */
  journalOpen?: boolean;
  /** Chapter journal prompts used by the inline Journal panel. */
  chapterPrompts?: Array<{ id: number; prompt: string }>;
  onCloseJournal?: () => void;
  onOpenFullJournal?: () => void;
};

export default function VerseCard({
  verseNum,
  verseNumber,
  text,
  isSelected,
  isFavorite,
  highlightColor,
  isTargetHighlight,
  isActiveAudio,
  wordMap,
  highlightAnim,
  fontSize,
  colors,
  styles,
  showActions,
  isExplaining,
  onPress,
  onRemoveHighlight,
  onExplain,
  onStrongs,
  onBackground,
  onStudyTools,
  onJournal,
  onDoubleTap,
  onLongPress,
  onCloseStart,
  explanationData,
  onDailyVerse,
  onCloseDailyVerse,
  showDailyVerse,
  dailyVerseData,
  journalPrompts = [],
  navigation,
  currentBook,
  currentChapter,
  studyToolHighlight,
  verseWords,
  onWordPress,
  strongsData,
  onCloseStrongs,
  backgroundData,
  onCloseBackground,
  journalOpen,
  chapterPrompts = [],
  onCloseJournal,
  onOpenFullJournal,
}: VerseCardProps) {
  const accent = colors.accent;
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;

  // ── Explanation roll animation ────────────────────────────────────────────
  const [explanationVisible, setExplanationVisible] = useState(!!explanationData?.explanation);
  const [expClosing, setExpClosing] = useState(false);
  const [expAnimReady, setExpAnimReady] = useState(false);
  const [expAnimDone, setExpAnimDone] = useState(false);
  const expAnim = useRef(new Animated.Value(0)).current;
  const prevExplanationData = useRef(explanationData);

  useEffect(() => {
    const prev = prevExplanationData.current;
    prevExplanationData.current = explanationData;
    const isOpen = !!explanationData?.explanation;
    const wasOpen = !!prev?.explanation;

    if (isOpen && !wasOpen) {
      expAnim.setValue(0);
      setExpClosing(false);
      setExpAnimReady(false);
      setExpAnimDone(false);
      setExplanationVisible(true);
    } else if (!isOpen && wasOpen && explanationVisible) {
      onCloseStart?.();
      setExpClosing(true);
      Animated.timing(expAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        setExpAnimDone(false);
        setExpClosing(false);
        setExplanationVisible(false);
      });
    }
  }, [explanationData, explanationVisible]);

  // ── Subscribe to bibleTTS directly ────────────────────────────────────────
  //
  // Every card subscribes so active-state changes are synchronous with TTS
  // engine state — no React-propagation lag during verse transitions.
  // Non-matching cards do a single boolean check and return (very cheap).
  //
  const [activeWordOffset, setActiveWordOffset] = useState<WordSpan | null>(
    null,
  );
  const wordMapRef = useRef<WordSpan[] | null>(null);
  wordMapRef.current = wordMap;

  const [isLocallyActive, setIsLocallyActive] = useState(false);
  const locallyActiveRef = useRef(false);

  useEffect(() => {
    const unsub = bibleTTS.subscribe(s => {
      const nowActive = s.currentVerseNum === verseNumber && s.isPlaying;

      if (nowActive !== locallyActiveRef.current) {
        locallyActiveRef.current = nowActive;
        setIsLocallyActive(nowActive);
      }

      if (!nowActive) {
        setActiveWordOffset(null);
        return;
      }
      if (s.wordIndex < 0) {
        setActiveWordOffset(null);
        return;
      }
      const map = wordMapRef.current;
      if (!map || s.wordIndex >= map.length) {
        setActiveWordOffset(null);
        return;
      }
      setActiveWordOffset(map[s.wordIndex]);
    });
    return unsub;
  }, [verseNumber]);

  // Combine prop-driven (async React) and subscription-driven (sync TTS)
  const isEffectivelyActive = useMemo(
    () => isActiveAudio || isLocallyActive,
    [isActiveAudio, isLocallyActive],
  );

  // ── Word highlight animation ─────────────────────────────────────────────
  const wordAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeWordOffset) {
      wordAnim.setValue(0);
      Animated.timing(wordAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false, // backgroundColor doesn't support native driver
      }).start();
    } else {
      wordAnim.setValue(0);
    }
  }, [activeWordOffset]);

  // ── Favorite heart fade/spring animation ──────────────────────────────
  const favAnim = useRef(new Animated.Value(isFavorite ? 1 : 0)).current;
  const prevFavRef = useRef(isFavorite);

  useEffect(() => {
    if (isFavorite && !prevFavRef.current) {
      favAnim.setValue(0);
      Animated.spring(favAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 10,
      }).start();
    } else if (!isFavorite && prevFavRef.current) {
      Animated.timing(favAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    prevFavRef.current = isFavorite;
  }, [isFavorite, favAnim]);

  // ── Split verse text into word-level components ──────────────────────────
  const renderVerseWords = () => {
    const lineHeight = Math.round(fontSize * 1.75);
    const textColor = (styles.verseText as any)?.color;
    const numStyle = [
      styles.verseNumber,
      {
        fontSize: fontSize * 0.72,
        fontWeight: '800' as const,
        color: isEffectivelyActive ? accent : isSelected ? accent : colors.accent,
        lineHeight,
      },
    ];

    const hasWordData = verseWords && verseWords.length > 0;
    const wordTokens = text.match(/\S+/g) || [];

    const renderTokens = () => {
      const elements: React.ReactNode[] = [];
      const verseNumElement = (
        <Text key="vnum" style={numStyle}>
          {toArabicIndic(isRtl, verseNum)}{' '}
        </Text>
      );
      elements.push(verseNumElement);

      if (!hasWordData) {
        wordTokens.forEach((token, i) => {
          elements.push(
            <Text key={i} style={{ fontSize, lineHeight, color: textColor }}>
              {token}{' '}
            </Text>,
          );
        });
      } else {
        wordTokens.forEach((token, i) => {
          const wordData = verseWords[i];
          if (!wordData?.hasData) {
            elements.push(
              <Text key={i} style={{ fontSize, lineHeight, color: textColor }}>
                {token}{' '}
              </Text>,
            );
          } else {
            elements.push(
              <Pressable
                key={i}
                onPress={() => onWordPress?.(wordData)}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[ssWord.strongsWord, { fontSize, lineHeight }]}>
                  {token}{' '}
                </Text>
              </Pressable>,
            );
          }
        });
      }

      if (isFavorite) {
        elements.push(
          <Animated.View
            key="favorite"
            style={[
              localStyles.inlineFavorite,
              {
                opacity: favAnim,
                transform: [
                  {
                    scale: favAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Heart size={14} color={colors.accent} fill={colors.accent} />
          </Animated.View>,
        );
      }

      return elements;
    };

    return (
      <View
        style={{
          flexDirection: isRtl ? 'row-reverse' as const : 'row' as const,
          flexWrap: 'wrap',
          alignItems: 'baseline',
          opacity: isEffectivelyActive ? 1 : 0.88,
        }}
      >
        {renderTokens()}
      </View>
    );
  };

  // ── Audio animations (all useNativeDriver: true) ──────────────────────────
  const audioPulse = useRef(new Animated.Value(0)).current;
  const audioScale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isEffectivelyActive) {
      Animated.spring(audioScale, {
        toValue: 1.012,
        useNativeDriver: true,
        speed: 40,
        bounciness: 3,
      }).start();

      Animated.timing(borderOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(audioPulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(audioPulse, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      Animated.parallel([
        Animated.spring(audioScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 0,
        }),
        Animated.timing(audioPulse, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => pulseLoopRef.current?.stop();
  }, [isEffectivelyActive]);

  // ── Search-jump border (JS-driver, mirrors highlightAnim via listener) ────
  const searchBorderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTargetHighlight) {
      searchBorderOpacity.setValue(0);
      return;
    }
    const id = highlightAnim.addListener(({ value }) => {
      searchBorderOpacity.setValue(value);
    });
    return () => highlightAnim.removeListener(id);
  }, [isTargetHighlight, highlightAnim]);

  // ── Selection spring animation ─────────────────────────────────────────
  const selectedAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const prevSelectedRef = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !prevSelectedRef.current) {
      // Became selected — spring in the strip
      selectedAnim.setValue(0);
      Animated.spring(selectedAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    } else if (!isSelected && prevSelectedRef.current) {
      // Became unselected — spring out
      Animated.spring(selectedAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 24,
        bounciness: 2,
      }).start();
    }
    prevSelectedRef.current = isSelected;
  }, [isSelected, selectedAnim]);

  // ── Double-tap detection ────────────────────────────────────────────
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Horizontal tap position — lets the action-card pointer follow the verse
  // instead of always sitting dead-center (important for multi-line verses).
  const [pointerOffset, setPointerOffset] = useState<number | null>(null);
  const prevSelectedRefForPointer = useRef(isSelected);

  // Clear a stale tap offset when the verse is deselected, so a later
  // programmatic re-selection (side-menu range, long-press highlight) starts
  // centered instead of pointing at an old tap spot.
  useEffect(() => {
    if (!isSelected && prevSelectedRefForPointer.current) {
      setPointerOffset(null);
    }
    prevSelectedRefForPointer.current = isSelected;
  }, [isSelected]);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (isEffectivelyActive) return;
      // locationX is relative to this card; the action card sits inside
      // verseContent which pads by SPACING.sm, so shift to its coordinate space.
      const offset = event.nativeEvent.locationX - SPACING.sm;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        onDoubleTap?.();
      } else {
        tapTimerRef.current = setTimeout(() => {
          tapTimerRef.current = null;
          onPress?.();
          setPointerOffset(offset);
        }, 350);
      }
    },
    [onPress, onDoubleTap, isEffectivelyActive],
  );

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(10);
    onLongPress?.();
  }, [onLongPress]);

  // ── Inline panel refs (Strong's / Background / Journal) ────────────────────
  const strongsPanelRef = useRef<VerseRollPanelHandle>(null);
  const backgroundPanelRef = useRef<VerseRollPanelHandle>(null);
  const journalPanelRef = useRef<VerseRollPanelHandle>(null);

  const handleHideStrongs = useCallback(() => {
    strongsPanelRef.current?.requestHide();
  }, []);

  const handleHideBackground = useCallback(() => {
    backgroundPanelRef.current?.requestHide();
  }, []);

  const handleHideJournal = useCallback(() => {
    journalPanelRef.current?.requestHide();
  }, []);

  return (      <Pressable
      style={({ pressed }) => [
        styles.verseTouchable,
        pressed && localStyles.versePressed,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      android_ripple={{ color: `${accent}1A` }}
    >
      {/* OUTER plain View — no animated props, never claimed by any driver */}
      <View style={[styles.verseContainer, isSelected && styles.verseSelected]}>
        {/* INNER Animated.View — ONLY native-driver transform, fully isolated */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ scale: audioScale }] },
          ]}
        >
          {isEffectivelyActive && (
            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.fillOverlay,
                {
                  backgroundColor: accent,
                  opacity: audioPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.06, 0.16],
                  }),
                },
              ]}
            />
          )}

          {isEffectivelyActive && (
            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.audioActiveBorder,
                { backgroundColor: accent, opacity: borderOpacity },
              ]}
            />
          )}
        </Animated.View>

        {/* Search-jump yellow border — JS-driver, isolated node */}
        {isTargetHighlight && (
          <Animated.View
            pointerEvents="none"
            style={[
              localStyles.searchJumpBorder,
              { opacity: searchBorderOpacity },
            ]}
          />
        )}

        {isTargetHighlight && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.targetHighlightOverlay,
              { opacity: searchBorderOpacity },
            ]}
          />
        )}

        {/* Selected strip — springs in when verse is selected */}
        <Animated.View
          pointerEvents="none"
          style={[
            localStyles.selectedStrip,
            {
              backgroundColor: isSelected ? accent : 'transparent',
              opacity: selectedAnim,
              transform: [
                {
                  scaleY: selectedAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        />

        {highlightColor && (
          <View
            pointerEvents="none"
            style={[styles.highlightStrip, { backgroundColor: highlightColor }]}
          />
        )}

        {highlightColor && (
          <View
            pointerEvents="none"
            style={[
              styles.highlightOverlay,
              { backgroundColor: highlightColor },
            ]}
          />
        )}

        {studyToolHighlight && (
          <View
            pointerEvents="none"
            style={[
              localStyles.studyToolStrip,
              { backgroundColor: studyToolHighlight.color },
            ]}
          />
        )}

        <View style={styles.verseContent}>
          {studyToolHighlight && (
            <View
              style={[
                localStyles.studyToolBadge,
                {
                  backgroundColor: `${studyToolHighlight.color}18`,
                  borderColor: `${studyToolHighlight.color}55`,
                },
              ]}
            >
              <BookMarked size={11} color={studyToolHighlight.color} />
              <Text
                style={[
                  localStyles.studyToolBadgeText,
                  { color: studyToolHighlight.color },
                ]}
              >
                {studyToolHighlight.label}
              </Text>
            </View>
          )}
          <View style={styles.verseTextContainer}>
            {renderVerseWords()}

            {/* Contextual action card — shown when exactly one verse is selected */}
            {showActions && (
              <VerseActionCard
                colors={colors}
                isRtl={isRtl}
                isExplaining={isExplaining}
                pointerOffset={pointerOffset}
                onExplain={onExplain}
                onStrongs={onStrongs}
                onBackground={onBackground}
                onStudyTools={onStudyTools}
                onJournal={onJournal}
              />
            )}

            {showDailyVerse && dailyVerseData && (
              <View style={localStyles.dvContainer}>
            <View style={[localStyles.dvHeader, isRtl && localStyles.dvHeaderRtl]}>
              <View style={[localStyles.dvHeaderLeft, isRtl && localStyles.dvHeaderLeftRtl]}>
                    <Sun size={14} color="#D97706" strokeWidth={2.5} />
                    <Text style={localStyles.dvHeaderTitle}>{bc?.devotional || 'Devotional'}</Text>
                  </View>
                  <TouchableOpacity onPress={onCloseDailyVerse} style={localStyles.dvCloseBtn}>
                    <X size={13} color="#92400E" />
                  </TouchableOpacity>
                </View>

                {dailyVerseData.reflection ? (
                  <>
                    <Text style={localStyles.dvSectionLabel}>{bc?.reflection || 'Reflection'}</Text>
                    <ExpandableText
                      text={dailyVerseData.reflection}
                      initialLines={5}
                      stepLines={10}
                      expandLabel="Read more"
                      closeLabel="Close"
                      containerStyle={localStyles.dvExpandableContainer}
                      textStyle={localStyles.dvReflectionText}
                    />
                  </>
                ) : null}

                {dailyVerseData.explanation && dailyVerseData.reflection ? (
                  <View style={localStyles.dvDivider} />
                ) : null}

                {dailyVerseData.explanation ? (
                  <>
                    <Text style={localStyles.dvSectionLabel}>{bc?.explanation || 'Explanation'}</Text>
                    <ExpandableText
                      text={dailyVerseData.explanation}
                      initialLines={4}
                      stepLines={10}
                      expandLabel={bc?.readMore || 'Read more'}
                      closeLabel={bc?.close || 'Close'}
                      containerStyle={localStyles.dvExpandableContainer}
                      textStyle={localStyles.dvBodyText}
                    />
                  </>
                ) : null}

                {dailyVerseData.learnMore && (dailyVerseData.reflection || dailyVerseData.explanation) ? (
                  <View style={localStyles.dvDivider} />
                ) : null}

                {dailyVerseData.learnMore ? (
                  <>
                    <Text style={localStyles.dvSectionLabel}>{bc?.learnMore || 'Learn More'}</Text>
                    <ExpandableText
                      text={dailyVerseData.learnMore}
                      initialLines={4}
                      stepLines={10}
                      expandLabel={bc?.readMore || 'Read more'}
                      closeLabel={bc?.close || 'Close'}
                      containerStyle={localStyles.dvExpandableContainer}
                      textStyle={localStyles.dvBodyText}
                    />
                  </>
                ) : null}
              </View>
            )}

            {explanationVisible && (
              <View style={{ position: 'relative' }}>
                {/* Hidden measurer — always present, tracks true content height.
                    Renders the SAME props as the display below (incl. onHide) so
                    the measured height matches the visible card exactly. */}
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                  onLayout={e => {
                    const h = e.nativeEvent.layout.height;
                    if (!expAnimReady) {
                      setExpAnimReady(true);
                      expAnim.setValue(0);
                      Animated.timing(expAnim, {
                        toValue: h,
                        duration: 1000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                      }).start(() => setExpAnimDone(true));
                    } else if (expAnimDone && !expClosing) {
                      expAnim.setValue(h);
                    }
                  }}
                >
                  <VerseExplanationContent
                    explanationData={explanationData}
                    colors={colors}
                    isRtl={isRtl}
                    bc={bc}
                    journalPrompts={journalPrompts}
                    navigation={navigation}
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                    verseNumber={verseNumber}
                  />
                </View>

                {/* Animated display */}
                <Animated.View
                  style={[
                    (!expAnimDone || expClosing) && {
                      height: expAnim,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <VerseExplanationContent
                    explanationData={explanationData}
                    colors={colors}
                    isRtl={isRtl}
                    bc={bc}
                    journalPrompts={journalPrompts}
                    navigation={navigation}
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                    verseNumber={verseNumber}
                  />
                </Animated.View>
              </View>
            )}

            {/* Inline Strong's Concordance — replaces the old bottom sheet */}
            {strongsData && (
              <VerseRollPanel
                ref={strongsPanelRef}
                active={!!strongsData}
                onClosed={onCloseStrongs}
              >
                <VerseStrongsContent
                  word={strongsData.word}
                  entry={strongsData.entry}
                  ai={strongsData.ai}
                  loading={strongsData.loading}
                  colors={colors}
                  isRtl={isRtl}
                  onHide={handleHideStrongs}
                />
              </VerseRollPanel>
            )}

            {/* Inline Verse Background — replaces the old modal */}
            {backgroundData && (
              <VerseRollPanel
                ref={backgroundPanelRef}
                active={!!backgroundData}
                onClosed={onCloseBackground}
              >
                <VerseBackgroundContent
                  bookName={currentBook || ''}
                  chapter={currentChapter || 0}
                  verseNumber={verseNumber}
                  background={backgroundData.background}
                  prologue={backgroundData.prologue}
                  ai={backgroundData.ai}
                  loading={backgroundData.loading}
                  colors={colors}
                  isRtl={isRtl}
                  bc={bc}
                  onHide={handleHideBackground}
                />
              </VerseRollPanel>
            )}

            {/* Inline Journal — replaces the old screen navigation */}
            {journalOpen && (
              <VerseRollPanel
                ref={journalPanelRef}
                active={journalOpen}
                onClosed={onCloseJournal}
              >
                <VerseJournalContent
                  verseNumber={verseNumber}
                  bookName={currentBook || ''}
                  chapter={currentChapter || 0}
                  prompts={
                    (Array.isArray(chapterPrompts) && chapterPrompts.length > 0
                      ? chapterPrompts
                      : journalPrompts) || []
                  }
                  colors={colors}
                  isRtl={isRtl}
                  onHide={handleHideJournal}
                  onOpenFullJournal={onOpenFullJournal}
                />
              </VerseRollPanel>
            )}
          </View>
        </View>

        {/* Remove highlight pill — bottom-left, tinted with the highlight colour */}
        {highlightColor && (
          <TouchableOpacity
            onPress={() => onRemoveHighlight(verseNumber)}
            activeOpacity={0.75}
            // hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
            style={[
              localStyles.removeHighlightPill,
              { backgroundColor: highlightColor },
            ]}
          >
            <X size={10} color="#fff" strokeWidth={2.8} />
            <Text style={localStyles.removeHighlightLabel}>{bc?.removeHighlight || 'Remove'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  versePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  selectedStrip: {
    position: 'absolute',
    left: -4,
    top: 2,
    bottom: 2,
    width: 5,
    borderRadius: 3,
  },
  studyToolStrip: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 3,
  },
  studyToolBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  studyToolBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  fillOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  audioActiveBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  searchJumpBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 193, 7, 0.85)',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  inlineFavorite: {
    marginLeft: 2,
    marginRight: 2,
    alignSelf: 'center',
  },
  removeHighlightPill: {
    position: 'absolute',
    right: 8,
    bottom: 6,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  removeHighlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  dvContainer: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dvHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  dvHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dvHeaderLeftRtl: {
    flexDirection: 'row-reverse',
  },
  dvHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  dvCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dvSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dvReflectionText: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  dvBodyText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  dvExpandableContainer: {
    marginTop: 0,
    marginBottom: 2,
  },
  dvDivider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 12,
  },
});

const wordStyles = StyleSheet.create({
  highlight: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  textDecorationStyle: 'solid',
    borderRadius: 3,
    paddingHorizontal: 1,
  },
});

const ssWord = StyleSheet.create({
  strongsWord: {
    fontWeight: 'bold',
    color: '#8B6914',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#B8860B',
  },
});
