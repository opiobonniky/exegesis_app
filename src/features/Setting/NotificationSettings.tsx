import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Platform,
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
import { useLanguage } from '../../component/language-translation/LanguageProvider';
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
  const { translations: translation, language } = useLanguage();
  const isRtl = language === 'ar';

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
      <ActionHeader title={translation?.profile?.menuItems?.notifications || 'Notifications'} onPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[s.hero, isRtl && s.heroRtl, { backgroundColor: surface, borderColor: border }]}
        >
          <View
            style={[s.heroIcon, isRtl && s.heroIconRtl, { backgroundColor: `${COLORS.primary}15` }]}
          >
            <Bell size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroTitle, { color: COLORS.text }]}>
              {translation?.notificationSettings?.heroTitle || 'Manage reminders'}
            </Text>
            <Text style={[s.heroSub, { color: COLORS.muted }]}>
              {translation?.notificationSettings?.heroSub || 'Choose when you want to be notified for the Daily Verse and your Reading Plan.'}
            </Text>
          </View>
        </View>

        {/* Daily Verse */}
        <SectionHeader
          title={translation?.notificationSettings?.dailyVerse || 'Daily Verse'}
          subtitle={translation?.notificationSettings?.dailyVerseSub || 'A gentle daily reminder to read the verse of the day.'}
          icon={<Star size={16} color={COLORS.accent} />}
          COLORS={COLORS}
          isRtl={isRtl}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label={translation?.notificationSettings?.enableDailyVerse || 'Enable Daily Verse reminder'}
            value={dailyVerseEnabled}
            onValueChange={toggleDailyVerse}
            COLORS={COLORS}
            icon={<Bell size={18} color={COLORS.accent} />}
            isRtl={isRtl}
          />
          <RowLink
            label={translation?.notificationSettings?.reminderTime || 'Reminder time'}
            value={dailyVerseTimeLabel}
            disabled={!dailyVerseEnabled || loading}
            onPress={() => openPicker('dailyVerse')}
            COLORS={COLORS}
            icon={<Clock size={18} color={COLORS.accent} />}
            isRtl={isRtl}
          />
        </View>

        {/* Reading Plan */}
        <SectionHeader
          title={translation?.notificationSettings?.readingPlan || 'Reading Plan'}
          subtitle={translation?.notificationSettings?.readingPlanSub || 'Daily reading reminders and a completion nudge if today’s task exists.'}
          icon={<BookOpen size={16} color={COLORS.primary} />}
          COLORS={COLORS}
          isRtl={isRtl}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label={translation?.notificationSettings?.enableReadingPlan || 'Enable Reading Plan notifications'}
            value={planEnabled}
            onValueChange={togglePlan}
            COLORS={COLORS}
            icon={<Bell size={18} color={COLORS.primary} />}
            isRtl={isRtl}
          />
          <RowLink
            label={translation?.notificationSettings?.dailyReminderTime || 'Daily reminder time'}
            value={planTimeLabel}
            disabled={!planEnabled || loading}
            onPress={() => openPicker('readingPlan')}
            COLORS={COLORS}
            icon={<Clock size={18} color={COLORS.primary} />}
            isRtl={isRtl}
          />
        </View>

        {/* At-Risk Reminder */}
        <SectionHeader
          title={translation?.notificationSettings?.missedDay || 'Missed Day Reminder'}
          subtitle={translation?.notificationSettings?.missedDaySub || "Evening reminder if today's reading assignment isn't completed."}
          icon={<AlertCircle size={16} color="#F59E0B" />}
          COLORS={COLORS}
          isRtl={isRtl}
        />
        <View
          style={[s.card, { backgroundColor: surface, borderColor: border }]}
        >
          <RowSwitch
            label={translation?.notificationSettings?.enableMissedDay || 'Enable missed day reminder'}
            value={atRiskEnabled}
            onValueChange={toggleAtRisk}
            COLORS={COLORS}
            icon={<AlertCircle size={18} color="#F59E0B" />}
            isRtl={isRtl}
          />
          <RowLink
            label={translation?.notificationSettings?.reminderTime || 'Reminder time'}
            value={atRiskTimeLabel}
            disabled={!atRiskEnabled || loading}
            onPress={() => openPicker('atRisk')}
            COLORS={COLORS}
            icon={<Clock size={18} color="#F59E0B" />}
            isRtl={isRtl}
          />
        </View>

        <Text style={[s.footerNote, { color: COLORS.muted }]}> 
          {translation?.notificationSettings?.footerTip || "Tip: If notifications don't show, enable them in your phone settings and disable battery optimizations for this app."}
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
  isRtl,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  COLORS: any;
  isRtl: boolean;
}) {
  return (
    <View style={[s.sectionHeader, isRtl && s.sectionHeaderRtl]}>
      <View style={[s.sectionIconWrap, isRtl && s.sectionIconWrapRtl, { backgroundColor: COLORS.surface }]}>
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
  isRtl
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon: React.ReactNode;
  COLORS: any;
  isRtl: boolean;
}) {
  return (
    <View style={[s.row, isRtl && s.rowRtl]}>
      <View style={[s.rowLeft, isRtl && s.rowLeftRtl]}>
        <View style={[s.rowIcon, isRtl && s.rowIconRtl, { backgroundColor: `${COLORS.primary}10` }]}>
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
  isRtl
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  COLORS: any;
  isRtl: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.row, isRtl && s.rowRtl, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[s.rowLeft, isRtl && s.rowLeftRtl]}>
        <View style={[s.rowIcon, isRtl && s.rowIconRtl, { backgroundColor: `${COLORS.primary}10` }]}>
          {icon}
        </View>
        <Text style={[s.rowLabel, { color: COLORS.text }]}>{label}</Text>
      </View>
      <View style={[s.rowRight, isRtl && s.rowRightRtl]}>
        <Text style={[s.rowValue, isRtl && s.rowValueRtl, { color: COLORS.muted }]}>{value}</Text>
        {isRtl ? <ChevronRight size={18} color={COLORS.muted} style={{ transform: [{ scaleX: -1 }] }} /> : <ChevronRight size={18} color={COLORS.muted} />}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 60 : 40 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heroRtl: {
    flexDirection: 'row-reverse',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  heroIconRtl: {
    marginRight: 0,
    marginLeft: SPACING.md,
  },
  heroTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800' },
  heroSub: { marginTop: 4, fontSize: FONT_SIZES.sm, lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  sectionIconWrapRtl: {
    marginRight: 0,
    marginLeft: SPACING.sm,
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
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLeftRtl: { flexDirection: 'row-reverse' },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rowIconRtl: { marginRight: 0, marginLeft: SPACING.sm },
  rowLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowRightRtl: { flexDirection: 'row-reverse' },
  rowValue: { marginRight: 8, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  rowValueRtl: { marginRight: 0, marginLeft: 8 },

  footerNote: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});
