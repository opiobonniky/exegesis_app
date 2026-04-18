// src/features/ReadingPlan/planNotificationService.ts
/**
 * Reading Plan Notification Service
 * ─────────────────────────────────
 * Handles every meaningful notification event in the Bible reading plan:
 *
 *  1. Plan Started               → immediate welcome + first-day nudge
 *  2. Daily Reading Reminder     → scheduled each day at the user's chosen time
 *  3. Streak At-Risk Reminder    → evening nudge if today's reading isn't done yet
 *  4. Day Completed              → motivational feedback with streak info
 *  5. Streak Milestone           → celebration at 3 / 7 / 14 / 21 / 30 / 50 / 100 days
 *  6. Quiz Completed             → score + encouragement
 *  7. Plan Completed             → grand celebration when every day is done
 *  8. Plan Abandoned (cleanup)   → cancel all scheduled notifications for a plan
 */

import notifee, {
  AndroidImportance,
  AlarmType,
  TriggerType,
  RepeatFrequency,
  TimestampTrigger,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const REMINDER_TIME_KEY = 'plan_daily_reminder_time'; // "HH:MM" 24-h string
const SCHEDULED_IDS_KEY_PREFIX = 'plan_scheduled_ids_'; // + planId
const PLAN_NOTIF_ENABLED_KEY = 'plan_notif_enabled';

// ─── Channel IDs ──────────────────────────────────────────────────────────────
const CHANNELS = {
  general: 'reading-plan-general',
  reminder: 'reading-plan-reminder',
  achievement: 'reading-plan-achievement',
} as const;

// ─── Streak milestones that deserve a push ────────────────────────────────────
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Plan notification enable/disable functions
// ─────────────────────────────────────────────────────────────────────────────
export async function isPlanNotificationsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PLAN_NOTIF_ENABLED_KEY);
  return v === null ? true : v === '1';
}

export async function setPlanNotificationsEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(PLAN_NOTIF_ENABLED_KEY, enabled ? '1' : '0');
}

export async function syncPlanNotificationsFromServer(
  plans: any[],
): Promise<void> {
  const enabled = await isPlanNotificationsEnabled();
  if (!enabled) return;

  for (const plan of plans) {
    if (plan.active && plan.id) {
      await scheduleDailyReminder(plan.id, plan.title);
    }
  }
}

// At-Risk reminder (evening reminder if today's assignment not done)
const AT_RISK_ENABLED_KEY = 'plan_at_risk_enabled';
const AT_RISK_TIME_KEY = 'plan_at_risk_time';

const getLocalISODate = (d = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

let inAppAtRiskTimer: ReturnType<typeof setTimeout> | null = null;

export async function isAtRiskReminderEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(AT_RISK_ENABLED_KEY);
  return v === null ? true : v === '1';
}

export async function setAtRiskReminderEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(AT_RISK_ENABLED_KEY, enabled ? '1' : '0');
}

