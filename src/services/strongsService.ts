import { api, GenericResponse, sendPostRequest } from './api';

export interface StrongsWordData {
  wordOrder: number;
  surfaceText: string;
  strongsId: string | null;
  lemma: string | null;
  morphology: string | null;
  hasData: boolean;
  verseNumber?: number;
  strongs: StrongsEntry | null;
}

export interface StrongsEntry {
  strongsId: string;
  originalWord: string | null;
  transliteration: string | null;
  shortDefinition: string;
  fullDefinition: string | null;
  language: string;
  partOfSpeech: string | null;
  grammaticalCase: string | null;
  gender: string | null;
  number: string | null;
  usageCount: number | null;
  crossReferences: string | null;
}

export interface StrongsVerseRef {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  wordOrder: number;
  reference: string;
}

export const getStrongsEntry = async (
  strongsId: string,
): Promise<GenericResponse<StrongsEntry>> => {
  try {
    const response = await api.get<GenericResponse<StrongsEntry>>(
      `/strongs/${strongsId}`,
    );
    if (response.data?.returnCode === 200 && response.data?.returnData) {
      const { cacheStrongsEntry } = await import('./strongsCache');
      cacheStrongsEntry(response.data.returnData);
    }
    return response.data;
  } catch {
    const { getCachedStrongsEntry } = await import('./strongsCache');
    const cached = await getCachedStrongsEntry(strongsId);
    if (cached) {
      return {
        returnCode: 200,
        returnMessage: 'Loaded from cache',
        returnData: cached,
      };
    }
    throw new Error('Offline and no cached Strongs entry');
  }
};

export const getVersesByStrongs = async (
  strongsId: string,
  translation?: string,
  limit?: number,
): Promise<GenericResponse<StrongsVerseRef[]>> => {
  const params: any = {};
  if (translation) params.translation = translation;
  if (limit) params.limit = limit;
  const response = await api.get<GenericResponse<StrongsVerseRef[]>>(
    `/strongs/${strongsId}/verses`,
    { params },
  );
  console.log('getVersesByStrongs response:', JSON.stringify(response));
  return response.data;
};

export const getVerseWords = async (
  bookName: string,
  chapter: number,
  verseNumber?: number,
  translation?: string,
): Promise<GenericResponse<StrongsWordData[]>> => {
  try {
    const res = await sendPostRequest<StrongsWordData[]>('strongs', 'verse-words', {
      bookName,
      chapter,
      ...(verseNumber != null ? { verseNumber } : {}),
      translation: translation || 'Berean',
    });
    if (res.returnCode === 200 && res.returnData) {
      const { cacheVerseWords } = await import('./strongsCache');
      cacheVerseWords(bookName, chapter, verseNumber, res.returnData);
    }
    return res;
  } catch {
    const { getCachedVerseWords } = await import('./strongsCache');
    const cached = await getCachedVerseWords(bookName, chapter, verseNumber);
    if (cached) {
      return {
        returnCode: 200,
        returnMessage: 'Loaded from cache',
        returnData: cached,
      };
    }
    throw new Error('Offline and no cached verse words');
  }
};
