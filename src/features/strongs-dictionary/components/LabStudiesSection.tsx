import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  Headphones,
  Sprout,
  Check,
  CalendarDays,
} from 'lucide-react-native';
import { sendPostRequest } from '../../../services/api';
import { route } from '../../../component/navigations/routes';
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

/**
 * "YOUR LAB STUDIES" — shows the Exegesis Lab sessions the user has done on
 * this exact verse. Each study card is an accordion (like the VERSE STUDY
 * TOOLS list): tapping the header expands it to reveal ALL five stage items —
 * Look / Listen / Learn / Abide / Apply — each showing its completion state.
 * Done and current stages resume the study at that stage; a Resume button
 * continues from where the study left off. Hidden when there are no sessions
 * for the verse.
 */
export default function LabStudiesSection({
  bookName,
  chapter,
  verse,
  colors,
}: Props) {
  const navigation = useNavigation<any>();
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

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
    loadStudies();
  }, [loadStudies]);

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

  const stageProgress = useCallback(
    (session: LabSession) => {
      if (session.completed || session.currentStage === 'completed')
        return STAGE_ORDER.length;
      // 'abandoned' is not in STAGE_ORDER — treat it as no completed stages.
      if (session.currentStage === 'abandoned') return 0;
      const curIdx = STAGE_ORDER.indexOf(session.currentStage as LabStage);
      return curIdx < 0 ? 0 : curIdx;
    },
    [],
  );

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

  const openStudy = useCallback(
    (session: LabSession, stage?: LabStage) => {
      navigation.navigate(route.bibleStudy, {
        sessionId: session.id,
        stage: stage || session.currentStage,
        passageRef: session.passageRef,
        bookName: session.bookName,
        chapter: Number(session.chapter),
        verseStart: Number(session.verseStart || 0),
        verseEnd: Number(session.verseEnd || session.verseStart || 0),
      });
    },
    [navigation],
  );

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
        const date = formatStudyDate(
          session.updatedOn || session.createdOn,
        );
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
              onPress={() =>
                setOpenSessionId(prev => (prev === session.id ? null : session.id))
              }
            >
              {/* Header: icon + ref + status pill */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: `${colors.primary}14` },
                  ]}
                >
                  <BookOpen size={17} color={colors.primary} strokeWidth={2.2} />
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
                        <Text style={[styles.cardStatus, { color: colors.muted }]}>
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
                      backgroundColor: abandoned ? colors.muted : colors.primary,
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
                {STAGE_ORDER.map(stage => {
                  const meta = STAGE_META[stage];
                  const Icon = meta.icon;
                  const state = stageState(session, stage);
                  const isStageDone = state === 'done' && !abandoned;
                  const isCurrent = state === 'current';
                  const tappable = !abandoned && (isStageDone || isCurrent);
                  const rowColor = isStageDone
                    ? colors.success
                    : isCurrent
                      ? colors.primary
                      : colors.muted;

                  return (
                    <TouchableOpacity
                      key={stage}
                      style={styles.stageRow}
                      activeOpacity={0.7}
                      disabled={!tappable}
                      onPress={() => openStudy(session, stage)}
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
                        <Text style={[styles.stageLabel, { color: rowColor }]}>
                          {meta.label}
                        </Text>
                        <Text
                          style={[styles.stageDesc, { color: colors.muted }]}
                        >
                          {meta.desc}
                        </Text>
                      </View>
                      {isStageDone && (
                        <View
                          style={[
                            styles.stageStatePill,
                            { backgroundColor: `${colors.success}14` },
                          ]}
                        >
                          <Check size={11} color={colors.success} strokeWidth={3} />
                          <Text
                            style={[styles.stageStateText, { color: colors.success }]}
                          >
                            Done
                          </Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={styles.stageCurrentWrap}>
                          <Text
                            style={[styles.stageStateText, { color: colors.primary }]}
                          >
                            Continue
                          </Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </View>
                      )}
                      {!isStageDone && !isCurrent && (
                        <Text
                          style={[styles.stageStateText, { color: colors.muted }]}
                        >
                          Not started
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Resume — continues from where the study left off */}
                <TouchableOpacity
                  style={[
                    styles.resumeBtn,
                    { backgroundColor: `${colors.primary}14` },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => openStudy(session)}
                >
                  <Text style={[styles.resumeText, { color: colors.primary }]}>
                    {isDone
                      ? 'Review study'
                      : abandoned
                        ? 'Start over'
                        : `Resume at ${STAGE_META[session.currentStage as LabStage]?.label || 'current stage'}`}
                  </Text>
                  <ChevronRight size={15} color={colors.primary} />
                </TouchableOpacity>
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
    borderTopColor: 'rgba(120,120,128,0.2)',
    gap: 2,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 10,
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
  stageStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stageCurrentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stageStateText: {
    fontSize: 11,
    fontWeight: '800',
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 11,
  },
  resumeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});
