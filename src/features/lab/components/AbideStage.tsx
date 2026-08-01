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
  BookMarked,
  BookOpen,
  CheckCircle2,
  FileText,
  Heart,
  Lock,
  Save,
  Tag,
  Timer,
} from 'lucide-react-native';

interface AbideStageProps {
  styles: any;
  colors: any;
  passageRef: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  reflection: string;
  setReflection: (value: string) => void;
  prayer: string;
  setPrayer: (value: string) => void;
  appText: string;
  setAppText: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  saving: boolean;
  savingProgress: boolean;
  journalEntryId: string | null;
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onSaveProgress: () => void;
  onSaveAbide: () => void;
  onViewLegacyLedger: () => void;
}

export default function AbideStage({
  styles,
  colors,
  passageRef,
  bookName,
  chapter,
  verseStart,
  reflection,
  setReflection,
  prayer,
  setPrayer,
  appText,
  setAppText,
  tags,
  setTags,
  isPublic,
  setIsPublic,
  saving,
  savingProgress,
  journalEntryId,
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onSaveProgress,
  onSaveAbide,
  onViewLegacyLedger,
}: AbideStageProps) {
  return (
    <View style={styles.stageContainer}>
      <View style={styles.stageHeader}>
        <View style={[styles.stageBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Heart size={20} color={colors.accent} />
        </View>
        <Text style={[styles.stageLabel, { color: colors.accent }]}>Step 4 of 4</Text>
        <Text style={[styles.stageTitle, { color: colors.text }]}>Abide</Text>
        <Text style={[styles.stageSubtitle, { color: colors.textSecondary }]}>
          Record what the Lord has shown you
        </Text>
        <View style={[styles.passageChip, { backgroundColor: `${colors.accent}10`, marginTop: 6, marginBottom: 4 }]}>
          <Timer size={10} color={colors.accent} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>
            8–12 min
          </Text>
        </View>
        {passageRef && (
          <View style={[styles.passageChip, { backgroundColor: `${colors.primary}15` }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.passageChipText, { color: colors.primary }]}>
              {passageRef}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.abideFieldRow}>
        <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
          <FileText size={14} color={colors.textSecondary} /> My Reflection
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
        placeholder="What has God shown you through this passage?"
        placeholderTextColor={colors.muted}
        value={reflection}
        onChangeText={setReflection}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.abideFieldRow}>
        <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
          <Heart size={14} color={colors.textSecondary} /> My Prayer
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
        placeholder="Write your prayer response..."
        placeholderTextColor={colors.muted}
        value={prayer}
        onChangeText={setPrayer}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.abideFieldRow}>
        <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
          <BookMarked size={14} color={colors.textSecondary} /> Practical Step
        </Text>
      </View>
      <TextInput
        style={[
          styles.textarea,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="What will you do in response to God's Word?"
        placeholderTextColor={colors.muted}
        value={appText}
        onChangeText={setAppText}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.textareaLabel, { color: colors.textSecondary }]}>
        <Tag size={14} color={colors.textSecondary} /> Tags
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="#John #Believe #EternalLife"
        placeholderTextColor={colors.muted}
        value={tags}
        onChangeText={setTags}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.privacyRow, { backgroundColor: colors.cardBackground }]}
        onPress={() => setIsPublic(!isPublic)}
        activeOpacity={0.7}
      >
        <Lock size={16} color={isPublic ? colors.warning : colors.success} />
        <Text style={[styles.privacyText, { color: colors.text }]}>
          {isPublic
            ? 'Public — anyone can read this'
            : 'Private — only you can see this'}
        </Text>
      </TouchableOpacity>

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
            <Text style={[styles.saveProgressText, { color: colors.muted }]}>
              Save Progress
            </Text>
          </>
        )}
      </TouchableOpacity>

      {journalEntryId ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: `${colors.success}20`,
              borderWidth: 1,
              borderColor: colors.success,
            },
          ]}
          onPress={onViewLegacyLedger}
          activeOpacity={0.8}
        >
          <CheckCircle2 size={18} color={colors.success} />
          <Text style={[styles.primaryBtnText, { color: colors.success }]}>
            Saved — View in Legacy Ledger
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          onPress={onSaveAbide}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Save to Legacy Ledger</Text>
            </>
          )}
        </TouchableOpacity>
      )}

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
