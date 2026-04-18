import AsyncStorage from '@react-native-async-storage/async-storage';

export type DailyVerseCached = {
  date: string; // YYYY-MM-DD (device local date)
  bookName: string;
  chapter: number;
  verseNumber: number;
  text: string;
  fetchedAt: number; // epoch ms
  source: 'socket' | 'rest' | 'push' | 'unknown';
};

const STORAGE_KEYS = {
  latest: 'daily_verse_cache_latest',
};

const REMINDER_KEYS = {
  hour: 'daily_verse_notif_hour',
  minute: 'daily_verse_notif_minute',
};

const DEFAULT_REMINDER_TIME = { hour: 7, minute: 0 };

const keyForDate = (date: string) => `daily_verse_cache_${date}`;

export const getLocalISODate = (d = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export async function getDailyVerseReminderTime(): Promise<{
  hour: number;
  minute: number;
}> {
  const [hStr, mStr] = await Promise.all([
    AsyncStorage.getItem(REMINDER_KEYS.hour),
    AsyncStorage.getItem(REMINDER_KEYS.minute),
  ]);

  const hour = hStr ? parseInt(hStr, 10) : DEFAULT_REMINDER_TIME.hour;
  const minute = mStr ? parseInt(mStr, 10) : DEFAULT_REMINDER_TIME.minute;

  return {
    hour: Number.isFinite(hour)
      ? Math.max(0, Math.min(23, hour))
      : DEFAULT_REMINDER_TIME.hour,
    minute: Number.isFinite(minute)
      ? Math.max(0, Math.min(59, minute))
      : DEFAULT_REMINDER_TIME.minute,
  };
}

export const todayAt = (hour: number, minute: number, now = new Date()) => {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  return d;
};

export async function isDailyVerseTimeReached(now = new Date()): Promise<boolean> {
  const { hour, minute } = await getDailyVerseReminderTime();
  return now.getTime() >= todayAt(hour, minute, now).getTime();
}

export async function msUntilDailyVerseTime(now = new Date()): Promise<number> {
  const { hour, minute } = await getDailyVerseReminderTime();
  const t = todayAt(hour, minute, now).getTime();
  return Math.max(0, t - now.getTime());
}

export const normalizeDailyVerse = (
  payload: any,
  date = getLocalISODate(),
  source: DailyVerseCached['source'] = 'unknown',
): DailyVerseCached | null => {
  const bookName = payload?.bookName ?? payload?.book;
  const chapter = Number(payload?.chapter);
  const verseNumber = Number(payload?.verseNumber);
  const text = payload?.text;

  if (!bookName || !Number.isFinite(chapter) || !Number.isFinite(verseNumber)) {
    return null;
  }

  return {
    date,
    bookName: String(bookName),
    chapter,
    verseNumber,
    text: typeof text === 'string' ? text : '',
    fetchedAt: Date.now(),
    source,
  };
};

export async function saveDailyVerseCache(v: DailyVerseCached): Promise<void> {
  const raw = JSON.stringify(v);
  await AsyncStorage.multiSet([
    [keyForDate(v.date), raw],
    [STORAGE_KEYS.latest, raw],
  ]);
}

export async function loadDailyVerseCache(
  date = getLocalISODate(),
): Promise<DailyVerseCached | null> {
  const raw = await AsyncStorage.getItem(keyForDate(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyVerseCached;
  } catch {
    return null;
  }
}

export async function loadLatestDailyVerseCache(): Promise<DailyVerseCached | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.latest);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyVerseCached;
  } catch {
    return null;
  }
}
