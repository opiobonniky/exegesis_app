import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Heart, X, Lightbulb, BookText, Share2, Copy, Sun } from 'lucide-react-native';
import ExpandableText from '../../bible/ExpandableText';
import { bibleTTS } from '../../../utilits/bibleTTS';
import { route } from '../../../component/navigations/routes';
import { useLanguage, isRtlLanguage, toArabicIndic } from '../../../component/language-translation/LanguageProvider';
import { StrongsWordData } from '../../../services/strongsService';

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
  onShare?: () => void;
  onCopy?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onCloseExplanation?: () => void;
  onCloseStart?: () => void;
  explanationData?: { explanation: string; learnMore: string } | null;
  onDailyVerse?: () => void;
  onCloseDailyVerse?: () => void;
  showDailyVerse?: boolean;
  dailyVerseData?: { reflection?: string; explanation?: string; learnMore?: string };
  journalPrompts?: any[];
  navigation?: any;
  currentBook?: string;
  currentChapter?: number;
  /** Word-level Strong's Concordance data for this verse */
  verseWords?: StrongsWordData[];
  /** Called when user taps a word that has Strong's data */
  onWordPress?: (word: StrongsWordData) => void;
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
  onShare,
  onCopy,
  onDoubleTap,
  onLongPress,
  onCloseExplanation,
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
  verseWords,
  onWordPress,
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

  // ── Split verse text into word-level components ──────────────────────────
  const renderVerseWords = () => {
    const lineHeight = Math.round(fontSize * 1.75);
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

    // Split text into word tokens (preserve punctuation attached to words)
    const wordTokens = text.match(/\S+/g) || [];

    const renderWords = () => {
      if (!hasWordData) {
        // No Strong's data — render as plain text
        return (
          <Text style={{ fontSize, lineHeight }}>
            {wordTokens.map((token, i) => (
              <Text key={i}>{token}{' '}</Text>
            ))}
          </Text>
        );
      }

      // Has Strong's word data — render each word individually
      return (
        <Text style={{ fontSize, lineHeight, includeFontPadding: false }}>
          {wordTokens.map((token, i) => {
            const wordData = verseWords[i];
            if (!wordData?.hasData) {
              return <Text key={i}>{token}{' '}</Text>;
            }

            return (
              <Text
                key={i}
                onPress={() => {
                  wordTapHandledRef.current = true;
                  onWordPress?.(wordData);
                }}
                style={ssWord.strongsWord}
              >
                {token}{' '}
              </Text>
            );
          })}
        </Text>
      );
    };

    return (
      <Text
        style={[
          styles.verseText,
          {
            fontSize,
            lineHeight,
            opacity: isEffectivelyActive ? 1 : 0.88,
            writingDirection: isRtl ? 'rtl' as const : 'ltr' as const,
          },
        ]}
      >
        <Text style={numStyle}>{toArabicIndic(isRtl, verseNum)}{'  '}</Text>
        {renderWords()}
      </Text>
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

  // ── Word-tap flag: prevent verse selection when a Strong's word was tapped
  const wordTapHandledRef = useRef(false);

  // ── Double-tap detection ────────────────────────────────────────────
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const handlePress = useCallback(() => {
    if (wordTapHandledRef.current) {
      wordTapHandledRef.current = false;
      return;
    }
    if (isEffectivelyActive) return;
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      onDoubleTap?.();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        onPress?.();
      }, 350);
    }
  }, [onPress, onDoubleTap, isEffectivelyActive]);

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(10);
    onLongPress?.();
  }, [onLongPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.verseTouchable,
        pressed && styles.versePressed,
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

        <View style={styles.verseContent}>
          <View style={styles.verseTextContainer}>
            {renderVerseWords()}

            {/* Action row: Explain, Daily Verse, Copy, Share — only when exactly one verse is selected */}
            {showActions && (
              <View style={[localStyles.actionRow, isRtl && localStyles.actionRowRtl]}>
                {onExplain && (
                  <TouchableOpacity
                    onPress={onExplain}
                    disabled={isExplaining}
                    activeOpacity={0.7}
                    style={localStyles.actionRowBtn}
                  >
                    {isExplaining ? (
                      <ActivityIndicator size={11} color={colors.primary} />
                    ) : (
                      <Lightbulb size={11} color={colors.primary} strokeWidth={2} />
                    )}
                    <Text
                      style={[localStyles.actionRowText, { color: colors.primary }]}
                    >
                      {'Explain Verse'}
                    </Text>
                  </TouchableOpacity>
                )}
                {onCopy && (
                  <TouchableOpacity
                    onPress={onCopy}
                    activeOpacity={0.7}
                    style={localStyles.actionRowBtn}
                  >
                    <Copy size={11} color={colors.primary} strokeWidth={2} />
                    <Text
                      style={[localStyles.actionRowText, { color: colors.primary }]}
                    >
                      {bc?.copy || 'Copy'}
                    </Text>
                  </TouchableOpacity>
                )}
                {onShare && (
                  <TouchableOpacity
                    onPress={onShare}
                    activeOpacity={0.7}
                    style={localStyles.actionRowBtn}
                  >
                    <Share2 size={11} color={colors.primary} strokeWidth={2} />
                    <Text
                      style={[localStyles.actionRowText, { color: colors.primary }]}
                    >
                      {bc?.share || 'Share'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
                {/* Hidden measurer — always present, tracks true content height */}

                  <View
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0, pointerEvents: 'none' }}
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
                    <View style={[localStyles.expContainer, { backgroundColor: `${colors.primary}08` }]}>
                      <View style={[localStyles.expHeaderRow, isRtl && localStyles.expHeaderRowRtl]}>
                        <View style={[localStyles.expHeaderLeft, isRtl && localStyles.expHeaderLeftRtl]}>
                          <Lightbulb size={14} color={colors.primary} strokeWidth={2.5} />
                          <Text style={[localStyles.expHeaderTitle, { color: colors.primary }]}>
                            {bc?.explanation || 'Explanation'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[localStyles.expBodyText, { color: colors.text }]}>
                        {explanationData?.explanation}
                      </Text>

                      {explanationData?.learnMore && (
                        <>
                          <View style={[localStyles.expDivider, { backgroundColor: `${colors.primary}20` }]} />
                          <Text style={[localStyles.expLearnMoreTitle, { color: colors.primary }]}>
                            {bc?.learnMore || 'Learn More'}
                          </Text>
                          <ExpandableText
                            text={explanationData.learnMore}
                            initialLines={4}
                            stepLines={10}
                            expandLabel={bc?.readMore || 'Read more'}
                            closeLabel={bc?.close || 'Close'}
                            containerStyle={localStyles.exExpandableContainer}
                            textStyle={localStyles.expBodyText}
                          />
                        </>
                      )}

                      {journalPrompts.length > 0 && (
                        <View style={[localStyles.journalPromptsContainer, { borderTopColor: `${colors.primary}20` }]}>
                          <View style={localStyles.promptsHeader}>
                            <Text style={[localStyles.promptsTitle, { color: colors.primary }]}>
                              {bc?.journalPrompts || 'Journal Prompts'}
                            </Text>
                            {currentBook && currentChapter && (
                              <TouchableOpacity
                                onPress={() => {
                                  navigation?.navigate(route.journalEntry, {
                                    bookName: currentBook,
                                    chapter: currentChapter,
                                    verseStart: verseNumber,
                                    verseEnd: verseNumber,
                                  });
                                }}
                                style={[localStyles.addPromptBtn, { backgroundColor: colors.primary }]}
                              >
                                <BookText size={12} color="#FFFFFF" />
                              </TouchableOpacity>
                            )}
                          </View>
                          {journalPrompts.map((prompt, idx) => (
                            <TouchableOpacity
                              key={prompt.id || idx}
                              style={[localStyles.promptItem, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
                              onPress={() => {
                                if (navigation) {
                                  navigation.navigate(route.journalEntry, {
                                    bookName: currentBook,
                                    chapter: currentChapter,
                                    verseStart: verseNumber,
                                    verseEnd: verseNumber,
                                    promptText: prompt.prompt,
                                  });
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[localStyles.promptText, { color: colors.text }]}>
                                {prompt.prompt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {onCloseExplanation && (
                        <TouchableOpacity
                          onPress={() => {
                            setExpClosing(true);
                            onCloseStart?.();
                            Animated.timing(expAnim, {
                              toValue: 0,
                              duration: 1000,
                              easing: Easing.linear,
                              useNativeDriver: false,
                            }).start(() => {
                              setExpAnimDone(false);
                              setExplanationVisible(false);
                              setExpClosing(false);
                              onCloseExplanation();
                            });
                          }}
                          style={[localStyles.hideExpBtn, { borderColor: `${colors.primary}30` }]}
                        >
                          <Text style={[localStyles.hideExpBtnText, { color: colors.primary }]}>
                            {bc?.hideExplanation || 'Hide Explanation'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                {/* Animated display */}
                <Animated.View
                  style={[
                    localStyles.expContainer,
                    { backgroundColor: `${colors.primary}08` },
                    (!expAnimDone || expClosing) && { height: expAnim, overflow: 'hidden' },
                  ]}
                >
                  <View style={[localStyles.expHeaderRow, isRtl && localStyles.expHeaderRowRtl]}>
                    <View style={[localStyles.expHeaderLeft, isRtl && localStyles.expHeaderLeftRtl]}>
                      <Lightbulb size={14} color={colors.primary} strokeWidth={2.5} />
                      <Text style={[localStyles.expHeaderTitle, { color: colors.primary }]}>
                        {bc?.explanation || 'Explanation'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[localStyles.expBodyText, { color: colors.text }]}>
                    {explanationData?.explanation}
                  </Text>

                  {explanationData?.learnMore && (
                    <>
                      <View style={[localStyles.expDivider, { backgroundColor: `${colors.primary}20` }]} />
                      <Text style={[localStyles.expLearnMoreTitle, { color: colors.primary }]}>
                        {bc?.learnMore || 'Learn More'}
                      </Text>
                      <ExpandableText
                        text={explanationData.learnMore}
                        initialLines={4}
                        stepLines={10}
                        expandLabel={bc?.readMore || 'Read more'}
                        closeLabel={bc?.close || 'Close'}
                        containerStyle={localStyles.exExpandableContainer}
                        textStyle={localStyles.expBodyText}
                      />
                    </>
                  )}

                  {journalPrompts.length > 0 && (
                    <View style={[localStyles.journalPromptsContainer, { borderTopColor: `${colors.primary}20` }]}>
                      <View style={localStyles.promptsHeader}>
                        <Text style={[localStyles.promptsTitle, { color: colors.primary }]}>
                          {bc?.journalPrompts || 'Journal Prompts'}
                        </Text>
                        {currentBook && currentChapter && (
                          <TouchableOpacity
                            onPress={() => {
                              navigation?.navigate(route.journalEntry, {
                                bookName: currentBook,
                                chapter: currentChapter,
                                verseStart: verseNumber,
                                verseEnd: verseNumber,
                              });
                            }}
                            style={[localStyles.addPromptBtn, { backgroundColor: colors.primary }]}
                          >
                            <BookText size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {journalPrompts.map((prompt, idx) => (
                        <TouchableOpacity
                          key={prompt.id || idx}
                          style={[localStyles.promptItem, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
                          onPress={() => {
                            if (navigation) {
                              navigation.navigate(route.journalEntry, {
                                bookName: currentBook,
                                chapter: currentChapter,
                                verseStart: verseNumber,
                                verseEnd: verseNumber,
                                promptText: prompt.prompt,
                              });
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[localStyles.promptText, { color: colors.text }]}>
                            {prompt.prompt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {onCloseExplanation && (
                    <TouchableOpacity
                      onPress={() => {
                        setExpClosing(true);
                        onCloseStart?.();
                        Animated.timing(expAnim, {
                          toValue: 0,
                          duration: 1000,
                          easing: Easing.linear,
                          useNativeDriver: false,
                        }).start(() => {
                          setExpAnimDone(false);
                          setExplanationVisible(false);
                          setExpClosing(false);
                          onCloseExplanation();
                        });
                      }}
                      style={[localStyles.hideExpBtn, { borderColor: `${colors.primary}30` }]}
                    >
                      <Text style={[localStyles.hideExpBtnText, { color: colors.primary }]}>
                        {bc?.hideExplanation || 'Hide Explanation'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>
            )}
          </View>
          <View style={localStyles.rightColumn}>
            {isFavorite && (
              <View style={styles.verseRightIcons}>
                <Heart size={20} color={colors.accent} fill={colors.accent} />
              </View>
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
  expContainer: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expHeaderRowRtl: {
    flexDirection: 'row-reverse',
  },
  expHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expHeaderLeftRtl: {
    flexDirection: 'row-reverse',
  },
  expHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hideExpBtn: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  hideExpBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expBodyText: {
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  expDivider: {
    height: 1,
    marginVertical: 14,
  },
  expLearnMoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exExpandableContainer: {
    marginTop: 0,
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  actionRowRtl: {
    flexDirection: 'row-reverse',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  actionRowText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
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
  journalPromptsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    // borderTopColor is applied inline (colors comes from props, not module scope)
  },
  promptsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addPromptBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 18,
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
