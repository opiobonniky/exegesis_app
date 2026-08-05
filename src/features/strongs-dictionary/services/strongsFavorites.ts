import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StrongsWordEntry } from './strongsDictionaryApi';

const WORDS_KEY = '@strongs:favorite-words';
const VERSES_KEY = '@strongs:favorite-verses';

export interface SavedVerse {
  bookName: string;
  chapter: number;
  verse: number;
}

export const getFavoriteWords = async (): Promise<StrongsWordEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(WORDS_KEY);
    return raw ? (JSON.parse(raw) as StrongsWordEntry[]) : [];
  } catch {
    return [];
  }
};

export const saveFavoriteWord = async (
  entry: StrongsWordEntry,
): Promise<boolean> => {
  try {
    const list = await getFavoriteWords();
    if (list.some(w => w.strongsId === entry.strongsId)) return false;
    const next = [entry, ...list];
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const removeFavoriteWord = async (strongsId: string): Promise<void> => {
  try {
    const list = await getFavoriteWords();
    await AsyncStorage.setItem(
      WORDS_KEY,
      JSON.stringify(list.filter(w => w.strongsId !== strongsId)),
    );
  } catch {}
};

export const getFavoriteVerses = async (): Promise<SavedVerse[]> => {
  try {
    const raw = await AsyncStorage.getItem(VERSES_KEY);
    return raw ? (JSON.parse(raw) as SavedVerse[]) : [];
  } catch {
    return [];
  }
};

export const isFavoriteVerse = async (
  bookName: string,
  chapter: number,
  verse: number,
): Promise<boolean> => {
  const list = await getFavoriteVerses();
  return list.some(
    v => v.bookName === bookName && v.chapter === chapter && v.verse === verse,
  );
};

export const toggleFavoriteVerse = async (
  bookName: string,
  chapter: number,
  verse: number,
): Promise<boolean> => {
  try {
    const list = await getFavoriteVerses();
    const exists = list.some(
      v => v.bookName === bookName && v.chapter === chapter && v.verse === verse,
    );
    const next = exists
      ? list.filter(
          v =>
            !(
              v.bookName === bookName &&
              v.chapter === chapter &&
              v.verse === verse
            ),
        )
      : [{ bookName, chapter, verse }, ...list];
    await AsyncStorage.setItem(VERSES_KEY, JSON.stringify(next));
    return !exists;
  } catch {
    return false;
  }
};
