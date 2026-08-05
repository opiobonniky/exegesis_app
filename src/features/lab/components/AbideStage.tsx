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
  Crosshair,
  Footprints,
  Heart,
  Lock,
  Save,
  BookMarked,
  Sparkles,
} from 'lucide-react-native';
import StageHeader from './StageHeader';

interface AbideStageProps {
  styles: any;
  colors: any;
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
  pageIndex: number;
  stageOrder: readonly string[];
  scrollX: Animated.Value;
  screenWidth: number;
  onSaveAbide: () => void;
}

const QUESTIONS = [
  { id: 1, icon: Sparkles, label: 'What did you learn?', placeholder: 'Write what you learned from this passage...' },
  { id: 2, icon: Crosshair, label: 'How does this apply to my faith?', placeholder: 'Write how this truth applies to your faith...' },
  { id: 3, icon: Footprints, label: 'How can I put this into action?', placeholder: 'Write the practical step(s) you will take...' },
  { id: 4, icon: BookMarked, label: 'What did I get out of this verse and study?', placeholder: 'Summarize what you gained from this verse and study...' },
];

export default function AbideStage({
  styles,
  colors,
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
  pageIndex,
  stageOrder,
  scrollX,
  screenWidth,
  onSaveAbide,
}: AbideStageProps) {
  const fieldValues = [reflection, prayer, appText, tags];
  const fieldSetters = [setReflection, setPrayer, setAppText, setTags];

  return (
    <View style={styles.stageContainer}>
      {/* ── Stage Header ─────────────────────────────────────────────────── */}
      <StageHeader
        Icon={Heart}
        step={4}
        total={5}
        title="Abide"
        subtitle="Record what the Lord has shown you"
        timeLabel="8–12 min"
        colors={colors}
        accentColor={colors.accent}
      />

      {/* ── Question Cards ──────────────────────────────────────────────── */}
      {QUESTIONS.map((q, idx) => (
        <View
          key={q.id}
          style={[
            styles.abideCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftWidth: 4,
              borderLeftColor: `${colors.success}33`,
            },
          ]}
        >
          <View style={styles.promptHeaderRow}>
            <View style={[styles.abideCardIcon, { backgroundColor: `${colors.success}20` }]}>
              <q.icon size={20} color={colors.success} strokeWidth={2.2} />
            </View>
            <Text style={[styles.abideQuestion, { color: colors.text }]}>{q.label}</Text>
            <View style={[styles.abideNumBadge, { backgroundColor: `${colors.success}20` }]}>
              <Text style={[styles.abideNumText, { color: colors.success }]}>{q.id}</Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.abideInput,
              {
                backgroundColor: colors.background,
                borderColor: `${colors.muted}40`,
                color: colors.text,
              },
            ]}
            placeholder={q.placeholder}
            placeholderTextColor={colors.muted}
            value={fieldValues[idx]}
            onChangeText={fieldSetters[idx]}
            multiline
            textAlignVertical="top"
          />
        </View>
      ))}

      {/* ── Privacy toggle ──────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.privacyRow, { backgroundColor: colors.cardBackground }]}
        onPress={() => setIsPublic(!isPublic)}
        activeOpacity={0.7}
      >
        <Lock size={16} color={isPublic ? colors.warning : colors.success} />
        <Text style={[styles.privacyText, { color: colors.text }]}>
          {isPublic ? 'Public — anyone can read this' : 'Private — only you can see this'}
        </Text>
      </TouchableOpacity>

      {/* ── Save & Continue button ─────────────────────────────────────── */}
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
            <Text style={styles.primaryBtnText}>Save & Continue to Apply</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Page Indicator Dots ─────────────────────────────────────────── */}
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
              style={[styles.pageDot, { backgroundColor: idx === pageIndex ? colors.accent : colors.muted, opacity: dotOpacity, transform: [{ scale: dotScale }], width: idx === pageIndex ? 20 : 8 }]}
            />
          );
        })}
      </View>
    </View>
  );
}