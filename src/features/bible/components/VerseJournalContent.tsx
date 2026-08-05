import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronRight, PenLine, X } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { createJournalEntry } from '../../../services/api';
import { showToast } from '../../../helpers/Toash.helper';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

interface VerseJournalContentProps {
  verseNumber: number;
  bookName: string;
  chapter: number;
  /** Up to 3 prompts for this verse (chapter-specific topped up with general). */
  prompts: Array<{ id: number; prompt: string }>;
  colors: any;
  isRtl: boolean;
  onHide: () => void;
  /** Navigates to the full journal editor screen for this verse. */
  onOpenFullJournal?: () => void;
}

/**
 * Inline journaling section shown beneath the selected verse — replaces the
 * old screen navigation. Three fill-in questions (same prompts as the chapter
 * journal) that save directly, or a link to open the full journal editor.
 */
export default function VerseJournalContent({
  verseNumber,
  bookName,
  chapter,
  prompts,
  colors,
  isRtl,
  onHide,
  onOpenFullJournal,
}: VerseJournalContentProps) {
  const { translations } = useLanguage();
  const jc = translations?.journal;
  const bc = translations?.bible;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const visiblePrompts = useMemo(() => prompts.slice(0, 3), [prompts]);

  const handleSave = async () => {
    Keyboard.dismiss();
    const filled = Object.entries(answers)
      .filter(([, text]) => text && text.trim().length > 0)
      .map(([promptId, text]) => ({
        promptId: Number(promptId),
        text: text.trim(),
      }));

    if (filled.length === 0) {
      showToast(
        'warning',
        jc?.fillAtLeastOne || 'Answer at least one question before saving.',
      );
      return;
    }

    setSaving(true);
    try {
      for (const item of filled) {
        const prompt = visiblePrompts.find(p => p.id === item.promptId);
        await createJournalEntry({
          title: prompt?.prompt
            ? `Reflection: ${prompt.prompt}`
            : `${bookName} ${chapter}:${verseNumber} Reflection`,
          content: item.text,
          bookName,
          chapter,
          category: 'reflection',
          source: 'verse-journal',
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
        s.card,
        {
          backgroundColor: `${colors.primary}06`,
          borderColor: `${colors.primary}14`,
        },
      ]}
    >
      {/* Header */}
      <View style={[s.header, isRtl && s.headerRtl, { borderBottomColor: colors.border }]}>
        <View style={[s.headerIcon, { backgroundColor: `${colors.primary}16` }]}>
          <PenLine size={15} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {bc?.journal || 'Journal'}
          </Text>
          <Text style={[s.headerSub, { color: colors.muted }]}>
            {bookName} {chapter}:{verseNumber}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onHide}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[s.closeBtn, { backgroundColor: `${colors.textSecondary}15` }]}
        >
          <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Questions */}
      {visiblePrompts.map((prompt, idx) => {
        const value = answers[prompt.id] || '';
        const filled = value.trim().length > 0;
        return (
          <View key={prompt.id} style={s.questionWrap}>
            <View style={[s.questionRow, isRtl && s.questionRowRtl]}>
              <View
                style={[
                  s.numBadge,
                  {
                    backgroundColor: filled
                      ? colors.primary
                      : `${colors.primary}14`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.numText,
                    { color: filled ? '#FFFFFF' : colors.primary },
                  ]}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text style={[s.questionText, { color: colors.text }]}>
                {prompt.prompt}
              </Text>
            </View>
            <TextInput
              style={[
                s.input,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={value}
              onChangeText={text =>
                setAnswers(prev => ({ ...prev, [prompt.id]: text }))
              }
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
        <View
          style={[
            s.savedBanner,
            {
              backgroundColor: `${colors.success}14`,
              borderColor: `${colors.success}30`,
            },
          ]}
        >
          <Check size={16} color={colors.success} strokeWidth={2.5} />
          <Text style={[s.savedText, { color: colors.success }]}>
            {jc?.savedCheckmark || 'Saved — you can continue reading.'}
          </Text>
        </View>
      ) : (
        <View style={[s.actions, isRtl && s.actionsRtl]}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.saveText}>
                {jc?.saveReflections || 'Save Reflections'}
              </Text>
            )}
          </TouchableOpacity>

          {onOpenFullJournal && (
            <TouchableOpacity
              style={[s.fullBtn, { borderColor: colors.border }]}
              onPress={onOpenFullJournal}
              activeOpacity={0.7}
            >
              <Text style={[s.fullBtnText, { color: colors.primary }]}>
                {bc?.openJournalEditor || 'Open Editor'}
              </Text>
              <ChevronRight
                size={14}
                color={colors.primary}
                strokeWidth={2.4}
                style={{ transform: [{ scaleX: isRtl ? -1 : 1 }] }}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: FONT_SIZES.xs,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionWrap: {
    paddingTop: SPACING.md,
    gap: 8,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  questionRowRtl: {
    flexDirection: 'row-reverse',
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
    minHeight: 56,
    padding: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
    borderRadius: BORDER_RADIUS.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: SPACING.md,
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: BORDER_RADIUS.md,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  fullBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  savedText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
