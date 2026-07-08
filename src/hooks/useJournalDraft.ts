import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DraftData {
  title: string;
  content: string;
  category: string;
  mood: string;
  prayers: string;
  gratitude: string;
  learnings: string;
  application: string;
  bookName: string;
  chapter: string;
  verseNumber: string;
  tags: string;
  isPublished: boolean;
  savedAt: string;
}

const DRAFT_PREFIX = 'journal_draft_';

/**
 * Hook for auto-saving journal entry drafts locally.
 * Saves form state to AsyncStorage with debounce.
 * Restores draft on mount if one exists.
 * Clears draft on successful save.
 */
export const useJournalDraft = (
  draftKey: string,
  formState: Record<string, any>,
  isEditMode: boolean,
) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${DRAFT_PREFIX}${draftKey}`;

  // Save draft with debounce
  const saveDraft = useCallback(
    (data: Record<string, any>) => {
      if (isEditMode) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const draft: DraftData = {
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'general',
          mood: data.mood || '',
          prayers: data.prayers || '',
          gratitude: data.gratitude || '',
          learnings: data.learnings || '',
          application: data.application || '',
          bookName: data.bookName || '',
          chapter: data.chapter || '',
          verseNumber: data.verseNumber || '',
          tags: data.tags || '',
          isPublished: data.isPublished ?? true,
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(draft));
      }, 2000);
    },
    [key, isEditMode],
  );

  // Load draft on mount
  useEffect(() => {
    if (isEditMode) return;
    (async () => {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        setHasDraft(true);
      }
    })();
  }, [key, isEditMode]);

  // Auto-save form state changes
  useEffect(() => {
    if (isEditMode) return;
    saveDraft(formState);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formState, saveDraft, isEditMode]);

  // Restore draft and return the data
  const restoreDraft = useCallback(async (): Promise<DraftData | null> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as DraftData;
      setHasDraft(false);
      setDraftRestored(true);
      return data;
    } catch {
      return null;
    }
  }, [key]);

  // Clear draft after successful save
  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  return { hasDraft, draftRestored, restoreDraft, clearDraft };
};
