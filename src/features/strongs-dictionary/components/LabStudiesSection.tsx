import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  ChevronDown,
  Eye,
  Headphones,
  Sprout,
  Check,
  CalendarDays,
  CircleAlert,
  Clock3,
  FileText,
  Heart,
  Lock,
  RefreshCw,
  ScrollText,
  Tag,
  Target,
  Volume2,
} from 'lucide-react-native';
import { sendPostRequest } from '../../../services/api';
import { STAGE_ORDER } from '../../lab/constants';
import type { LabStage } from '../../lab/types';
import StudyRollPanel from './StudyRollPanel';

interface LabSession {
  id: string;
  passageRef: string;
  bookName: string;
  chapter: string | number;
  verseStart: string | number | null;
  verseEnd: string | number | null;
  currentStage: string;
  completed: boolean;
  createdOn?: string;
  updatedOn?: string;
  lookNotes?: string | null;
  lookPromptsJson?: string | null;
  listenCompleted?: boolean;
  listenDuration?: number | null;
  listenElapsed?: number | null;
  learnNotes?: string | null;
  abideReflection?: string | null;
  abidePrayer?: string | null;
  abideApplication?: string | null;
  abideTags?: string | null;
  strongsWords?: string | null;
  strongsIds?: string | null;
  isPublic?: boolean;
  journalEntryId?: string | number | null;
}

interface StrongsWord {
  strongsId?: string;
  surfaceText?: string;
  lemma?: string;
  originalWord?: string;
}

interface Props {
  bookName: string;
  chapter: number;
  verse: number;
  colors: any;
}

/** Same icons/labels as the Lab flow's StageStepper so the accordion matches. */
const STAGE_META: Record<
  LabStage,
  { icon: React.ElementType; label: string; desc: string }
> = {
  look: { icon: Eye, label: 'Look', desc: 'Study the passage' },
  listen: { icon: Headphones, label: 'Listen', desc: 'Hear the Word' },
  learn: { icon: BookOpen, label: 'Learn', desc: 'Understand the context' },
  abide: { icon: Sprout, label: 'Abide', desc: 'Reflect and dwell' },
  apply: { icon: Check, label: 'Apply', desc: 'Live it out' },
};

/** Nicely formatted date — relative for today/yesterday, else a short date. */
const formatStudyDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds < 1) return 'Not recorded';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return `${remainder} sec`;
  return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
};

const parseStringArray = (value?: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const parseStrongsWords = (value?: string | null): StrongsWord[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseLookAnswers = (value?: string | null) => {
  if (!value) return { answers: {} as Record<string, string>, plain: '' };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const answers = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, answer]) => String(answer || '').trim())
          .map(([key, answer]) => [key, String(answer).trim()]),
      );
      return { answers, plain: '' };
    }
  } catch {
    // Older mobile sessions stored one plain-text observation.
  }
  return { answers: {}, plain: value.trim() };
};

function DetailBlock({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  colors: any;
}) {
  return (
    <View style={[styles.detailBlock, { borderColor: colors.border }]}>
      <View style={styles.detailHeading}>
        <Icon size={14} color={colors.primary} strokeWidth={2.2} />
        <Text style={[styles.detailLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.detailValue,
          { color: value?.trim() ? colors.textSecondary : colors.muted },
        ]}
      >
        {value?.trim() || 'Nothing was recorded for this part of the study.'}
      </Text>
    </View>
  );
}

/**
 * "YOUR LAB STUDIES" — shows the Exegesis Lab sessions the user has done on
 * this exact verse. Each study card expands in place and loads the complete
 * session. Look / Listen / Learn / Abide / Apply are nested accordions so the
 * user's saved work can be reviewed without leaving the dictionary.
 */