export async function getAtRiskReminderTime(): Promise<{
  h: number;
  m: number;
}> {
  const raw = await AsyncStorage.getItem(AT_RISK_TIME_KEY);
  const hhmm = raw ?? '20:00';
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

export async function saveAtRiskReminderTime(hhmm: string): Promise<void> {
  await AsyncStorage.setItem(AT_RISK_TIME_KEY, hhmm);
}

// Arm in-app fallback for at-risk reminder (fires even if app is open)
function armInAppAtRiskReminder(
  planId: string,
  planTitle: string,
  currentStreak: number,
  hour: number,
  minute: number,
) {
  if (inAppAtRiskTimer) clearTimeout(inAppAtRiskTimer);

  const fireAt = todayAt(hour, minute);
  const ms = Math.max(1000, fireAt.getTime() - Date.now());

  inAppAtRiskTimer = setTimeout(() => {
    (async () => {
      const enabled = await isAtRiskReminderEnabled();
      if (!enabled) return;

      // Check if day is already completed - if so, don't show at-risk
      // For now, just show the notification
      await displayAtRiskNotification(planId, planTitle, currentStreak);
    })()
      .catch(err => console.error('❌ planNotif: in-app at-risk failed', err))
      .finally(() => {
        // Re-arm for next day
        armInAppAtRiskReminder(planId, planTitle, currentStreak, hour, minute);
      });
  }, ms);
}

async function displayAtRiskNotification(
  planId: string,
  planTitle: string,
  currentStreak: number,
): Promise<void> {
  try {
    const title =
      currentStreak > 0
        ? `🔥 Don't break your ${currentStreak}-day streak!`
        : '📖 Still time to read today!';
    const body = `You haven't finished today's reading in "${planTitle}" yet. Just a few minutes is all it takes.`;

    await notifee.displayNotification({
      id: `streak-risk-${planId}-${getLocalISODate()}`,
      title,
      body,
      data: { screen: 'ReadingPlan', planId, planTitle },
      ...androidOptions(CHANNELS.reminder),
      ...iosOptions(1),
    });
  } catch (e) {
    console.error('❌ planNotif: displayAtRiskNotification failed', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel bootstrap  (call once at app start)
// ─────────────────────────────────────────────────────────────────────────────
export async function bootstrapPlanChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannels([
      {
        id: CHANNELS.general,
        name: 'Reading Plan Updates',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
      {
        id: CHANNELS.reminder,
        name: 'Daily Reading Reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
      {
        id: CHANNELS.achievement,
        name: 'Achievements & Milestones',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
    ]);
  } catch (err) {
    console.error('❌ planNotif: bootstrapChannels', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function androidOptions(channelId: string, smallIcon = 'ic_notification') {
  return Platform.OS === 'android'
    ? {
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          smallIcon,
          pressAction: { id: 'default', launchActivity: 'default' },
          sound: 'default',
        },
      }
    : {};
}

function iosOptions(badge = 1) {
  return Platform.OS === 'ios'
    ? {
        ios: {
          sound: 'default',
          badgeCount: badge,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      }
    : {};
}

/** Persist a triggered-notification ID so we can cancel it later. */
async function rememberScheduledId(planId: string, id: string): Promise<void> {
  try {
    const key = SCHEDULED_IDS_KEY_PREFIX + planId;
    const raw = await AsyncStorage.getItem(key);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      await AsyncStorage.setItem(key, JSON.stringify(ids));
    }
  } catch {}
}

/** Retrieve all scheduled IDs for a plan. */
async function getScheduledIds(planId: string): Promise<string[]> {
  try {
    const key = SCHEDULED_IDS_KEY_PREFIX + planId;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Cancel and forget all scheduled notifications for a plan. */
async function clearScheduledIds(planId: string): Promise<void> {
  try {
    const ids = await getScheduledIds(planId);
    await Promise.all(ids.map(id => notifee.cancelNotification(id)));
    await AsyncStorage.removeItem(SCHEDULED_IDS_KEY_PREFIX + planId);
    console.log(
      `🗑 planNotif: cleared ${ids.length} notifications for plan ${planId}`,
    );
  } catch (err) {
    console.error('❌ planNotif: clearScheduledIds', err);
  }
}

/**
 * Build a Date object for today at HH:MM.
 * If that time is already past, advance to tomorrow.
 */
function todayAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// User preference: daily reminder time
// ─────────────────────────────────────────────────────────────────────────────
/** Save the user's preferred daily reminder time (e.g. "08:00"). */
export async function saveDailyReminderTime(hhmm: string): Promise<void> {
  await AsyncStorage.setItem(REMINDER_TIME_KEY, hhmm);
}

/** Get the user's preferred reminder time. Defaults to "08:00". */
export async function getDailyReminderTime(): Promise<{
  h: number;
  m: number;
}> {
  const raw = await AsyncStorage.getItem(REMINDER_TIME_KEY);
  const hhmm = raw ?? '08:00';
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLAN STARTED
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyPlanStarted(
  planTitle: string,
  planId: string,
): Promise<void> {
  try {
    await notifee.displayNotification({
      id: `plan-started-${planId}`,
      title: '📖 Your Reading Journey Begins!',
      body: `You've started "${planTitle}". Day 1 is waiting for you — let's go!`,
      data: { screen: 'DailyReading', planId, day: '1' },
      ...androidOptions(CHANNELS.general),
      ...iosOptions(1),
    });

    // Also schedule the very first daily reminder
    await scheduleDailyReminder(planId, planTitle);
    console.log('✅ planNotif: plan started notification sent');
  } catch (err) {
    console.error('❌ planNotif: notifyPlanStarted', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAILY READING REMINDER  (repeating, scheduled via Notifee trigger)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Schedule (or reschedule) the repeating daily reminder for a plan.
 * Cancels any existing reminder for this plan before creating a new one.
 */
export async function scheduleDailyReminder(
  planId: string,
  planTitle: string,
  nextDay?: number,
): Promise<void> {
  try {
    const enabled = await isPlanNotificationsEnabled();
    if (!enabled) return;

    const { h, m } = await getDailyReminderTime();

    // Cancel the previous daily-reminder notification for this plan (if any)
    const existingId = `daily-reminder-${planId}`;
    await notifee.cancelNotification(existingId);

    const timestamp = todayAt(h, m).getTime();

    const dayLabel = nextDay ? `Day ${nextDay}` : "Today's reading";

    // Android: Use AlarmManager to fire at the correct time even in Doze.
    // Try multiple strategies, fall back if one fails.
    const triggersToTry: TimestampTrigger[] =
      Platform.OS === 'android'
        ? [
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              repeatFrequency: RepeatFrequency.DAILY,
              alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              repeatFrequency: RepeatFrequency.DAILY,
              alarmManager: true,
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              repeatFrequency: RepeatFrequency.DAILY,
            },
          ]
        : [
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              repeatFrequency: RepeatFrequency.DAILY,
            },
          ];

    let scheduled = false;
    for (const trigger of triggersToTry) {
      try {
        await notifee.createTriggerNotification(
          {
            id: existingId,
            title: '📅 Time for Your Daily Bible Reading',
            body: `${dayLabel} of "${planTitle}" is ready. Keep your streak alive! 🔥`,
            data: { screen: 'ReadingPlan', planId },
            ...androidOptions(CHANNELS.reminder),
            ...iosOptions(),
          },
          trigger,
        );
        scheduled = true;
        break;
      } catch (e) {
        console.warn('planNotif: trigger schedule failed', e);
      }
    }

    if (!scheduled) {
      console.warn('planNotif: failed to schedule any trigger');
      return;
    }

    await rememberScheduledId(planId, existingId);
    console.log(
      `✅ planNotif: daily reminder scheduled at ${h}:${String(m).padStart(2, '0')}`,
    );
  } catch (err) {
    console.error('❌ planNotif: scheduleDailyReminder', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STREAK AT-RISK REMINDER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Schedule a one-shot evening nudge (20:00 by default) for the same day
 * if the user hasn't completed their reading.
 * Call this after a plan is loaded and today's reading is still pending.
 */
export async function scheduleStreakAtRiskReminder(
  planId: string,
  planTitle: string,
  currentStreak: number,
  eveningHour = 20,
  eveningMinute = 0,
): Promise<void> {
  try {
    const enabled = await isAtRiskReminderEnabled();
    if (!enabled) return;

    const fireAt = todayAt(eveningHour, eveningMinute);
    // If it's already past 20:00 there's no point firing it today
    if (fireAt.getTime() <= Date.now()) return;

    const id = `streak-risk-${planId}-${new Date().toDateString()}`;

    const timestamp = fireAt.getTime();

    // Android: Use AlarmManager to fire at the correct time even in Doze.
    const triggersToTry: TimestampTrigger[] =
      Platform.OS === 'android'
        ? [
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
              alarmManager: true,
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
            },
          ]
        : [
            {
              type: TriggerType.TIMESTAMP,
              timestamp,
            },
          ];

    let scheduled = false;
    for (const trigger of triggersToTry) {
      try {
        await notifee.createTriggerNotification(
          {
            id,
            title:
              currentStreak > 0
                ? `🔥 Don't break your ${currentStreak}-day streak!`
                : '📖 Still time to read today!',
            body: `You haven't finished today's reading in "${planTitle}" yet. Just a few minutes is all it takes.`,
            data: { screen: 'ReadingPlan', planId },
            ...androidOptions(CHANNELS.reminder),
            ...iosOptions(),
          },
          trigger,
        );
        scheduled = true;
        break;
      } catch (e) {
        console.warn('planNotif: at-risk trigger schedule failed', e);
      }
    }

    if (!scheduled) {
      console.warn('planNotif: failed to schedule at-risk reminder');
      return;
    }

    await rememberScheduledId(planId, id);
    console.log(
      '✅ planNotif: streak-at-risk reminder scheduled for',
      fireAt.toLocaleTimeString(),
    );
  } catch (err) {
    console.error('❌ planNotif: scheduleStreakAtRiskReminder', err);
  }

  // Also arm in-app fallback timer as backup
  armInAppAtRiskReminder(
    planId,
    planTitle,
    currentStreak,
    eveningHour,
    eveningMinute,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DAY COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyDayCompleted(params: {
  planId: string;
  planTitle: string;
  day: number;
  totalDays: number;
  newStreak: number;
}): Promise<void> {
  try {
    const { planId, planTitle, day, totalDays, newStreak } = params;
    const remaining = totalDays - day;

    const title =
      newStreak > 1
        ? `🔥 Day ${day} Complete! ${newStreak}-day streak!`
        : `✅ Day ${day} Complete!`;

    const body =
      remaining > 0
        ? `Great work on "${planTitle}"! ${remaining} day${remaining !== 1 ? 's' : ''} to go. Come back tomorrow to keep the momentum.`
        : `You've finished all ${totalDays} days — the plan completion badge is just around the corner!`;

    await notifee.displayNotification({
      id: `day-complete-${planId}-${day}`,
      title,
      body,
      data: { screen: 'PlanDetail', planId },
      ...androidOptions(CHANNELS.general),
      ...iosOptions(1),
    });

    // Cancel today's at-risk reminder — day is done
    await notifee.cancelNotification(
      `streak-risk-${planId}-${new Date().toDateString()}`,
    );

    // Schedule next day's reminder
    if (remaining > 0) {
      await scheduleDailyReminder(planId, planTitle, day + 1);
    }

    console.log('✅ planNotif: day completed notification sent');
  } catch (err) {
    console.error('❌ planNotif: notifyDayCompleted', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STREAK MILESTONE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Call this whenever a day is completed. It will fire a push only if the new
 * streak matches one of the milestone values.
 */
export async function notifyStreakMilestone(
  planId: string,
  planTitle: string,
  newStreak: number,
): Promise<void> {
  if (!STREAK_MILESTONES.includes(newStreak)) return;

  try {
    const emoji =
      newStreak >= 100
        ? '🏆'
        : newStreak >= 50
          ? '🥇'
          : newStreak >= 30
            ? '💎'
            : newStreak >= 21
              ? '🌟'
              : newStreak >= 14
                ? '⭐'
                : newStreak >= 7
                  ? '🔥'
                  : '🎉';

    await notifee.displayNotification({
      id: `streak-milestone-${planId}-${newStreak}`,
      title: `${emoji} ${newStreak}-Day Streak!`,
      body: `Incredible consistency in "${planTitle}"! You've read the Bible ${newStreak} days in a row. Keep going!`,
      data: { screen: 'ReadingPlan', planId },
      ...androidOptions(CHANNELS.achievement),
      ...iosOptions(1),
    });

    console.log(
      `✅ planNotif: streak milestone ${newStreak} notification sent`,
    );
  } catch (err) {
    console.error('❌ planNotif: notifyStreakMilestone', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUIZ COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyQuizCompleted(params: {
  planId: string;
  planTitle: string;
  day: number;
  correctAnswers: number;
  totalQuestions: number;
}): Promise<void> {
  try {
    const { planId, planTitle, day, correctAnswers, totalQuestions } = params;
    const pct = Math.round((correctAnswers / totalQuestions) * 100);

    const passed = pct >= 70;
    const emoji =
      pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 70 ? '✅' : '📚';

    const title = passed
      ? `${emoji} Quiz Passed! ${pct}% Correct`
      : `${emoji} Quiz Done — Keep Studying!`;

    const body = passed
      ? `You scored ${correctAnswers}/${totalQuestions} on Day ${day} of "${planTitle}". Well done!`
      : `You got ${correctAnswers}/${totalQuestions} on Day ${day} of "${planTitle}". Review the questions and try again!`;

    await notifee.displayNotification({
      id: `quiz-done-${planId}-${day}`,
      title,
      body,
      data: { screen: 'DailyReading', planId, day: String(day) },
      ...androidOptions(CHANNELS.general),
      ...iosOptions(1),
    });

    console.log('✅ planNotif: quiz completed notification sent');
  } catch (err) {
    console.error('❌ planNotif: notifyQuizCompleted', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PLAN COMPLETED  🎉
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyPlanCompleted(
  planId: string,
  planTitle: string,
  totalDays: number,
  finalStreak: number,
): Promise<void> {
  try {
    await notifee.displayNotification({
      id: `plan-complete-${planId}`,
      title: '🎉 Reading Plan Complete!',
      body: `You finished all ${totalDays} days of "${planTitle}"${finalStreak > 0 ? ` with a ${finalStreak}-day streak` : ''}. What an achievement!`,
      data: { screen: 'PlanDetail', planId },
      ...androidOptions(CHANNELS.achievement),
      ...iosOptions(1),
    });

    // Cancel all future scheduled reminders — plan is done
    await clearScheduledIds(planId);

    console.log('✅ planNotif: plan completed notification sent');
  } catch (err) {
    console.error('❌ planNotif: notifyPlanCompleted', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PLAN ABANDONED / USER CANCELS  (cleanup)
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelPlanNotifications(planId: string): Promise<void> {
  await clearScheduledIds(planId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep-link handler (wire this into your notification press listeners)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Call this from your Notifee foreground / background event handlers and from
 * Firebase's onNotificationOpenedApp / getInitialNotification.
 *
 * @param data  Notification data payload
 * @param navigationRef  A React Navigation ref (navigationRef.current?.navigate)
 */
export function handlePlanNotificationPress(
  data: Record<string, string> | undefined,
  navigate: (screen: string, params?: Record<string, any>) => void,
): void {
  if (!data?.screen) return;

  switch (data.screen) {
    case 'DailyReading':
      navigate('DailyReading', {
        planId: data.planId,
        day: data.day ? parseInt(data.day, 10) : 1,
      });
      break;
    case 'PlanDetail':
      navigate('PlanDetail', { planId: data.planId });
      break;
    case 'ReadingPlan':
      navigate('ReadingPlan');
      break;
    default:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: wire into existing useNotification listeners
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Call this once inside your existing setupNotificationListeners() function
 * (in useNotification.ts) to add plan-specific press handling.
 *
 * Usage:
 *   import { attachPlanNotifHandlers } from './planNotificationService';
 *   // inside setupNotificationListeners():
 *   attachPlanNotifHandlers(navigation);
 */
export function attachPlanNotifHandlers(
  navigate: (screen: string, params?: Record<string, any>) => void,
): void {
  notifee.onForegroundEvent(({ type, detail }) => {
    // EventType.PRESS = 1
    if (type === 1 && detail.notification?.data) {
      handlePlanNotificationPress(
        detail.notification.data as Record<string, string>,
        navigate,
      );
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Background handler for when app is closed
// ─────────────────────────────────────────────────────────────────────────────
export async function handlePlanReminderDelivered(
  notification?: { id?: string; data?: Record<string, any> } | null,
): Promise<void> {
  try {
    const id = notification?.id;
    const data = notification?.data;

    if (!id || !data?.planId) return;

    const enabled = await isPlanNotificationsEnabled();
    if (!enabled) return;

    // If the notification is a streak-at-risk, also check if that's enabled
    if (id.startsWith('streak-risk-')) {
      const atRiskEnabled = await isAtRiskReminderEnabled();
      if (!atRiskEnabled) return;
    }

    // Show a fresh notification to remind user to open the app
    const planId = data.planId;
    const planTitle = data.planTitle || 'Reading Plan';

    await notifee.displayNotification({
      title: '📖 Time for Your Daily Bible Reading',
      body: `Your reading plan "${planTitle}" is waiting. Open the app to continue!`,
      data: { screen: 'DailyReading', planId },
      ...androidOptions(CHANNELS.reminder),
      ...iosOptions(1),
    });
  } catch (e) {
    console.error('❌ planNotif: handlePlanReminderDelivered failed', e);
  }
}
