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
  const response = await api.get<GenericResponse<StrongsEntry>>(
    `/strongs/${strongsId}`,
  );
  return response.data;
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
  return sendPostRequest('strongs', 'verse-words', {
    bookName,
    chapter,
    ...(verseNumber != null ? { verseNumber } : {}),
    translation: translation || 'Berean',
  });
};
