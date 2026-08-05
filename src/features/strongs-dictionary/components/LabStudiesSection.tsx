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
  ChevronRight,
  Eye,
  Ear,
  Brain,
  Heart,
  CheckCircle2,
} from 'lucide-react-native';
import { sendPostRequest } from '../../../services/api';
import { route } from '../../../component/navigations/routes';
import { STAGE_ORDER } from '../../lab/constants';
import type { LabStage } from '../../lab/types';

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

const STAGE_ICONS: Record<string, React.ElementType> = {
  look: Eye,
  listen: Ear,
  learn: Brain,
  abide: Heart,
};

const STAGE_LABELS: Record<string, string> = {
  look: 'Look',
  listen: 'Listen',
  learn: 'Learn',
  abide: 'Abide',
  apply: 'Apply',
};

/**
 * "YOUR LAB STUDIES" — shows the Exegesis Lab sessions the user has done on
 * this exact verse (Look / Listen / Learn / Abide / Apply). Tapping a study
 * resumes it in the Lab flow. Hidden when there are no sessions for the verse.
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
      if (session.completed || session.currentStage === 'completed' || abandoned) {
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

  const statusLabel = useMemo(
    () => (session: LabSession) => {
      if (session.completed || session.currentStage === 'completed')
        return 'Completed';
      if (session.currentStage === 'abandoned') return 'Abandoned';
      return `At ${STAGE_LABELS[session.currentStage] || session.currentStage}`;
    },
    [],
  );

  const openStudy = (session: LabSession) => {
    navigation.navigate(route.bibleStudy, {
      sessionId: session.id,
      stage: session.currentStage,
      passageRef: session.passageRef,
      bookName: session.bookName,
      chapter: Number(session.chapter),
      verseStart: Number(session.verseStart || 0),
      verseEnd: Number(session.verseEnd || session.verseStart || 0),
    });
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
      {sessions.map(session => (
        <TouchableOpacity
          key={session.id}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={() => openStudy(session)}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}14` }]}>
              <BookOpen size={17} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardRef, { color: colors.text }]}>
                {session.passageRef}
              </Text>
              <Text style={[styles.cardStatus, { color: colors.muted }]}>
                {statusLabel(session)} ·{' '}
                {new Date(
                  session.updatedOn || session.createdOn || Date.now(),
                ).toLocaleDateString()}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </View>

          {/* Stage chips */}
          <View style={styles.stagesRow}>
            {STAGE_ORDER.map(stage => {
              const state = stageState(session, stage);
              const Icon = STAGE_ICONS[stage];
              const abandoned = session.currentStage === 'abandoned';
              const isDone = state === 'done' && !abandoned;
              const isCurrent = state === 'current';
              return (
                <View
                  key={stage}
                  style={[
                    styles.stageChip,
                    {
                      backgroundColor: isDone
                        ? `${colors.success}18`
                        : isCurrent
                        ? `${colors.primary}16`
                        : `${colors.muted}12`,
                    },
                  ]}
                >
                  {isDone ? (
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2.5} />
                  ) : (
                    Icon && <Icon size={11} color={isCurrent ? colors.primary : colors.muted} strokeWidth={2.2} />
                  )}
                  <Text
                    style={[
                      styles.stageText,
                      {
                        color: isDone
                          ? colors.success
                          : isCurrent
                          ? colors.primary
                          : colors.muted,
                      },
                    ]}
                  >
                    {STAGE_LABELS[stage]}
                  </Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      ))}
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
  cardStatus: {
    fontSize: 11.5,
    marginTop: 2,
  },
  stagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stageText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
