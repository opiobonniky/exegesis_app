import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { BookMarked, Check, ChevronRight, PenLine } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { createJournalEntry } from '../../../services/api';
import { showToast } from '../../../helpers/Toash.helper';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

interface ChapterJournalSectionProps {
  /** The 3 questions for this chapter (chapter + general prompts, max 3). */
  prompts: Array<{ id: number; prompt: string }>;
  currentBook: string;
  currentChapter: number;
  colors: any;
  isRtl: boolean;
  /** Called when the user skips the questions (e.g. go to next chapter). */
  onSkip: () => void;
}

/**
 * End-of-chapter journaling section: three questions the reader can fill in
 * and save, or skip to move on to the next chapter.
 */
export default function ChapterJournalSection({
  prompts,
  currentBook,
  currentChapter,
  colors,
  isRtl,
  onSkip,
}: ChapterJournalSectionProps) {
  const { translations } = useLanguage();
  const jc = translations?.journal;
  const bc = translations?.bible;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const visiblePrompts = useMemo(() => prompts.slice(0, 3), [prompts]);

  if (dismissed) return null;

  const handleSave = async () => {
    Keyboard.dismiss();
    const filled = Object.entries(answers)
      .filter(([, text]) => text && text.trim().length > 0)
      .map(([promptId, text]) => ({
        promptId: Number(promptId),
        text: text.trim(),
      }));

    if (filled.length === 0) {
      showToast('warning', jc?.fillAtLeastOne || 'Answer at least one question before saving.');
      return;
    }

    setSaving(true);
    try {
      for (const item of filled) {
        const prompt = visiblePrompts.find(p => p.id === item.promptId);
        await createJournalEntry({
          title: prompt?.prompt ? `Reflection: ${prompt.prompt}` : 'Chapter Reflection',
          content: item.text,
          bookName: currentBook,
          chapter: currentChapter,
          category: 'reflection',
          source: 'chapter-journal',
        });
      }
      setSaved(true);
      showToast('success', jc?.reflectionsSaved || 'Reflections saved');
    } catch (error: any) {
      showToast(
        'error',
        error?.message || jc?.failedToSave || 'Failed to save your reflections',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        s.wrap,
        {
          backgroundColor: colors.background,
          // Full-bleed: counteracts the VerseList footer's horizontal padding.
          marginHorizontal: -SPACING.lg,
          // The list already adds its own bottom padding, so a modest margin suffices.
          marginBottom: SPACING.xxl,
        },
      ]}
    >
      {/* Section-start flourish: soft gradient divider + icon (no border needed) */}
      <View style={s.flourish}>
        <LinearGradient
          colors={['transparent', `${colors.primary}38`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.flourishLine}
        />
        <View style={[s.flourishBadge, { backgroundColor: `${colors.primary}16` }]}>
          <PenLine size={15} color={colors.primary} strokeWidth={2.2} />
        </View>
        <LinearGradient
          colors={[`${colors.primary}38`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.flourishLine}
        />
      </View>

      {/* Header */}
      <View style={s.header}>
        <View style={[s.headerIcon, { backgroundColor: `${colors.primary}16` }]}>
          <PenLine size={16} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {bc?.chapterJournalTitle || 'Chapter Reflections'}
          </Text>
          <Text style={[s.headerSub, { color: colors.muted }]}>
            {bc?.chapterJournalSubtitle ||
              'Answer the questions before moving to the next chapter, or skip them.'}
          </Text>
        </View>
      </View>

      {/* Questions */}
      {visiblePrompts.map((prompt, idx) => {
        const value = answers[prompt.id] || '';
        const filled = value.trim().length > 0;
        return (
          <View key={prompt.id} style={s.questionWrap}>
            <View style={s.questionRow}>
              <View
                style={[
                  s.numBadge,
                  {
                    backgroundColor: filled ? colors.primary : `${colors.primary}14`,
                  },
                ]}
              >
                <Text style={[s.numText, { color: filled ? '#FFFFFF' : colors.primary }]}>
                  {idx + 1}
                </Text>
              </View>
              <Text style={[s.questionText, { color: colors.text }]}>{prompt.prompt}</Text>
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              value={value}
              onChangeText={text => setAnswers(prev => ({ ...prev, [prompt.id]: text }))}
              placeholder={jc?.yourAnswer || 'Write your answer…'}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              textAlign={isRtl ? 'right' : 'left'}
            />
          </View>
        );
      })}

      {/* Actions */}
      {saved ? (
        <View style={[s.savedBanner, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}30` }]}>
          <Check size={16} color={colors.success} strokeWidth={2.5} />
          <Text style={[s.savedText, { color: colors.success }]}>
            {jc?.savedCheckmark || 'Saved — you can continue reading.'}
          </Text>
        </View>
      ) : (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <BookMarked size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={s.saveText}>
                  {jc?.saveReflections || 'Save Reflections'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.skipBtn, { borderColor: colors.border }]}
            onPress={() => {
              setDismissed(true);
              onSkip();
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.skipText, { color: colors.muted }]}>
              {bc?.skipJournal || 'Skip for now'}
            </Text>
            <ChevronRight
              size={14}
              color={colors.muted}
              strokeWidth={2.4}
              style={{ transform: [{ scaleX: isRtl ? -1 : 1 }] }}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    // Seamless: matches the Bible reading background — no card border/shadow.
    borderWidth: 0,
  },
  flourish: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  flourishLine: {
    height: 2,
    flex: 1,
    maxWidth: 90,
    borderRadius: 1,
  },
  flourishBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  questionWrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: 8,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  numBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numText: {
    fontSize: 12,
    fontWeight: '800',
  },
  questionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  input: {
    // Borderless, blends with the section background — the num badge shows fill state.
    minHeight: 64,
    padding: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  skipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: SPACING.md,
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  savedText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
