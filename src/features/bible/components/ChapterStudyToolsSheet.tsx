import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRightLeft,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Hash,
  HeartHandshake,
  Info,
  Repeat2,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react-native';
import { AppContext } from '../../../common/AppContext';
import { getColors, SPACING } from '../../../constants/theme';
import {
  ChapterStudyToolItem,
  getChapterStudyTools,
  StudyToolsResponse,
  TOOL_TYPE_LABELS,
  TOOL_TYPE_ORDER,
  ToolType,
} from '../services/studyToolsApi';
import { getBookPrologue, BookPrologue } from '../../../services/bookProloguesApi';
import { getVerseWords, StrongsWordData } from '../../../services/strongsService';

const GUIDE_SEEN_KEY = 'study_tools_guide_seen';

const TOOL_ICONS: Record<ToolType, React.FC<any>> = {
  COMMAND: Sparkles,
  PROMISE: HeartHandshake,
  WARNING: AlertTriangle,
  REPEATED_WORD: Repeat2,
  TRANSITION: ArrowRightLeft,
  CONTRAST: ArrowLeftRight,
};

const TOOL_COLORS: Record<ToolType, string> = {
  COMMAND: '#6366f1',
  PROMISE: '#22c55e',
  WARNING: '#ef4444',
  REPEATED_WORD: '#f59e0b',
  TRANSITION: '#06b6d4',
  CONTRAST: '#ec4899',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  selectedVerses?: number[];
  onScrollToVerse?: (verse: number) => void;
  onOpenInLab?: (bookName: string, chapter: number, verseRefs: Array<{ verse: number; excerpt: string }>) => void;
  onOpenBookContext?: (bookName: string) => void;
  onShowInReader?: (label: string, color: string, verseRefs: Array<{ verse: number; excerpt: string }>) => void;
}

