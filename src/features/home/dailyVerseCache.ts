import { setDailyContent, getDailyContent } from '../../services/dbCache';

export type DailyVerseCached = {
  date: string; // YYYY-MM-DD (device local date)
  bookName: string;
  chapter: number;
  verseNumber: number;
  text: string;
  fetchedAt: number; // epoch ms
  source: 'socket' | 'rest' | 'push' | 'unknown';
};

const DEFAULT_REMINDER_TIME = { hour: 7, minute: 0 };

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
  const row = await getDailyContent<{ hour: number; minute: number }>('reminder_time', 'daily_verse');
  if (row) return row;
  return DEFAULT_REMINDER_TIME;
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
  await setDailyContent('daily_verse', v.date, v);
}

export async function loadDailyVerseCache(
  date = getLocalISODate(),
): Promise<DailyVerseCached | null> {
  return getDailyContent<DailyVerseCached>('daily_verse', date);
}

export async function loadLatestDailyVerseCache(): Promise<DailyVerseCached | null> {
  return loadDailyVerseCache();
}
