import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Star,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { AppContext } from '../../common/AppContext';
import {
  BORDER_RADIUS,
  FONT_SIZES,
  SPACING,
  getColors,
} from '../../constants/theme';
import ActionHeader from '../../reusable/ActionHeader';
import TimePickerModal from '../../reusable/TimePickerModal';
import {
  isDailyVerseReminderEnabled,
  getDailyVerseReminderTimeSetting,
  setDailyVerseReminderEnabled,
  setDailyVerseReminderTime,
} from '../home/dailyVerseNotificationService';
import {
  isPlanNotificationsEnabled,
  setPlanNotificationsEnabled,
  getDailyReminderTime,
  saveDailyReminderTime,
  syncPlanNotificationsFromServer,
  isAtRiskReminderEnabled,
  getAtRiskReminderTime,
  saveAtRiskReminderTime,
  setAtRiskReminderEnabled,
} from '../ReadingPlan/planNotificationService';
import { sendPostRequest } from '../../services/api';

type PickerTarget = 'dailyVerse' | 'readingPlan' | 'atRisk';

const fmtTime = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export default function NotificationSettingsScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const COLORS = getColors(app?.isDark ?? false);

  const [loading, setLoading] = useState(true);

  const [dailyVerseEnabled, setDailyVerseEnabled] = useState(true);
  const [dailyVerseHour, setDailyVerseHour] = useState(7);
  const [dailyVerseMinute, setDailyVerseMinute] = useState(0);

  const [planEnabled, setPlanEnabled] = useState(true);
  const [planHour, setPlanHour] = useState(8);
  const [planMinute, setPlanMinute] = useState(0);

  const [atRiskEnabled, setAtRiskEnabled] = useState(true);
  const [atRiskHour, setAtRiskHour] = useState(20);
  const [atRiskMinute, setAtRiskMinute] = useState(0);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const surface = COLORS.cardBackground;
  const border = COLORS.border;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [dvEnabled, dvTime, pEnabled, pTime, arEnabled, arTime] =
        await Promise.all([
          isDailyVerseReminderEnabled(),
          getDailyVerseReminderTimeSetting(),
          isPlanNotificationsEnabled(),
          getDailyReminderTime(),
          isAtRiskReminderEnabled(),
          getAtRiskReminderTime(),
        ]);

      setDailyVerseEnabled(dvEnabled);
      setDailyVerseHour(dvTime.hour);
      setDailyVerseMinute(dvTime.minute);

      setPlanEnabled(pEnabled);
      setPlanHour(pTime.h);
      setPlanMinute(pTime.m);

      setAtRiskEnabled(arEnabled);
      setAtRiskHour(arTime.h);
      setAtRiskMinute(arTime.m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings().catch(() => {});
  }, [loadSettings]);

  const dailyVerseTimeLabel = useMemo(
    () => fmtTime(dailyVerseHour, dailyVerseMinute),
    [dailyVerseHour, dailyVerseMinute],
  );
  const planTimeLabel = useMemo(
    () => fmtTime(planHour, planMinute),
    [planHour, planMinute],
  );
  const atRiskTimeLabel = useMemo(
    () => fmtTime(atRiskHour, atRiskMinute),
    [atRiskHour, atRiskMinute],
  );

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const onPickerConfirm = useCallback(
    async (hour: number, minute: number) => {
      setPickerOpen(false);
      if (!pickerTarget) return;

      if (pickerTarget === 'dailyVerse') {
        setDailyVerseHour(hour);
        setDailyVerseMinute(minute);
        await setDailyVerseReminderTime(hour, minute);
      } else if (pickerTarget === 'readingPlan') {
        setPlanHour(hour);
        setPlanMinute(minute);
        await saveDailyReminderTime(fmtTime(hour, minute));
        if (await isPlanNotificationsEnabled()) {
          try {
            const res = await sendPostRequest('reading-plans', 'get-all', {});
            if (res?.returnCode === 200 && Array.isArray(res.returnData)) {
              await syncPlanNotificationsFromServer(res.returnData);
            }
          } catch {}
        }
      } else if (pickerTarget === 'atRisk') {
        setAtRiskHour(hour);
        setAtRiskMinute(minute);
        await saveAtRiskReminderTime(fmtTime(hour, minute));
      }
    },
    [pickerTarget],
  );

  const toggleDailyVerse = useCallback(async (enabled: boolean) => {
    setDailyVerseEnabled(enabled);
    await setDailyVerseReminderEnabled(enabled);
  }, []);

  const togglePlan = useCallback(async (enabled: boolean) => {
    setPlanEnabled(enabled);
    await setPlanNotificationsEnabled(enabled);
    if (enabled) {
      try {
        const res = await sendPostRequest('reading-plans', 'get-all', {});
        if (res?.returnCode === 200 && Array.isArray(res.returnData)) {
          await syncPlanNotificationsFromServer(res.returnData);
        }
      } catch {}
    }
  }, []);

  const toggleAtRisk = useCallback(async (enabled: boolean) => {
    setAtRiskEnabled(enabled);
    await setAtRiskReminderEnabled(enabled);
  }, []);

  return (
    <View style={[s.root, { backgroundColor: COLORS.background }]}>
      <ActionHeader title="Notifications" onPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[s.hero, { backgroundColor: surface, borderColor: border }]}
        >
          <View
            style={[s.heroIcon, { backgroundColor: `${COLORS.primary}15` }]}
          >
            <Bell size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroTitle, { color: COLORS.text }]}>
              Manage reminders
            </Text>
            <Text style={[s.heroSub, { color: COLORS.muted }]}>
              Choose when you want to be notified for the Daily Verse and your
              Reading Plan.
            </Text>
          </View>
        </View>

        {/* Daily Verse */}
        <SectionHeader
          title="Daily Verse"
          subtitle="A gentle daily reminder to read the verse of the day."
          icon={<Star size={16} color={COLORS.accent} />}
          COLORS={COLORS}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label="Enable Daily Verse reminder"
            value={dailyVerseEnabled}
            onValueChange={toggleDailyVerse}
            COLORS={COLORS}
            icon={<Bell size={18} color={COLORS.accent} />}
          />
          <RowLink
            label="Reminder time"
            value={dailyVerseTimeLabel}
            disabled={!dailyVerseEnabled || loading}
            onPress={() => openPicker('dailyVerse')}
            COLORS={COLORS}
            icon={<Clock size={18} color={COLORS.accent} />}
          />
        </View>

        {/* Reading Plan */}
        <SectionHeader
          title="Reading Plan"
          subtitle="Daily reading reminders and a completion nudge if today’s task exists."
          icon={<BookOpen size={16} color={COLORS.primary} />}
          COLORS={COLORS}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label="Enable Reading Plan notifications"
            value={planEnabled}
            onValueChange={togglePlan}
            COLORS={COLORS}
            icon={<Bell size={18} color={COLORS.primary} />}
          />
          <RowLink
            label="Daily reminder time"
            value={planTimeLabel}
            disabled={!planEnabled || loading}
            onPress={() => openPicker('readingPlan')}
            COLORS={COLORS}
            icon={<Clock size={18} color={COLORS.primary} />}
          />
        </View>

        {/* At-Risk Reminder */}
        <SectionHeader
          title="Missed Day Reminder"
          subtitle="Evening reminder if today's reading assignment isn't completed."
          icon={<AlertCircle size={16} color="#F59E0B" />}
          COLORS={COLORS}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label="Enable missed day reminder"
            value={atRiskEnabled}
            onValueChange={toggleAtRisk}
            COLORS={COLORS}
            icon={<AlertCircle size={18} color="#F59E0B" />}
          />
          <RowLink
            label="Reminder time"
            value={atRiskTimeLabel}
            disabled={!atRiskEnabled || loading}
            onPress={() => openPicker('atRisk')}
            COLORS={COLORS}
            icon={<Clock size={18} color="#F59E0B" />}
          />
        </View>

        <Text style={[s.footerNote, { color: COLORS.muted }]}>
          Tip: If notifications don't show, enable them in your phone settings
          and disable battery optimizations for this app.
        </Text>
      </ScrollView>

      <TimePickerModal
        visible={pickerOpen}
        initialHour={
          pickerTarget === 'dailyVerse'
            ? dailyVerseHour
            : pickerTarget === 'atRisk'
              ? atRiskHour
              : planHour
        }
        initialMinute={
          pickerTarget === 'dailyVerse'
            ? dailyVerseMinute
            : pickerTarget === 'atRisk'
              ? atRiskMinute
              : planMinute
        }
        onConfirm={onPickerConfirm}
        onCancel={() => setPickerOpen(false)}
        isDark={app?.isDark ?? false}
      />
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  COLORS,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  COLORS: any;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIconWrap, { backgroundColor: COLORS.surface }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.sectionTitle, { color: COLORS.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[s.sectionSub, { color: COLORS.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function RowSwitch({
  label,
  value,
  onValueChange,
  icon,
  COLORS,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon: React.ReactNode;
  COLORS: any;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, { backgroundColor: `${COLORS.primary}10` }]}>
          {icon}
        </View>
        <Text style={[s.rowLabel, { color: COLORS.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

function RowLink({
  label,
  value,
  onPress,
  disabled,
  icon,
  COLORS,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  COLORS: any;
}) {
  return (
    <TouchableOpacity
      style={[s.row, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, { backgroundColor: `${COLORS.primary}10` }]}>
          {icon}
        </View>
        <Text style={[s.rowLabel, { color: COLORS.text }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[s.rowValue, { color: COLORS.muted }]}>{value}</Text>
        <ChevronRight size={18} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  heroTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800' },
  heroSub: { marginTop: 4, fontSize: FONT_SIZES.sm, lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  sectionSub: { marginTop: 2, fontSize: FONT_SIZES.xs, lineHeight: 16 },

  card: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rowLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { marginRight: 8, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  footerNote: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});