export default function LabStudiesSection({
  bookName,
  chapter,
  verse,
  colors,
}: Props) {
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<LabStage | null>(null);
  const [sessionDetails, setSessionDetails] = useState<
    Record<string, LabSession>
  >({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);

  const loadStudies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendPostRequest('exegesis', 'history', {
        page: 0,
        pageSize: 50,
      });
      if (res.returnCode === 200 && res.returnData?.data) {
        const all: LabSession[] = res.returnData.data || [];
        const matches = all.filter(s => {
          if (!s.bookName) return false;
          const sameBook =
            String(s.bookName).toLowerCase() === bookName.toLowerCase();
          const sameChapter = Number(s.chapter) === chapter;
          const start = Number(s.verseStart);
          const end = s.verseEnd ? Number(s.verseEnd) : start;
          const coversVerse = start <= verse && verse <= end;
          return sameBook && sameChapter && coversVerse;
        });
        setSessions(matches);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [bookName, chapter, verse]);

  useEffect(() => {
    setOpenSessionId(null);
    setOpenStage(null);
    setSessionDetails({});
    setDetailErrorId(null);
    loadStudies();
  }, [loadStudies]);

  const loadSessionDetail = useCallback(
    async (session: LabSession, force = false) => {
      if (!force && sessionDetails[session.id]) return;
      setDetailLoadingId(session.id);
      setDetailErrorId(null);
      try {
        const res = await sendPostRequest<LabSession>(
          'exegesis',
          session.id,
          {},
        );
        if (res.returnCode !== 200 || !res.returnData) {
          throw new Error(res.returnMessage || 'Unable to load study');
        }
        setSessionDetails(prev => ({
          ...prev,
          [session.id]: { ...session, ...res.returnData },
        }));
      } catch {
        setDetailErrorId(session.id);
      } finally {
        setDetailLoadingId(prev => (prev === session.id ? null : prev));
      }
    },
    [sessionDetails],
  );

  const toggleSession = useCallback(
    (session: LabSession) => {
      const opening = openSessionId !== session.id;
      setOpenSessionId(opening ? session.id : null);
      setOpenStage(null);
      if (opening) loadSessionDetail(session);
    },
    [loadSessionDetail, openSessionId],
  );

  const stageState = useCallback(
    (session: LabSession, stage: LabStage): 'done' | 'current' | 'pending' => {
      const abandoned = session.currentStage === 'abandoned';
      if (
        session.completed ||
        session.currentStage === 'completed' ||
        abandoned
      ) {
        return 'done';
      }
      const idx = STAGE_ORDER.indexOf(stage);
      const curIdx = STAGE_ORDER.indexOf(session.currentStage as LabStage);
      if (idx < curIdx || curIdx < 0) return 'done';
      if (idx === curIdx) return 'current';
      return 'pending';
    },
    [],
  );

  const stageProgress = useCallback((session: LabSession) => {
    if (session.completed || session.currentStage === 'completed')
      return STAGE_ORDER.length;
    // 'abandoned' is not in STAGE_ORDER — treat it as no completed stages.
    if (session.currentStage === 'abandoned') return 0;
    const curIdx = STAGE_ORDER.indexOf(session.currentStage as LabStage);
    return curIdx < 0 ? 0 : curIdx;
  }, []);

  const statusLabel = useMemo(
    () => (session: LabSession) => {
      if (session.completed || session.currentStage === 'completed')
        return 'Completed';
      if (session.currentStage === 'abandoned') return 'Abandoned';
      return `In Progress · At ${
        STAGE_META[session.currentStage as LabStage]?.label ||
        session.currentStage
      }`;
    },
    [],
  );

  const renderStageContent = (stage: LabStage, session: LabSession) => {
    const prompts = parseStringArray(session.lookPromptsJson);
    const look = parseLookAnswers(session.lookNotes);
    const strongsWords = parseStrongsWords(session.strongsWords);
    const strongsIds = (session.strongsIds || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    const displayedStrongsWords: StrongsWord[] =
      strongsWords.length > 0
        ? strongsWords
        : strongsIds.map(strongsId => ({ strongsId }));

    if (stage === 'look') {
      return (
        <View style={styles.stagePanel}>
          <Text style={[styles.stageIntro, { color: colors.textSecondary }]}>
            A record of what stood out while carefully observing the passage.
          </Text>
          {!!look.plain && (
            <DetailBlock
              icon={Eye}
              label="Observations and responses"
              value={look.plain}
              colors={colors}
            />
          )}
          {(prompts.length > 0 || Object.keys(look.answers).length > 0) && (
            <View style={[styles.detailBlock, { borderColor: colors.border }]}>
              <View style={styles.detailHeading}>
                <ScrollText size={14} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Guided observations
                </Text>
              </View>
              {(prompts.length > 0
                ? prompts.map((question, index) => ({
                    question,
                    answer: look.answers[String(index)],
                    key: String(index),
                  }))
                : Object.entries(look.answers).map(([key, answer]) => ({
                    question: `Observation ${Number(key) + 1}`,
                    answer,
                    key,
                  }))
              ).map(({ question, answer, key }, index) => (
                <View key={key} style={styles.promptRow}>
                  <Text
                    style={[styles.promptNumber, { color: colors.primary }]}
                  >
                    {index + 1}
                  </Text>
                  <View style={styles.promptContent}>
                    <Text
                      style={[styles.promptQuestion, { color: colors.text }]}
                    >
                      {question}
                    </Text>
                    <Text
                      style={[
                        styles.promptText,
                        { color: answer ? colors.textSecondary : colors.muted },
                      ]}
                    >
                      {answer || 'No response recorded.'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {!look.plain &&
            prompts.length === 0 &&
            Object.keys(look.answers).length === 0 && (
              <DetailBlock
                icon={Eye}
                label="Observations and responses"
                colors={colors}
              />
            )}
        </View>
      );
    }

    if (stage === 'listen') {
      const listenedFor = formatDuration(session.listenElapsed);
      const plannedDuration = formatDuration(session.listenDuration);
      return (
        <View style={styles.stagePanel}>
          <Text style={[styles.stageIntro, { color: colors.textSecondary }]}>
            Time set aside to hear, repeat, and dwell on the passage.
          </Text>
          <View style={styles.metricGrid}>
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: `${colors.primary}0D`,
                  borderColor: colors.border,
                },
              ]}
            >
              <Clock3 size={15} color={colors.primary} />
              <Text style={[styles.metricLabel, { color: colors.muted }]}>
                Planned
              </Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {plannedDuration}
              </Text>
            </View>
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: `${colors.primary}0D`,
                  borderColor: colors.border,
                },
              ]}
            >
              <Volume2 size={15} color={colors.primary} />
              <Text style={[styles.metricLabel, { color: colors.muted }]}>
                Listened
              </Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {listenedFor}
              </Text>
            </View>
          </View>
          <View style={styles.completionRow}>
            <Check
              size={14}
              color={session.listenCompleted ? colors.success : colors.muted}
            />
            <Text
              style={[
                styles.completionText,
                {
                  color: session.listenCompleted
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            >
              {session.listenCompleted
                ? 'Listening practice completed'
                : 'Listening practice was not marked complete'}
            </Text>
          </View>
        </View>
      );
    }

    if (stage === 'learn') {
      return (
        <View style={styles.stagePanel}>
          <Text style={[styles.stageIntro, { color: colors.textSecondary }]}>
            Insights gathered from context, language, cross-references, and
            study resources.
          </Text>
          <DetailBlock
            icon={BookOpen}
            label="Study notes and insights"
            value={session.learnNotes}
            colors={colors}
          />
          {(strongsWords.length > 0 || strongsIds.length > 0) && (
            <View style={[styles.detailBlock, { borderColor: colors.border }]}>
              <View style={styles.detailHeading}>
                <FileText size={14} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Original-language words studied
                </Text>
              </View>
              <View style={styles.chipWrap}>
                {displayedStrongsWords.map((word, index) => {
                  const id = word.strongsId || strongsIds[index] || 'Word';
                  const term =
                    word.surfaceText || word.lemma || word.originalWord;
                  return (
                    <View
                      key={`${id}-${index}`}
                      style={[
                        styles.wordChip,
                        { backgroundColor: `${colors.primary}12` },
                      ]}
                    >
                      <Text style={[styles.wordId, { color: colors.primary }]}>
                        {id}
                      </Text>
                      {!!term && (
                        <Text
                          style={[
                            styles.wordTerm,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {term}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      );
    }

    if (stage === 'abide') {
      return (
        <View style={styles.stagePanel}>
          <Text style={[styles.stageIntro, { color: colors.textSecondary }]}>
            The personal response formed by dwelling on the truth of the
            passage.
          </Text>
          <DetailBlock
            icon={Heart}
            label="Reflection"
            value={session.abideReflection}
            colors={colors}
          />
          <DetailBlock
            icon={Sprout}
            label="Prayer"
            value={session.abidePrayer}
            colors={colors}
          />
          {!!session.abideTags?.trim() && (
            <View style={styles.tagRow}>
              <Tag size={13} color={colors.muted} />
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                {session.abideTags}
              </Text>
            </View>
          )}
          <View style={styles.privacyRow}>
            <Lock size={13} color={colors.muted} />
            <Text style={[styles.privacyText, { color: colors.muted }]}>
              {session.isPublic ? 'Shared publicly' : 'Private study'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stagePanel}>
        <Text style={[styles.stageIntro, { color: colors.textSecondary }]}>
          The practical response chosen to carry this passage into daily life.
        </Text>
        <DetailBlock
          icon={Target}
          label="Practical application"
          value={session.abideApplication}
          colors={colors}
        />
        <View
          style={[
            styles.outcomeCard,
            {
              backgroundColor: `${colors.success}10`,
              borderColor: `${colors.success}35`,
            },
          ]}
        >
          <Check size={15} color={colors.success} strokeWidth={2.5} />
          <View style={styles.outcomeTextWrap}>
            <Text style={[styles.outcomeTitle, { color: colors.text }]}>
              {session.completed ? 'Study completed' : 'Study in progress'}
            </Text>
            <Text style={[styles.outcomeText, { color: colors.textSecondary }]}>
              {session.journalEntryId
                ? 'This study was saved to your Legacy Ledger.'
                : 'No Legacy Ledger entry is linked to this study yet.'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        YOUR LAB STUDIES
      </Text>
      {sessions.map(session => {
        const doneCount = stageProgress(session);
        const pct = Math.round((doneCount / STAGE_ORDER.length) * 100);
        const isDone =
          session.completed || session.currentStage === 'completed';
        const abandoned = session.currentStage === 'abandoned';
        const status = statusLabel(session);
        const date = formatStudyDate(session.updatedOn || session.createdOn);
        const open = openSessionId === session.id;

        return (
          <View
            key={session.id}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* ── Header — toggles the accordion ── */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${session.passageRef}, ${status}`}
              onPress={() => toggleSession(session)}
            >
              {/* Header: icon + ref + status pill */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: `${colors.primary}14` },
                  ]}
                >
                  <BookOpen
                    size={17}
                    color={colors.primary}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardRef, { color: colors.text }]}>
                    {session.passageRef}
                  </Text>
                  <View style={styles.metaRow}>
                    {!!date && (
                      <View style={styles.dateRow}>
                        <CalendarDays
                          size={11}
                          color={colors.muted}
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[styles.cardStatus, { color: colors.muted }]}
                        >
                          {date}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isDone
                        ? `${colors.success}18`
                        : abandoned
                          ? `${colors.muted}14`
                          : `${colors.primary}16`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: isDone
                          ? colors.success
                          : abandoned
                            ? colors.muted
                            : colors.primary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isDone ? 'Completed' : abandoned ? 'Abandoned' : `${pct}%`}
                  </Text>
                </View>
              </View>

              {/* Status line */}
              <Text
                style={[styles.statusLine, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {status}
              </Text>

              {/* Progress bar + chevron */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: abandoned
                        ? colors.muted
                        : colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text style={[styles.progressText, { color: colors.muted }]}>
                  {doneCount} of {STAGE_ORDER.length} stages
                </Text>
                <ChevronDown
                  size={16}
                  color={open ? colors.primary : colors.muted}
                  style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>

            {/* ── Expanded stage items (accordion body) ── */}
            <StudyRollPanel open={open}>
              <View style={styles.stageList}>
                {detailLoadingId === session.id && (
                  <View style={styles.detailLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={[
                        styles.detailLoadingText,
                        { color: colors.muted },
                      ]}
                    >
                      Loading your complete study...
                    </Text>
                  </View>
                )}

                {detailErrorId === session.id && (
                  <View
                    style={[
                      styles.detailError,
                      { backgroundColor: `${colors.muted}0D` },
                    ]}
                  >
                    <CircleAlert size={17} color={colors.muted} />
                    <Text
                      style={[
                        styles.detailErrorText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      The full study could not be loaded.
                    </Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => loadSessionDetail(session, true)}
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading study"
                    >
                      <RefreshCw size={13} color={colors.primary} />
                      <Text
                        style={[styles.retryText, { color: colors.primary }]}
                      >
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!!sessionDetails[session.id] &&
                  STAGE_ORDER.map(stage => {
                    const detail = sessionDetails[session.id];
                    const meta = STAGE_META[stage];
                    const Icon = meta.icon;
                    const state = stageState(detail, stage);
                    const isStageDone = state === 'done' && !abandoned;
                    const isCurrent = state === 'current';
                    const stageOpen = openStage === stage;
                    const rowColor = isStageDone
                      ? colors.success
                      : isCurrent
                        ? colors.primary
                        : colors.muted;

                    return (
                      <View
                        key={stage}
                        style={[
                          styles.stageItem,
                          { borderColor: colors.border },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.stageRow,
                            stageOpen && {
                              backgroundColor: `${colors.primary}08`,
                            },
                          ]}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: stageOpen }}
                          accessibilityLabel={`${meta.label}, ${
                            isStageDone
                              ? 'completed'
                              : isCurrent
                                ? 'current stage'
                                : 'not started'
                          }`}
                          onPress={() =>
                            setOpenStage(prev =>
                              prev === stage ? null : stage,
                            )
                          }
                        >
                          <View
                            style={[
                              styles.stageIcon,
                              {
                                backgroundColor: isStageDone
                                  ? `${colors.success}16`
                                  : isCurrent
                                    ? `${colors.primary}16`
                                    : `${colors.muted}12`,
                              },
                            ]}
                          >
                            <Icon
                              size={15}
                              color={rowColor}
                              strokeWidth={isCurrent ? 2.4 : 2.1}
                            />
                          </View>
                          <View style={styles.stageTextWrap}>
                            <Text
                              style={[styles.stageLabel, { color: rowColor }]}
                            >
                              {meta.label}
                            </Text>
                            <Text
                              style={[
                                styles.stageDesc,
                                { color: colors.muted },
                              ]}
                            >
                              {meta.desc}
                            </Text>
                          </View>
                          <Text
                            style={[styles.stageStateText, { color: rowColor }]}
                          >
                            {isStageDone
                              ? 'Done'
                              : isCurrent
                                ? 'Current'
                                : 'Not started'}
                          </Text>
                          <ChevronDown
                            size={15}
                            color={stageOpen ? colors.primary : colors.muted}
                            style={{
                              transform: [
                                { rotate: stageOpen ? '180deg' : '0deg' },
                              ],
                            }}
                          />
                        </TouchableOpacity>
                        <StudyRollPanel open={stageOpen}>
                          {renderStageContent(stage, detail)}
                        </StudyRollPanel>
                      </View>
                    );
                  })}
              </View>
            </StudyRollPanel>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1, marginRight: 8 },
  cardRef: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStatus: {
    fontSize: 11.5,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusLine: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 9,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(120,120,128,0.16)',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Expanded stage list ──
  stageList: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    gap: 8,
  },
  stageItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 9,
  },
  stageIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTextWrap: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  stageDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  stageStateText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  detailLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  detailLoadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  detailErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  stagePanel: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  stageIntro: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  detailBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  detailHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 7,
  },
  promptNumber: {
    width: 18,
    fontSize: 11,
    fontWeight: '900',
  },
  promptContent: {
    flex: 1,
  },
  promptQuestion: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  promptText: {
    fontSize: 12,
    lineHeight: 17,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 6,
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  completionText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wordChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  wordId: {
    fontSize: 11,
    fontWeight: '900',
  },
  wordTerm: {
    fontSize: 10.5,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  tagText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
  },
  outcomeTextWrap: {
    flex: 1,
  },
  outcomeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  outcomeText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
});
