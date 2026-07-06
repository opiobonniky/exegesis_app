import { useCallback, useState } from 'react';
import {
  getStrongsEntry,
  StrongsEntry,
  StrongsWordData,
} from '../../../services/strongsService';

export function useStrongsWordModal() {
  const [selectedWord, setSelectedWord] = useState<StrongsWordData | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const openWord = useCallback(async (word: StrongsWordData) => {
    setSelectedWord(word);
    setSelectedEntry(null);
    setVisible(true);
    setLoading(true);

    try {
      if (word.strongsId && word.hasData) {
        const res = await getStrongsEntry(word.strongsId);
        if (res?.returnData) setSelectedEntry(res.returnData);
      }
    } catch (e) {
      console.error('Failed to fetch Strongs entry:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedWord(null);
    setSelectedEntry(null);
    setVisible(false);
  }, []);

  return {
    selectedWord,
    selectedEntry,
    loading,
    visible,
    openWord,
    close,
    clearSelection,
  };
}
