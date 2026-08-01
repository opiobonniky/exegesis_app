import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookMarked,
  BookOpen,
  BookText,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  Lock,
  Save,
  Search,
  Tags,
  Timer,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import RichText from '../../../reusable/RichText';
import { showToast } from '../../../helpers/Toash.helper';
import { StrongsWordData } from '../../../services/strongsService';
import {
  TranslationComparisonEntry,
  VerseResourceData,
} from '../../../services/verseResourcesApi';
import { BookPrologue } from '../../../services/bookProloguesApi';

type LearnTab = 'exegesis' | 'language' | 'history' | 'prologue';

interface LearnStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  learnTab: LearnTab;
  setLearnTab: (tab: LearnTab) => void;
  learnNotes: string;
  setLearnNotes: (value: string) => void;
  learnDataLoading: boolean;
  verseResources: VerseResourceData | null;
  bookPrologue: BookPrologue | null;
  verseWords: StrongsWordData[];
  translations: TranslationComparisonEntry[] | null;
  translationsLoading: boolean;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  saving: boolean;
  savingProgress: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  tabRowRef: React.RefObject<ScrollView>;
  tabPositions: React.MutableRefObject<Record<string, number>>;
  showLeftChevron: boolean;
  showRightChevron: boolean;
  onTabScroll: (x: number) => void;
  onTabContentWidthChange: (w: number) => void;
  onTabContainerWidthChange: (w: number) => void;
  onOpenBibleReader: () => void;
  onOpenCrossReference: (ref: string) => void;
  onStrongsWordPress: (word: StrongsWordData) => void;
  onSaveProgress: () => void;
  onContinue: () => void;
}

const TABS: { key: LearnTab; label: string; icon: React.ElementType; step?: string }[] = [
  { key: 'prologue', label: 'Book Prologue', icon: BookMarked, step: 'Start' },
  { key: 'language', label: 'Original Language', icon: BookText, step: 'Then' },
  { key: 'history', label: 'Historical Context', icon: GraduationCap, step: 'Next' },
  { key: 'exegesis', label: 'Study Notes', icon: FileText },
];

