import { useEffect, useState } from 'react';
import { bibleApi } from '../../../services/bibleApi';

export interface LabPassageVerse {
  verseNumber: number;
  text: string;
}

interface UseLabPassageDataArgs {
  translationId: string;
  bookName: string;
  chapter: string;
  verseStart: string;
  verseEnd: string;
  stage: string;
}

export function useLabPassageData({
  translationId,
  bookName,
  chapter,
  verseStart,
  verseEnd,
  stage,
}: UseLabPassageDataArgs) {
  const [availableVerses, setAvailableVerses] = useState<number[]>([]);
  const [availableVersesLoading, setAvailableVersesLoading] = useState(false);
  const [passageVerses, setPassageVerses] = useState<LabPassageVerse[]>([]);
  const [passageVersesLoading, setPassageVersesLoading] = useState(false);

  useEffect(() => {
    if (!bookName || !chapter || stage !== 'passage') return;
    const fetchAvailableVerses = async () => {
      setAvailableVersesLoading(true);
      try {
        const chapterData = await bibleApi.getVerses(
          translationId,
          bookName,
          parseInt(chapter, 10),
        );
        setAvailableVerses(
          chapterData?.verses?.map(v => v.verseNumber).filter(Boolean) || [],
        );
      } catch (e) {
        console.error('Failed to fetch selectable verses:', e);
        setAvailableVerses([]);
      } finally {
        setAvailableVersesLoading(false);
      }
    };

    fetchAvailableVerses();
  }, [bookName, chapter, stage, translationId]);

  useEffect(() => {
    if (!bookName || !chapter || !verseStart) return;
    const fetchPassage = async () => {
      setPassageVersesLoading(true);
      try {
        const ch = parseInt(chapter, 10);
        const vs = parseInt(verseStart || '1', 10);
        const ve = verseEnd ? parseInt(verseEnd, 10) : vs;
        const chapterData = await bibleApi.getVerses(translationId, bookName, ch);
        if (chapterData?.verses?.length) {
          setPassageVerses(
            chapterData.verses.filter(v =>
              ve > vs
                ? v.verseNumber >= vs && v.verseNumber <= ve
                : v.verseNumber >= vs,
            ),
          );
        } else {
          setPassageVerses([]);
        }
      } catch (e) {
        console.error('Failed to fetch passage verses:', e);
        setPassageVerses([]);
      } finally {
        setPassageVersesLoading(false);
      }
    };

    fetchPassage();
  }, [bookName, chapter, translationId, verseEnd, verseStart]);

  return {
    availableVerses,
    availableVersesLoading,
    passageVerses,
    passageVersesLoading,
    setAvailableVerses,
    setPassageVerses,
  };
}
