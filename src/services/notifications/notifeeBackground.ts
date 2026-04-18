import { EventType } from '@notifee/react-native';
import type { Event } from '@notifee/react-native';
import { handleDailyVerseReminderDelivered } from '../../features/home/dailyVerseNotificationService';
import {
  handlePlanReminderDelivered,
  isPlanNotificationsEnabled,
} from '../../features/ReadingPlan/planNotificationService';

const PLAN_NOTIFICATION_ID = 'daily-reminder-';
const STREAK_RISK_NOTIFICATION_ID = 'streak-risk-';

export async function notifeeBackgroundEventHandler(event: Event) {
  const { type, detail } = event;

  // Trigger notifications can fire when the app is closed. On Android this
  // handler runs as a Headless JS task.
  if (type === EventType.DELIVERED) {
    const notificationId = detail.notification?.id;
    const data = detail.notification?.data as
      | Record<string, string>
      | undefined;

    // Handle daily verse notification
    if (notificationId?.includes('daily-verse-reminder')) {
      await handleDailyVerseReminderDelivered(detail.notification as any);
      return;
    }

    // Handle reading plan daily reminder
    if (notificationId?.startsWith(PLAN_NOTIFICATION_ID)) {
      const enabled = await isPlanNotificationsEnabled();
      if (enabled) {
        await handlePlanReminderDelivered(detail.notification as any);
      }
      return;
    }

    // Handle streak at-risk reminder
    if (notificationId?.startsWith(STREAK_RISK_NOTIFICATION_ID)) {
      const enabled = await isPlanNotificationsEnabled();
      if (enabled) {
        await handlePlanReminderDelivered(detail.notification as any);
      }
      return;
    }
  }
}
