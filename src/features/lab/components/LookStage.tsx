import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquareQuote,
  Save,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';

interface PassageVerse {
  verseNumber: number;
  text: string;
}

interface LookStageProps {
  styles: any;
  colors: any;
  prompts: string[];
  currentPromptIdx: number;
  setCurrentPromptIdx: React.Dispatch<React.SetStateAction<number>>;
  passageRef: string;
  bookName: string;
  chapter: string;
  passageVerses: PassageVerse[];
  passageVersesLoading: boolean;
  lookNotes: string;
  setLookNotes: (value: string) => void;
  saving: boolean;
  savingProgress: boolean;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onSaveProgress: () => void;
  onContinue: () => void;
  renderChangePassageActions: () => React.ReactNode;
  renderHighlightedVerseText: (verse: PassageVerse) => React.ReactNode;
}

export default function LookStage({
  styles,
  colors,
  prompts,
  currentPromptIdx,
  setCurrentPromptIdx,
  passageRef,
  bookName,
  chapter,
  passageVerses,
  passageVersesLoading,
  lookNotes,
  setLookNotes,
  saving,
  savingProgress,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onSaveProgress,
  onContinue,
  renderChangePassageActions,
  renderHighlightedVerseText,
}: LookStageProps) {
  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View style={[styles.stageBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Eye size={20} color={colors.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: colors.accent }]}>Step 1 of 4</Text>
        <Text style={[styles.stageTitle, { color: colors.text }]}>Look</Text>
        <Text style={[styles.stageSubtitle, { color: colors.textSecondary }]}>What does the text say?</Text>
        {passageRef && (
          <View style={[styles.passageChip, { backgroundColor: `${colors.primary}15` }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>{passageRef}</Text>
          </View>
        )}
        {renderChangePassageActions()}
      </View>

      <View
        style={[
          styles.promptCard,
          { backgroundColor: colors.cardBackground, borderLeftColor: colors.accent },
        ]}
      >
        <MessageSquareQuote size={16} color={colors.accent} />
        <Text style={[styles.promptText, { color: colors.text }]}>{prompts[currentPromptIdx]}</Text>
        <View style={styles.promptNav}>
          <TouchableOpacity
            onPress={() => setCurrentPromptIdx(p => Math.max(0, p - 1))}
            disabled={currentPromptIdx === 0}
          >
            <ChevronLeft
              size={18}
              color={currentPromptIdx === 0 ? colors.muted : colors.accent}
            />
          </TouchableOpacity>
          <Text style={[styles.promptCounter, { color: colors.muted }]}> 
            {currentPromptIdx + 1} / {prompts.length}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentPromptIdx(p => Math.min(prompts.length - 1, p + 1))}
            disabled={currentPromptIdx === prompts.length - 1}
          >
            <ChevronRight
              size={18}
              color={currentPromptIdx === prompts.length - 1 ? colors.muted : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {passageVersesLoading ? (
        <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : passageVerses.length > 0 ? (
        <View
          style={[
            styles.passageTextCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.passageTextHeader, { borderBottomColor: colors.border }]}>
            <BookOpen size={14} color={colors.primary} />
            <Text style={[styles.passageTextLabel, { color: colors.primary }]}> 
              {passageRef || `${bookName} ${chapter}`}
            </Text>
          </View>
          {passageVerses.map(v => (
            <View key={v.verseNumber} style={styles.passageVerseRow}>
              <Text style={[styles.passageVerseNum, { color: colors.muted }]}> 
                {v.verseNumber}
              </Text>
              {renderHighlightedVerseText(v)}
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>Your Observations</Text>
      <TextInput
        style={[
          styles.textarea,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        placeholder="Write what you observe in this passage..."
        placeholderTextColor={colors.muted}
        value={lookNotes}
        onChangeText={setLookNotes}
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
          <Text style={styles.primaryBtnText}>Continue to Listen</Text>
        )}
      </TouchableOpacity>

      <View style={styles.pageIndicator}>
        {stageOrder.map((s, idx) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotScale = scrollX.interpolate({
            inputRange: [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
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