export default function ChapterStudyToolsSheet({
  visible,
  onClose,
  bookName,
  chapter,
  selectedVerses = [],
  onScrollToVerse,
  onOpenInLab,
  onOpenBookContext,
  onShowInReader,
}: Props) {
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = createStyles(COLORS);

  const [tools, setTools] = useState<StudyToolsResponse>({});
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showGuide, setShowGuide] = useState(false);

  const [prologue, setPrologue] = useState<BookPrologue | null>(null);
  const [prologueLoading, setPrologueLoading] = useState(false);
  const [strongsWords, setStrongsWords] = useState<StrongsWordData[]>([]);
  const [strongsLoading, setStrongsLoading] = useState(false);
  const [expandedPrologue, setExpandedPrologue] = useState(false);
  const [expandedStrongs, setExpandedStrongs] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchTools = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setPrologueLoading(true);
    setStrongsLoading(true);
    try {
      const data = await getChapterStudyTools(bookName, chapter);
      setTools(data);

      // Auto-expand first type that has items
      for (const type of TOOL_TYPE_ORDER) {
        if ((data[type]?.length ?? 0) > 0) {
          setExpandedTypes(new Set([type]));
          break;
        }
      }

      // Check guide seen
      const seen = await AsyncStorage.getItem(GUIDE_SEEN_KEY);
      if (!seen) {
        setShowGuide(true);
      }
    } catch {
      setTools({});
    } finally {
      setLoading(false);
    }

    // Fetch book prologue (non-blocking)
    try {
      const p = await getBookPrologue(bookName);
      setPrologue(p);
    } catch {
      setPrologue(null);
    } finally {
      setPrologueLoading(false);
    }

    // Fetch Strong's words for the chapter (non-blocking)
    try {
      const res = await getVerseWords(bookName, chapter);
      if (res.returnCode === 200 && res.returnData) {
        setStrongsWords(res.returnData);
      }
    } catch {
      setStrongsWords([]);
    } finally {
      setStrongsLoading(false);
    }
  }, [visible, bookName, chapter]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 9,
        tension: 100,
        useNativeDriver: true,
      }).start();
      fetchTools();
    } else {
      slideAnim.setValue(0);
      setShowGuide(false);
    }
  }, [visible, fetchTools, slideAnim]);

  const dismissGuide = async () => {
    setShowGuide(false);
    await AsyncStorage.setItem(GUIDE_SEEN_KEY, 'true');
  };

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const selectedVerseSet = useMemo(
    () => new Set(selectedVerses.filter(verse => Number.isFinite(verse))),
    [selectedVerses],
  );

  const getVisibleVerseRefs = useCallback(
    (item: ChapterStudyToolItem) => {
      if (selectedVerseSet.size === 0) return item.verseRefs;
      return item.verseRefs.filter(ref => selectedVerseSet.has(ref.verse));
    },
    [selectedVerseSet],
  );

  const handleVersePress = (verse: number) => {
    onClose();
    setTimeout(() => onScrollToVerse?.(verse), 400);
  };

  const handleLabPress = (item: ChapterStudyToolItem) => {
    const verseRefs = getVisibleVerseRefs(item);
    onClose();
    setTimeout(() => onOpenInLab?.(bookName, chapter, verseRefs), 400);
  };

  const visibleTools = useMemo(() => {
    if (selectedVerseSet.size === 0) return tools;

    return TOOL_TYPE_ORDER.reduce((acc, type) => {
      const items = tools[type]?.filter(item =>
        item.verseRefs?.some(ref => selectedVerseSet.has(ref.verse)),
      );
      if (items?.length) acc[type] = items;
      return acc;
    }, {} as StudyToolsResponse);
  }, [selectedVerseSet, tools]);

  const selectedVerseLabel = useMemo(() => {
    if (selectedVerses.length === 0) return null;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    if (sorted.length === 1) return `:${sorted[0]}`;
    return `:${sorted[0]}-${sorted[sorted.length - 1]}`;
  }, [selectedVerses]);

  const totalItems = Object.values(visibleTools).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
  const hasTools = totalItems > 0;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [600, 0],
              }) }],
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <BookMarked size={18} color={COLORS.text} />
              <Text style={styles.headerTitle}>
                {bookName} {chapter}{selectedVerseLabel}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading study tools...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Info button */}
              <TouchableOpacity style={styles.infoRow} onPress={() => setShowGuide(true)}>
                <Info size={14} color={COLORS.primary} />
                <Text style={styles.infoText}>How do I study this?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextRow}
                onPress={() => {
                  onClose();
                  setTimeout(() => onOpenBookContext?.(bookName), 350);
                }}
                activeOpacity={0.75}
              >
                <BookMarked size={14} color={COLORS.primary} />
                <Text style={styles.contextText}>Open Book Context</Text>
              </TouchableOpacity>

              {/* Overview strip */}
              <View style={styles.overview}>
                {TOOL_TYPE_ORDER.map(type => {
                  const count = visibleTools[type]?.length ?? 0;
                  if (count === 0) return null;
                  return (
                    <View key={type} style={[styles.overviewPill, { backgroundColor: `${TOOL_COLORS[type]}18` }]}>
                      <Text style={[styles.overviewPillText, { color: TOOL_COLORS[type] }]}>
                        {count} {TOOL_TYPE_LABELS[type]}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* ── Book Overview (Prologue) ── */}
              {prologue && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setExpandedPrologue(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: '#6366f118' }]}>
                      <BookOpen size={16} color="#6366f1" />
                    </View>
                    <Text style={styles.sectionTitle}>Book Overview</Text>
                    {expandedPrologue ? (
                      <ChevronUp size={16} color={COLORS.muted} />
                    ) : (
                      <ChevronDown size={16} color={COLORS.muted} />
                    )}
                  </TouchableOpacity>

                  {expandedPrologue && (
                    <View style={styles.itemsWrap}>
                      {prologue.summary && (
                        <Text style={styles.prologueText}>{prologue.summary}</Text>
                      )}

                      <View style={styles.prologueMeta}>
                        {prologue.author && (
                          <View style={styles.prologueMetaRow}>
                            <Text style={styles.prologueMetaLabel}>Author</Text>
                            <Text style={styles.prologueMetaValue}>{prologue.author}</Text>
                          </View>
                        )}
                        {prologue.audience && (
                          <View style={styles.prologueMetaRow}>
                            <Text style={styles.prologueMetaLabel}>Audience</Text>
                            <Text style={styles.prologueMetaValue}>{prologue.audience}</Text>
                          </View>
                        )}
                        {prologue.dateWritten && (
                          <View style={styles.prologueMetaRow}>
                            <Text style={styles.prologueMetaLabel}>Date Written</Text>
                            <Text style={styles.prologueMetaValue}>{prologue.dateWritten}</Text>
                          </View>
                        )}
                        {prologue.purpose && (
                          <View style={styles.prologueMetaRow}>
                            <Text style={styles.prologueMetaLabel}>Purpose</Text>
                            <Text style={styles.prologueMetaValue}>{prologue.purpose}</Text>
                          </View>
                        )}
                        {prologue.keyTheme && (
                          <View style={styles.prologueMetaRow}>
                            <Text style={styles.prologueMetaLabel}>Key Theme</Text>
                            <Text style={styles.prologueMetaValue}>{prologue.keyTheme}</Text>
                          </View>
                        )}
                      </View>

                      {prologue.mainThemes && prologue.mainThemes.length > 0 && (
                        <>
                          <Text style={styles.prologueSubtitle}>Main Themes</Text>
                          <View style={styles.themeRow}>
                            {prologue.mainThemes.map((theme, i) => (
                              <View key={i} style={[styles.themePill, { backgroundColor: '#6366f118', borderColor: '#6366f130' }]}>
                                <Text style={[styles.themePillText, { color: '#6366f1' }]}>{theme}</Text>
                              </View>
                            ))}
                          </View>
                        </>
                      )}

                      {prologue.christConnection && (
                        <View style={styles.christSection}>
                          <Text style={styles.prologueSubtitle}>Connection to Christ</Text>
                          <Text style={styles.prologueText}>{prologue.christConnection}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* ── Key Words (Strong's) ── */}
              {strongsWords.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setExpandedStrongs(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b18' }]}>
                      <Hash size={16} color="#f59e0b" />
                    </View>
                    <Text style={styles.sectionTitle}>Key Words (Strong&apos;s)</Text>
                    <Text style={styles.sectionCount}>{strongsWords.length}</Text>
                    {expandedStrongs ? (
                      <ChevronUp size={16} color={COLORS.muted} />
                    ) : (
                      <ChevronDown size={16} color={COLORS.muted} />
                    )}
                  </TouchableOpacity>

                  {expandedStrongs && (
                    <View style={styles.itemsWrap}>
                      {Object.entries(
                        strongsWords.reduce((acc, w) => {
                          if (!w.strongsId) return acc;
                          if (!acc[w.strongsId]) acc[w.strongsId] = { ...w, verses: new Set<number>() };
                          if (w.verseNumber) acc[w.strongsId].verses.add(w.verseNumber);
                          return acc;
                        }, {} as Record<string, StrongsWordData & { verses: Set<number> }>)
                      ).map(([strongsId, w]) => (
                        <View key={strongsId} style={styles.strongsItem}>
                          <View style={styles.strongsHeader}>
                            <Text style={styles.strongsWord}>{w.surfaceText}</Text>
                            {w.strongs?.transliteration && (
                              <Text style={styles.strongsTranslit}>{w.strongs.transliteration}</Text>
                            )}
                            <Text style={styles.strongsId}>{strongsId}</Text>
                          </View>
                          {w.strongs?.shortDefinition && (
                            <Text style={styles.strongsDef} numberOfLines={2}>{w.strongs.shortDefinition}</Text>
                          )}
                          {w.verses.size > 0 && (
                            <View style={styles.strongsVerseRow}>
                              {Array.from(w.verses).sort((a, b) => a - b).map(v => (
                                <TouchableOpacity
                                  key={v}
                                  style={[styles.strongsVerseChip, { borderColor: '#f59e0b30' }]}
                                  onPress={() => handleVersePress(v)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.strongsVerseNum, { color: '#f59e0b' }]}>v{v}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {!hasTools && !prologue && strongsWords.length === 0 && (
                <View style={styles.emptyState}>
                  <BookMarked size={40} color={COLORS.muted} />
                  <Text style={styles.emptyTitle}>No Study Tools Yet</Text>
                  <Text style={styles.emptyText}>
                    Study tools haven't been added for this chapter yet.
                    {selectedVerses.length ? ' Try a different verse selection.' : ''}
                  </Text>
                </View>
              )}

              {/* Tool type sections */}
              {TOOL_TYPE_ORDER.map(type => {
                const items = visibleTools[type];
                if (!items?.length) return null;
                const isExpanded = expandedTypes.has(type);
                const IconComp = TOOL_ICONS[type];
                const color = TOOL_COLORS[type];

                return (
                  <View key={type} style={styles.section}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleType(type)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.sectionIcon, { backgroundColor: `${color}18` }]}>
                        <IconComp size={16} color={color} />
                      </View>
                      <Text style={styles.sectionTitle}>
                        {TOOL_TYPE_LABELS[type]}
                      </Text>
                      <Text style={styles.sectionCount}>{items.length}</Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color={COLORS.muted} />
                      ) : (
                        <ChevronDown size={16} color={COLORS.muted} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.itemsWrap}>
                        {items.map((item, idx) => {
                          const verseRefs = getVisibleVerseRefs(item);
                          return (
                          <View key={item.id || idx} style={styles.item}>
                            <View style={styles.itemHeader}>
                              <Text style={styles.itemLabel}>{item.label}</Text>
                            </View>
                            {item.description && (
                              <Text style={styles.itemDesc}>{item.description}</Text>
                            )}

                            {/* Verse refs */}
                            <View style={styles.verseRefsWrap}>
                              {verseRefs.map((ref, rIdx) => (
                                <TouchableOpacity
                                  key={rIdx}
                                  style={[styles.verseChip, { borderColor: `${color}30` }]}
                                  onPress={() => handleVersePress(ref.verse)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.verseNum, { color }]}>v{ref.verse}</Text>
                                  <Text style={styles.verseExcerpt} numberOfLines={1}>
                                    {ref.excerpt}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Actions */}
                            <View style={styles.itemActions}>
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: `${color}12` }]}
                                onPress={() => {
                                  const verseRefs = getVisibleVerseRefs(item);
                                  onClose();
                                  setTimeout(() => onShowInReader?.(TOOL_TYPE_LABELS[type], color, verseRefs), 350);
                                }}
                                activeOpacity={0.7}
                              >
                                <BookMarked size={14} color={color} />
                                <Text style={[styles.actionText, { color }]}>Show in Reader</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: `${COLOR_PRIMARY_RAW}12` }]}
                                onPress={() => handleLabPress(item)}
                                activeOpacity={0.7}
                              >
                <Sparkles size={14} color={COLORS.primary} />
                <Text style={styles.actionText}>Open in Exegesis Lab</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* "How Do I Study This?" overlay */}
          {showGuide && (
            <View style={styles.guideOverlay}>
              <View style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <BookMarked size={22} color={COLORS.text} />
                  <Text style={styles.guideTitle}>How Do I Study This Passage?</Text>
                </View>

                <ScrollView style={styles.guideScroll} showsVerticalScrollIndicator={false}>
                  {[
                    {
                      icon: Repeat2,
                      color: TOOL_COLORS.COMMAND,
                      title: '1. Observe',
                      text: 'What words repeat? What commands, promises, warnings, transitions, or contrasts are marked in the text?',
                    },
                    {
                      icon: Info,
                      color: TOOL_COLORS.PROMISE,
                      title: '2. Ask',
                      text: 'Who is speaking? Who is listening? What questions does this passage raise?',
                    },
                    {
                      icon: BookMarked,
                      color: TOOL_COLORS.WARNING,
                      title: '3. Understand',
                      text: 'Open Book Context to learn the author, audience, purpose, themes, and Christ-centered connection.',
                    },
                    {
                      icon: Sparkles,
                      color: TOOL_COLORS.REPEATED_WORD,
                      title: '4. Search',
                      text: 'Use the Lab or Search to compare passages, study Strong\'s words, and trace related themes.',
                    },
                    {
                      icon: HeartHandshake,
                      color: TOOL_COLORS.TRANSITION,
                      title: '5. Apply',
                      text: 'Ask what you should believe, obey, confess, pray, or save into your Legacy Ledger.',
                    },
                  ].map((item, idx) => {
                    const IconC = item.icon;
                    return (
                      <View key={idx} style={styles.guideStep}>
                        <View style={[styles.guideIcon, { backgroundColor: `${item.color}18` }]}>
                          <IconC size={16} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.guideStepTitle}>{item.title}</Text>
                          <Text style={styles.guideStepText}>{item.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity style={styles.guideGotIt} onPress={dismissGuide} activeOpacity={0.8}>
                  <Text style={styles.guideGotItText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const COLOR_PRIMARY_RAW = '#6366f1';

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      maxHeight: '85%',
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    handleRow: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 4,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: COLORS.border,
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
      gap: 8,
    },
    headerTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: '800',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
    },
    loadingWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    loadingText: {
      color: COLORS.muted,
      fontSize: 13,
      fontWeight: '600',
    },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingBottom: 32 },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 6,
    },
  infoText: {
      color: COLORS.primary,
      fontSize: 12,
    fontWeight: '700',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.10)',
    marginBottom: SPACING.sm,
  },
  contextText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
    overview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    overviewPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    overviewPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 50,
      gap: 8,
    },
    emptyTitle: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyText: {
      color: COLORS.muted,
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    section: {
      marginBottom: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 11,
      gap: 10,
    },
    sectionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '800',
    },
    sectionCount: {
      color: COLORS.muted,
      fontSize: 13,
      fontWeight: '700',
      marginRight: 4,
    },
    itemsWrap: {
      paddingHorizontal: 18,
      paddingBottom: 8,
      gap: 8,
    },
    item: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    itemLabel: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 19,
    },
    itemDesc: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },
    verseRefsWrap: {
      marginTop: 10,
      gap: 6,
    },
    verseChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
    },
    verseNum: {
      fontSize: 12,
      fontWeight: '900',
    },
    verseExcerpt: {
      flex: 1,
      color: COLORS.textSecondary,
      fontSize: 12,
    },
    itemActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    actionText: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    guideOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    guideCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    guideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    guideTitle: {
      color: COLORS.text,
      fontSize: 18,
      fontWeight: '900',
    },
    guideScroll: { flexGrow: 0 },
    guideStep: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    guideIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    guideStepTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    guideStepText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    guideGotIt: {
      backgroundColor: COLORS.primary,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 8,
    },
    guideGotItText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },

    // ── Prologue ──
    prologueText: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    prologueMeta: {
      marginTop: 12,
      gap: 6,
    },
    prologueMetaRow: {
      flexDirection: 'row',
      gap: 6,
    },
    prologueMetaLabel: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: '700',
      width: 90,
    },
    prologueMetaValue: {
      color: COLORS.text,
      fontSize: 12,
      flex: 1,
    },
    prologueSubtitle: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },
    themeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    themePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    themePillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    christSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },

    // ── Strong's Words ──
    strongsItem: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 8,
    },
    strongsHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 4,
    },
    strongsWord: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '800',
    },
    strongsTranslit: {
      color: COLORS.muted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    strongsId: {
      color: '#f59e0b',
      fontSize: 11,
      fontWeight: '700',
      backgroundColor: 'rgba(245,158,11,0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    strongsDef: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 6,
    },
    strongsVerseRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    strongsVerseChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    strongsVerseNum: {
      fontSize: 11,
      fontWeight: '800',
    },
  });
