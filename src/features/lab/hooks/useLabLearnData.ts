import { useEffect, useState } from 'react';
import { BookPrologue, getBookPrologue } from '../../../services/bookProloguesApi';
import { getVerseResources, VerseResourceData } from '../../../services/verseResourcesApi';
import { getVerseWords, StrongsWordData } from '../../../services/strongsService';

interface UseLabLearnDataArgs {
  stage: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  translationId: string;
  setVerseWords: (words: StrongsWordData[]) => void;
}

export function useLabLearnData({
  stage,
  bookName,
  chapter,
  verseStart,
  translationId,
  setVerseWords,
}: UseLabLearnDataArgs) {
  const [learnDataLoading, setLearnDataLoading] = useState(false);
  const [verseResources, setVerseResources] = useState<VerseResourceData | null>(null);
  const [bookPrologue, setBookPrologue] = useState<BookPrologue | null>(null);

  useEffect(() => {
    if (stage !== 'learn' || !bookName || !chapter) return;
    const fetchLearnData = async () => {
      setLearnDataLoading(true);
      const ch = parseInt(chapter, 10);
      const vs = parseInt(verseStart || '1', 10);
      try {
        const [wordsRes, resourcesRes, prologueRes] = await Promise.allSettled([
          getVerseWords(bookName, ch, vs, translationId),
          getVerseResources(bookName, ch, vs),
          getBookPrologue(bookName),
        ]);
        if (wordsRes.status === 'fulfilled' && wordsRes.value?.returnData) {
          setVerseWords(wordsRes.value.returnData);
        }
        if (resourcesRes.status === 'fulfilled' && resourcesRes.value?.returnData) {
          setVerseResources(resourcesRes.value.returnData);
        }
        if (prologueRes.status === 'fulfilled') setBookPrologue(prologueRes.value);

        if (
          vs > 1 &&
          wordsRes.status === 'fulfilled' &&
          (!wordsRes.value?.returnData || wordsRes.value.returnData.length === 0)
        ) {
          const fallbackRes = await getVerseWords(bookName, ch, undefined, translationId);
          if (fallbackRes?.returnData) setVerseWords(fallbackRes.returnData);
        }
      } catch (e) {
        console.error('Failed to fetch Learn data:', e);
      } finally {
        setLearnDataLoading(false);
      }
    };

    fetchLearnData();
  }, [bookName, chapter, setVerseWords, stage, translationId, verseStart]);

  return {
    learnDataLoading,
    verseResources,
    setVerseResources,
    bookPrologue,
    setBookPrologue,
  };
}
