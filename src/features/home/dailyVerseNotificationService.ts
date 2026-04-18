import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AlarmType,
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { requestNotifeePermission } from '../../utilits/firebaseService';
import { route } from '../../component/navigations/routes';
import { connectSocket, getSocket } from '../../services/socket/socketClient';
import { sendPostRequest } from '../../services/api';
import { getVerseText } from '../../utilits/bibleUtils';
import {
  getLocalISODate,
  normalizeDailyVerse,
  saveDailyVerseCache,
  loadDailyVerseCache,
} from './dailyVerseCache';

const STORAGE_KEYS = {
  enabled: 'daily_verse_notif_enabled',
  hour: 'daily_verse_notif_hour',
  minute: 'daily_verse_notif_minute',
};

// Note: Android channel settings (sound/importance) can't be updated once
// created, so we version the id to ensure new installs get sound enabled.
export const DAILY_VERSE_CHANNEL_ID = 'daily-verse-v2';
export const DAILY_VERSE_NOTIFICATION_ID = 'daily-verse-reminder';
export const DAILY_VERSE_RICH_NOTIFICATION_ID_PREFIX = 'daily-verse-rich-';

const DEFAULT_TIME = { hour: 9, minute: 0 };

let inAppTimer: ReturnType<typeof setTimeout> | null = null;

const todayAt = (hour: number, minute: number) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

const nextOccurrenceAt = (hour: number, minute: number): Date => {
  const fireAt = todayAt(hour, minute);
  if (fireAt.getTime() <= Date.now()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }
  return fireAt;
};

async function getReminderTime(): Promise<{ hour: number; minute: number }> {
  const [hStr, mStr] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.hour),
    AsyncStorage.getItem(STORAGE_KEYS.minute),
  ]);

  const hour = hStr ? parseInt(hStr, 10) : DEFAULT_TIME.hour;
  const minute = mStr ? parseInt(mStr, 10) : DEFAULT_TIME.minute;

  return {
    hour: Number.isFinite(hour)
      ? Math.max(0, Math.min(23, hour))
      : DEFAULT_TIME.hour,
    minute: Number.isFinite(minute)
      ? Math.max(0, Math.min(59, minute))
      : DEFAULT_TIME.minute,
  };
}

export async function getDailyVerseReminderTimeSetting(): Promise<{
  hour: number;
  minute: number;
}> {
  return getReminderTime();
}

export async function setDailyVerseReminderTime(
  hour: number,
  minute: number,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.hour, String(hour));
  await AsyncStorage.setItem(STORAGE_KEYS.minute, String(minute));
  const enabled = await isDailyVerseReminderEnabled();
  if (enabled) {
    await scheduleDailyVerseReminder();
  }
}

export async function setDailyVerseReminderEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.enabled, enabled ? '1' : '0');
  if (!enabled) {
    await cancelDailyVerseReminder();
  } else {
    await scheduleDailyVerseReminder();
  }
}

export async function isDailyVerseReminderEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.enabled);
  return v === null ? true : v === '1';
}

