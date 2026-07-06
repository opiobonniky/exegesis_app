import { useEffect } from 'react';
import { getVerseWords, StrongsWordData } from '../../../services/strongsService';

interface UseLabLookStrongsArgs {
  stage: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  verseEnd: string;
  translationId: string;
  setVerseWords: (words: StrongsWordData[]) => void;
}

export function useLabLookStrongs({
  stage,
  bookName,
  chapter,
  verseStart,
  verseEnd,
  translationId,
  setVerseWords,
}: UseLabLookStrongsArgs) {
  useEffect(() => {
    if (stage !== 'look' || !bookName || !chapter || !verseStart) return;
    const fetchLookStrongsWords = async () => {
      try {
        const ch = parseInt(chapter, 10);
        const start = parseInt(verseStart, 10);
        const end = verseEnd ? parseInt(verseEnd, 10) : start;
        const verseNumbers = Array.from(
          { length: Math.max(1, end - start + 1) },
          (_, i) => start + i,
        );
        const results = await Promise.allSettled(
          verseNumbers.map(verseNumber =>
            getVerseWords(bookName, ch, verseNumber, translationId),
          ),
        );
        setVerseWords(
          results.flatMap((result, index) => {
            if (result.status !== 'fulfilled') return [];
            return (result.value?.returnData || []).map(word => ({
              ...word,
              verseNumber: word.verseNumber || verseNumbers[index],
            }));
          }),
        );
      } catch (e) {
        console.error('Failed to fetch Look Strong words:', e);
      }
    };

    fetchLookStrongsWords();
  }, [bookName, chapter, setVerseWords, stage, translationId, verseEnd, verseStart]);
}
