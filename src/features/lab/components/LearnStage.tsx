import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Save,
  Search,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { StrongsWordData } from '../../../services/strongsService';
import { VerseResourceData } from '../../../services/verseResourcesApi';
import { BookPrologue } from '../../../services/bookProloguesApi';

type LearnTab = 'exegesis' | 'language' | 'history' | 'prologue';

interface LearnStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  bookName: string;
  chapter: string;
  learnTab: LearnTab;
  setLearnTab: (tab: LearnTab) => void;
  learnNotes: string;
  setLearnNotes: (value: string) => void;
  learnDataLoading: boolean;
  verseResources: VerseResourceData | null;
  bookPrologue: BookPrologue | null;
  verseWords: StrongsWordData[];
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
  onStrongsWordPress: (word: StrongsWordData) => void;
  onSaveProgress: () => void;
  onContinue: () => void;
}

const TABS: { key: LearnTab; label: string; icon: React.ElementType }[] = [
  { key: 'exegesis', label: 'Study Notes', icon: FileText },
  { key: 'language', label: 'Original Language', icon: BookText },
  { key: 'history', label: 'Historical Context', icon: GraduationCap },
  { key: 'prologue', label: 'Book Prologue', icon: BookMarked },
];

export default function LearnStage({
  styles,
  colors,
  passageRef,
  bookName,
  chapter,
  learnTab,
  setLearnTab,
  learnNotes,
  setLearnNotes,
  learnDataLoading,
  verseResources,
  bookPrologue,
  verseWords,
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
  onStrongsWordPress,
  onSaveProgress,
  onContinue,
}: LearnStageProps) {
  const tabContentRef = useRef<ScrollView>(null);

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
        {TABS.map(({ key, label, icon: Icon }) => {
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
      <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
        <FileText size={14} color={colors.textSecondary} /> Study Notes
      </Text>
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
    if (!verseResources || (!verseResources.commentaries.length && !verseResources.crossReferences.length && !verseResources.dictionaryTerms.length)) {
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
        {verseResources.commentaries.length > 0 && (
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
                <Text style={[styles.resourceCardAuthor, { color: colors.text }]}>{c.author}</Text>
                <Text style={[styles.resourceCardTitle, { color: colors.textSecondary }]}>{c.title}</Text>
                <View style={[styles.dividerThin, { backgroundColor: colors.border }]} />
                <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>{c.text}</Text>
              </View>
            ))}
          </View>
        )}
        {verseResources.crossReferences.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[styles.learnSectionTitle, { color: colors.text }]}>Cross References</Text>
            {verseResources.crossReferences.map((cr, i) => (
              <View
                key={i}
                style={[
                  styles.resourceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primary },
                ]}
              >
                <Text style={[styles.resourceCardRef, { color: colors.primary }]}>{cr.ref}</Text>
                <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>{cr.text}</Text>
              </View>
            ))}
          </View>
        )}
        {verseResources.dictionaryTerms.length > 0 && (
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
                <Text style={[styles.resourceCardText, { color: colors.textSecondary }]}>{dt.definition}</Text>
              </View>
            ))}
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
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.summary}</Text>
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
            <Text style={[styles.learnText, { color: colors.textSecondary }]}>{bookPrologue.christConnection}</Text>
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
        {passageRef && (
          <View style={[styles.passageChip, { backgroundColor: `${colors.primary}15` }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>{passageRef}</Text>
          </View>
        )}
      </View>

      {renderTabBar()}
      {renderTabContent()}

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