export async function ensureDailyVerseChannel(): Promise<string> {
  return await notifee.createChannel({
    id: DAILY_VERSE_CHANNEL_ID,
    name: 'Verse of the Day',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

type DailyVerse = {
  bookName: string;
  chapter: number;
  verseNumber: number;
  text: string;
};

async function fetchDailyVerseRest(): Promise<DailyVerse | null> {
  try {
    const res = await sendPostRequest('bible', 'get-todays-verse', {});
    if (res?.returnCode !== 200 || !res?.returnData) return null;

    const verse = res.returnData as any;
    const text =
      getVerseText(verse.bookName, verse.chapter, verse.verseNumber) ??
      `${verse.bookName} ${verse.chapter}:${verse.verseNumber}`;

    return {
      bookName: String(verse.bookName),
      chapter: Number(verse.chapter),
      verseNumber: Number(verse.verseNumber),
      text,
    };
  } catch {
    return null;
  }
}

async function fetchDailyVerseSocket(
  timeoutMs = 6000,
): Promise<DailyVerse | null> {
  try {
    await connectSocket({ topics: ['daily-verse'] });
    const s = getSocket();
    if (!s) return null;

    return await new Promise(resolve => {
      const timer = setTimeout(() => {
        s.off('bible:daily-verse', onVerse);
        resolve(null);
      }, timeoutMs);

      const onVerse = (payload: any) => {
        clearTimeout(timer);
        s.off('bible:daily-verse', onVerse);

        const bookName =
          payload?.bookName ?? payload?.book ?? payload?.ref?.bookName;
        const chapter = Number(payload?.chapter ?? payload?.ref?.chapter);
        const verseNumber = Number(
          payload?.verseNumber ?? payload?.ref?.verseNumber,
        );

        if (
          !bookName ||
          !Number.isFinite(chapter) ||
          !Number.isFinite(verseNumber)
        ) {
          resolve(null);
          return;
        }

        const text =
          payload?.text ??
          getVerseText(bookName, chapter, verseNumber) ??
          `${bookName} ${chapter}:${verseNumber}`;

        resolve({
          bookName: String(bookName),
          chapter,
          verseNumber,
          text: String(text),
        });
      };

      s.on('bible:daily-verse', onVerse);
      s.emit('bible:get-daily-verse');
    });
  } catch {
    return null;
  }
}

async function notifyDailyVerse(verse: DailyVerse): Promise<void> {
  const channelId = await ensureDailyVerseChannel();
  const ref = `${verse.bookName} ${verse.chapter}:${verse.verseNumber}`;
  const id = `${DAILY_VERSE_RICH_NOTIFICATION_ID_PREFIX}${getLocalISODate()}`;

  await notifee.displayNotification({
    id,
    title: 'Verse of the Day',
    body: `${verse.text}\n— ${ref}`,
    data: { screen: route.home, kind: 'daily-verse-rich', ref },
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
}

async function notifyDefaultReminder(): Promise<void> {
  const channelId = await ensureDailyVerseChannel();

  await notifee.displayNotification({
    title: 'Verse of the Day',
    body: "Please open Exegesis to read today's verse and reflection.",
    data: { screen: route.home, kind: 'daily-verse-reminder' },
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
}

async function cacheVerseForToday(
  verse: DailyVerse,
  source: 'socket' | 'rest' | 'push',
) {
  const date = getLocalISODate();
  const cached = normalizeDailyVerse(
    {
      bookName: verse.bookName,
      chapter: verse.chapter,
      verseNumber: verse.verseNumber,
      text: verse.text,
    },
    date,
    source,
  );
  if (!cached) return;
  await saveDailyVerseCache(cached);
}

async function catchUpCacheIfMissed(hour: number, minute: number) {
  // If we're already past the reminder time today and the cache is empty,
  // fetch once so Home can render instantly later.
  const fireAtToday = todayAt(hour, minute);
  if (fireAtToday.getTime() > Date.now()) return;

  const date = getLocalISODate();
  const existing = await loadDailyVerseCache(date);
  if (existing) return;

  const socketVerse = await fetchDailyVerseSocket();
  if (socketVerse) {
    await cacheVerseForToday(socketVerse, 'socket');
    return;
  }

  const restVerse = await fetchDailyVerseRest();
  if (restVerse) await cacheVerseForToday(restVerse, 'rest');
}

function armInAppDailyVerseFetch(hour: number, minute: number) {
  if (inAppTimer) clearTimeout(inAppTimer);

  const fireAt = nextOccurrenceAt(hour, minute);
  const ms = Math.max(1000, fireAt.getTime() - Date.now());

  inAppTimer = setTimeout(() => {
    (async () => {
      const enabled = await isDailyVerseReminderEnabled();
      if (!enabled) return;

      const hasPermission = await requestNotifeePermission();
      if (!hasPermission) return;

      const socketVerse = await fetchDailyVerseSocket();
      if (socketVerse) {
        await cacheVerseForToday(socketVerse, 'socket');
        await notifyDailyVerse(socketVerse);
        return;
      }

      const restVerse = await fetchDailyVerseRest();
      if (restVerse) {
        await cacheVerseForToday(restVerse, 'rest');
        await notifyDailyVerse(restVerse);
      }
    })()
      .catch(err =>
        console.error('❌ dailyVerseNotif: in-app fetch failed', err),
      )
      .finally(() => {
        // Re-arm for the next day while the JS runtime is alive.
        armInAppDailyVerseFetch(hour, minute);
      });
  }, ms);
}
export async function scheduleDailyVerseReminder(): Promise<void> {
  try {
    const enabled = await isDailyVerseReminderEnabled();
    if (!enabled) return;

    const hasPermission = await requestNotifeePermission();
    if (!hasPermission) return;

    const channelId = await ensureDailyVerseChannel();
    const { hour, minute } = await getReminderTime();

    // Replace any existing schedule with the same id
    await notifee.cancelNotification(DAILY_VERSE_NOTIFICATION_ID);

    const baseNotification = {
      id: DAILY_VERSE_NOTIFICATION_ID,
      title: 'Verse of the Day',
      body: "Open Exegesis to read today's verse and reflection.",
      data: { screen: route.home, kind: 'daily-verse-reminder' },
      ...(Platform.OS === 'android'
        ? {
            android: {
              channelId,
              smallIcon: 'ic_launcher',
              pressAction: { id: 'default' },
              sound: 'default',
            },
          }
        : {}),
      ...(Platform.OS === 'ios'
        ? {
            ios: {
              sound: 'default',
            },
          }
        : {}),
    } as const;

    const timestamp = nextOccurrenceAt(hour, minute).getTime();

    // Android: Use AlarmManager to fire at the correct time even in Doze.
    // If it fails (OEM restrictions / permissions), fall back to WorkManager.
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
          baseNotification as any,
          trigger,
        );
        scheduled = true;
        break;
      } catch (e) {
        // Try next strategy
        console.warn('dailyVerseNotif: trigger schedule failed', e);
      }
    }
    if (!scheduled) {
      console.warn('dailyVerseNotif: failed to schedule any trigger');
      return;
    }

    // If the app is running at the reminder time, fetch the daily verse over
    // websocket and show a rich notification (with sound + verse text).
    armInAppDailyVerseFetch(hour, minute);

    // If the user opens the app after the reminder time, still populate cache.
    await catchUpCacheIfMissed(hour, minute);
  } catch (err) {
    console.error('❌ dailyVerseNotif: scheduleDailyVerseReminder', err);
  }
}

export async function cancelDailyVerseReminder(): Promise<void> {
  try {
    await notifee.cancelNotification(DAILY_VERSE_NOTIFICATION_ID);
    if (inAppTimer) clearTimeout(inAppTimer);
    inAppTimer = null;
  } catch (err) {
    console.error('❌ dailyVerseNotif: cancelDailyVerseReminder', err);
  }
}

export function attachDailyVerseNotifHandlers(
  navigate: (screen: string, params?: Record<string, any>) => void,
): void {
  const handler = (data: Record<string, string> | undefined) => {
    if (!data?.screen) return;
    if (
      data.kind !== 'daily-verse-reminder' &&
      data.kind !== 'daily-verse-rich'
    )
      return;
    navigate(data.screen);
  };

  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handler(detail.notification?.data as Record<string, string> | undefined);
    }
  });
}

export async function handleDailyVerseReminderDelivered(
  notification?: { id?: string; data?: Record<string, any> } | null,
): Promise<void> {
  try {
    const id = notification?.id;
    const kind = notification?.data?.kind;

    if (id !== DAILY_VERSE_NOTIFICATION_ID) return;
    if (kind !== 'daily-verse-reminder') return;

    const enabled = await isDailyVerseReminderEnabled();
    if (!enabled) return;

    const date = getLocalISODate();
    const existing = await loadDailyVerseCache(date);

    let verse: DailyVerse | null = null;

    // Priority: cache > REST > socket
    // Note: socket likely won't work in headless (app closed), so prioritize REST
    if (existing?.text) {
      verse = {
        bookName: existing.bookName,
        chapter: existing.chapter,
        verseNumber: existing.verseNumber,
        text: existing.text,
      };
    } else {
      const restVerse = await fetchDailyVerseRest();
      if (restVerse) {
        verse = restVerse;
        await cacheVerseForToday(verse, 'rest');
      } else {
        const socketVerse = await fetchDailyVerseSocket();
        if (socketVerse) {
          verse = socketVerse;
          await cacheVerseForToday(verse, 'socket');
        }
      }
    }

    if (verse) {
      await notifyDailyVerse(verse);
    } else {
      await notifyDefaultReminder();
    }

    await notifee.cancelDisplayedNotification(DAILY_VERSE_NOTIFICATION_ID);
  } catch (e) {
    console.error('❌ dailyVerseNotif: delivered handler failed', e);
  }
}