export default function LearnStage({
  styles,
  colors,
  passageRef,
  bookName,
  chapter,
  verseStart,
  learnTab,
  setLearnTab,
  learnNotes,
  setLearnNotes,
  learnDataLoading,
  verseResources,
  bookPrologue,
  verseWords,
  translations,
  translationsLoading,
  isPublic,
  setIsPublic,
  saving,
  savingProgress,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  tabRowRef,
  tabPositions,
  showLeftChevron,
  showRightChevron,
  onTabScroll,
  onTabContentWidthChange,
  onTabContainerWidthChange,
  onOpenBibleReader,
  onOpenCrossReference,
  onStrongsWordPress,
  onSaveProgress,
  onContinue,
}: LearnStageProps) {
  const tabContentRef = useRef<ScrollView>(null);
  const copiedTimerRef = useRef<number>(0);
  const [copiedCommentaryIdx, setCopiedCommentaryIdx] = useState<number | null>(
    null,
  );

  const copyCommentary = (
    text: string,
    author: string,
    title: string,
    idx: number,
  ) => {
    const ref = passageRef || `${bookName} ${chapter}:${verseStart}`;
    const attribution = `${text}\n\n— ${author}, ${title} (commentary on ${ref})`;
    try {
      Clipboard.setString(attribution);
      setCopiedCommentaryIdx(idx);
      showToast('success', 'Commentary copied with attribution');
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(
        () => setCopiedCommentaryIdx(null),
        2000,
      );
    } catch (e) {
      console.error('Copy failed:', e);
      showToast('error', 'Could not copy commentary');
    }
  };

  // Clear copy-feedback timers on unmount
  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabPress = (tab: LearnTab) => {
    setLearnTab(tab);
    const xOffset = tabPositions.current[tab];
    if (xOffset !== undefined && tabRowRef.current) {
      tabRowRef.current.scrollTo({ x: Math.max(0, xOffset - 16), animated: true });
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabRowWrapper}>
      {showLeftChevron && (
        <View style={[styles.tabChevron, styles.tabChevronLeft]}>
          <ChevronLeft size={16} color={colors.muted} />
        </View>
      )}
      <ScrollView
        ref={tabRowRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={e => onTabScroll(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        onContentSizeChange={onTabContentWidthChange}
        onLayout={e => onTabContainerWidthChange(e.nativeEvent.layout.width)}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map(({ key, label, icon: Icon, step }) => {
          const active = learnTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleTabPress(key)}
              onLayout={e => {
                tabPositions.current[key] = e.nativeEvent.layout.x;
              }}
              activeOpacity={0.7}
            >
              <Icon size={14} color={active ? colors.accent : colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  active && styles.tabTextActive,
                  { color: active ? colors.accent : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
              {step && (
                <View style={{
                  backgroundColor: active ? colors.accent : colors.muted,
                  borderRadius: 8,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  marginLeft: 2,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800' }}>
                    {step}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {showRightChevron && (
        <View style={[styles.tabChevron, styles.tabChevronRight]}>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      )}
    </View>
  );

  const renderExegesisTab = () => (
    <View>
      <View style={styles.textareaLabelRow}>
        <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
          <FileText size={14} color={colors.textSecondary} /> Study Notes
        </Text>
      </View>
      <TextInput
        style={[
          styles.textareaLarge,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Write your study notes, observations, and insights..."
        placeholderTextColor={colors.muted}
        value={learnNotes}
        onChangeText={setLearnNotes}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.saveProgressBtn, { borderColor: colors.muted }]}
        onPress={onSaveProgress}
        disabled={savingProgress}
        activeOpacity={0.7}
      >
        {savingProgress ? (
          <ActivityIndicator size="small" color={colors.muted} />
        ) : (
          <>
            <Save size={14} color={colors.muted} />
            <Text style={[styles.saveProgressText, { color: colors.muted }]}>Save Progress</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        onPress={onContinue}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Continue to Abide</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLanguageTab = () => {
    if (learnDataLoading) {
      return (
        <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }
    if (verseWords.length === 0) {
      return (
        <View style={[styles.learnContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.learnText, { color: colors.textSecondary }]}>
            No original language words found for this passage.
          </Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={[styles.learnSectionTitle, { color: colors.text }]}>
          {verseWords.length} word{verseWords.length !== 1 ? 's' : ''} in this passage
        </Text>
        {verseWords.map((word, idx) => (
          <TouchableOpacity
            key={`${word.wordOrder}-${idx}`}
            style={[
              styles.wordRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onStrongsWordPress(word)}
            activeOpacity={0.7}
          >
            <View style={[styles.wordIndex, { backgroundColor: `${colors.accent}20` }]}>
              <Text style={[styles.wordIndexText, { color: colors.accent }]}>{word.wordOrder}</Text>
            </View>
            <View style={styles.wordContent}>
              <Text style={[styles.wordSurfaceText, { color: colors.text }]}>
                {word.surfaceText}
              </Text>
              <View style={styles.wordMeta}>
                {word.strongsId && (
                  <View style={[styles.wordBadge, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.wordBadgeText, { color: colors.primary }]}>
                      Strong's {word.strongsId}
                    </Text>
                  </View>
                )}
                {word.lemma && (
                  <Text style={[styles.wordLemma, { color: colors.textSecondary }]}>
                    {word.lemma}
                  </Text>
                )}
              </View>
              {word.morphology && (
                <Text style={[styles.wordMorph, { color: colors.muted }]} numberOfLines={1}>
                  {word.morphology}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHistoryTab = () => {
    if (learnDataLoading) {
      return (
        <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }
    const hasResources =
      verseResources &&
      (verseResources.commentaries.length > 0 ||
        verseResources.crossReferences.length > 0 ||
        verseResources.dictionaryTerms.length > 0 ||
        verseResources.wordStudies.length > 0 ||
        verseResources.relatedTopics.length > 0);
    if (
      !hasResources &&
      (!translations || translations.length === 0)
    ) {
      return (
        <View style={[styles.learnContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.learnText, { color: colors.textSecondary }]}>
            No historical context resources available for this passage.
          </Text>
        </View>
      );
    }
    return (
      <ScrollView ref={tabContentRef} showsVerticalScrollIndicator={false}>
        {/* Translation comparison — how different versions render the verse */}
        {translationsLoading ? (
          <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : translations && translations.length > 0 ? (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Translation Comparison</Text>
            {translations.map((t, i) => (
              <View
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primary },
                ]}
              >
                <View style={[styles.translationBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.translationBadgeText, { color: colors.primary }]}>
                    {t.abbreviation}
                  </Text>
                </View>
                <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>{t.version}</Text>
                <Text style={[styles.translationText, { color: colors.textSecondary }]}>
                  “{t.text}”
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {verseResources && verseResources.commentaries.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Commentaries</Text>
            {verseResources.commentaries.map((c, i) => (
              <View
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.accent },
                ]}
              >
                <View style={styles.commentaryHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resourceCardAuthor, { color: colors.text }]}>{c.author}</Text>
                    <Text style={[styles.resourceCardTitle, { color: colors.textSecondary }]}>{c.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyCommentary(c.text, c.author, c.title, i)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Copy commentary with attribution"
                    style={[
                      styles.commentaryCopyBtn,
                      {
                        backgroundColor: copiedCommentaryIdx === i ? 'rgba(34,197,94,0.12)' : colors.surface,
                        borderColor: copiedCommentaryIdx === i ? 'rgba(34,197,94,0.4)' : colors.border,
                      },
                    ]}
                  >
                    {copiedCommentaryIdx === i ? (
                      <Check size={13} color="#22C55E" strokeWidth={2.5} />
                    ) : (
                      <Copy size={13} color={colors.muted} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={[styles.dividerThin, { backgroundColor: colors.border }]} />
                <RichText
                  text={c.text}
                  textStyle={[styles.resourceCardText, { color: colors.textSecondary }]}
                  accentColor={colors.accent}
                  paragraphGap={6}
                />
              </View>
            ))}
          </View>
        )}
        {verseResources && verseResources.crossReferences.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Cross References</Text>
            {verseResources.crossReferences.map((cr, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primary },
                ]}
                onPress={() => onOpenCrossReference(cr.ref)}
                activeOpacity={0.7}
              >
                <Text style={[styles.resourceCardRef, { color: colors.primary }]}>{cr.ref}</Text>
                <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>{cr.text}</Text>
                <Text style={[styles.crossRefTapHint, { color: colors.primary }]}>
                  Tap to open in reader
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {verseResources && verseResources.wordStudies.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Word Studies</Text>
            {verseResources.wordStudies.map((ws, i) => (
              <View
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.accent },
                ]}
              >
                <View style={styles.wordStudyHeader}>
                  <Hash size={13} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.resourceCardDef, { color: colors.text }]}>{ws.word}</Text>
                  {ws.transliteration ? (
                    <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>
                      ({ws.transliteration})
                    </Text>
                  ) : null}
                  {ws.strongs ? (
                    <View style={[styles.wordBadge, { backgroundColor: `${colors.accent}20` }]}>
                      <Text style={[styles.wordBadgeText, { color: colors.accent }]}>
                        {ws.strongs}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>{ws.meaning}</Text>
              </View>
            ))}
          </View>
        )}
        {verseResources && verseResources.dictionaryTerms.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Dictionary Terms</Text>
            {verseResources.dictionaryTerms.map((dt, i) => (
              <View
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.success },
                ]}
              >
                <Text style={[styles.resourceCardDef, { color: colors.text }]}>{dt.term}</Text>
                <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>{dt.pronunciation}</Text>
                <RichText
                  text={dt.definition}
                  textStyle={[styles.resourceCardText, { color: colors.textSecondary }]}
                  accentColor={colors.success}
                  paragraphGap={6}
                />
                {dt.description ? (
                  <Text style={[styles.resourceCardText, { color: colors.muted, marginTop: 4 }]}>
                    {dt.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
        {verseResources && verseResources.relatedTopics.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Related Topics</Text>
            <View style={styles.topicWrap}>
              {verseResources.relatedTopics.map((t, i) => (
                <View key={i} style={[styles.topicPill, { borderColor: colors.primary }]}>
                  <Tags size={10} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.topicPillText, { color: colors.primary }]}>{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderPrologueTab = () => {
    if (learnDataLoading) {
      return (
        <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }
    if (!bookPrologue) {
      return (
        <View style={[styles.learnContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BookOpen size={24} color={colors.muted} style={{ marginBottom: SPACING.sm }} />
          <Text style={[styles.learnText, { color: colors.textSecondary }]}>
            No book prologue available for {bookName}. Prologues provide author, date, audience, purpose, and key themes for each book.
          </Text>
          {bookName && chapter && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onOpenBibleReader}
              activeOpacity={0.8}
            >
              <BookOpen size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Open {bookName} {chapter} in Reader</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return (
      <View>
        {bookPrologue.author && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Author</Text>
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.author}</Text>
          </View>
        )}
        {bookPrologue.audience && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Audience</Text>
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.audience}</Text>
          </View>
        )}
        {bookPrologue.dateWritten && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Date Written</Text>
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.dateWritten}</Text>
          </View>
        )}
        {bookPrologue.locationWritten && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Location</Text>
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.locationWritten}</Text>
          </View>
        )}
        {bookPrologue.purpose && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Purpose</Text>
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.purpose}</Text>
          </View>
        )}
        {bookPrologue.keyTheme && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Key Theme</Text>
            <Text style={[styles.learnText, { color: colors.accent }]}>{bookPrologue.keyTheme}</Text>
          </View>
        )}
        {bookPrologue.summary && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Summary</Text>
            <RichText
              text={bookPrologue.summary}
              textStyle={[styles.learnText, { color: colors.textSecondary }]}
              accentColor={colors.primary}
              paragraphGap={6}
            />
          </View>
        )}
        {bookPrologue.mainThemes && bookPrologue.mainThemes.length > 0 && (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Main Themes</Text>
            {bookPrologue.mainThemes.map((theme, i) => (
              <View key={i} style={[styles.topicPill, { borderColor: colors.primary, marginBottom: 4 }]}>
                <Text style={[styles.topicPillText, { color: colors.primary }]}>{theme}</Text>
              </View>
            ))}
          </View>
        )}
        {bookPrologue.christConnection && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Connection to Christ</Text>
            <RichText
              text={bookPrologue.christConnection}
              textStyle={[styles.learnText, { color: colors.textSecondary }]}
              accentColor={colors.primary}
              paragraphGap={6}
            />
          </View>
        )}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={onOpenBibleReader}
          activeOpacity={0.8}
        >
          <BookOpen size={16} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Open {bookName} {chapter} in Reader</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (learnTab) {
      case 'exegesis':
        return renderExegesisTab();
      case 'language':
        return renderLanguageTab();
      case 'history':
        return renderHistoryTab();
      case 'prologue':
        return renderPrologueTab();
      default:
        return renderExegesisTab();
    }
  };

  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View style={[styles.stageBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Search size={20} color={colors.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: colors.accent }]}>Step 3 of 4</Text>
        <Text style={[styles.stageTitle, { color: colors.text }]}>Learn</Text>
        <Text style={[styles.stageSubtitle, { color: colors.textSecondary }]}>
          What does this mean?
        </Text>
        <View style={[styles.passageChip, { backgroundColor: `${colors.accent}10`, marginTop: 6, marginBottom: 4 }]}>
          <Timer size={10} color={colors.accent} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>
            15–25 min
          </Text>
        </View>
        {passageRef && (
          <View style={[styles.passageChip, { backgroundColor: `${colors.primary}15` }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>{passageRef}</Text>
          </View>
        )}
      </View>

      {renderTabBar()}
      {renderTabContent()}

      {/* ── Privacy toggle (matches web Learn stage) ── */}
      <TouchableOpacity
        style={[styles.privacyRow, { backgroundColor: colors.cardBackground }]}
        onPress={() => setIsPublic(!isPublic)}
        activeOpacity={0.7}
      >
        {isPublic ? (
          <Globe size={16} color={colors.warning} />
        ) : (
          <Lock size={16} color={colors.success} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.privacyText, { color: colors.text }]}>
            {isPublic ? 'Public' : 'Private'}
          </Text>
          <Text style={[styles.resourceCardLabel, { color: colors.muted }]}>
            {isPublic
              ? 'Anyone can read this study'
              : 'Only you can see this study'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.pageIndicator}>
        {stageOrder.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (idx - 1) * screenWidth,
              idx * screenWidth,
              (idx + 1) * screenWidth,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [
              (idx - 1) * screenWidth,
              idx * screenWidth,
              (idx + 1) * screenWidth,
            ],
            outputRange: [1, 1.3, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s}
              style={[
                styles.pageDot,
                {
                  backgroundColor: idx === pageIndex ? colors.accent : colors.muted,
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  width: idx === pageIndex ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
