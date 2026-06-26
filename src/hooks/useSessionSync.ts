/**
 * useSessionSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable hook to sync a journal entry ID back to an Exegesis Lab session.
 * Used when a journal entry is created from a LabFlowScreen study — the session
 * gets updated with the created entry's ID so the Lab knows the study is saved.
 */

import { useCallback, useState } from 'react';
import { sendPostRequest } from '../services/api';

interface UseSessionSyncOptions {
  sessionId?: string | null;
}

interface UseSessionSyncReturn {
  /** Whether a session sync is currently in progress */
  syncing: boolean;
  /**
   * Update the session with the newly created journal entry's ID.
   * Call this after successfully creating a journal entry.
   * @param journalEntryId - The ID of the created journal entry
   */
  syncJournalEntry: (journalEntryId: number) => Promise<void>;
}

/**
 * Hook that provides a function to sync a journal entry ID back to
 * an Exegesis Lab session. Only active when `sessionId` is provided.
 *
 * @example
 * ```tsx
 * const { syncing, syncJournalEntry } = useSessionSync({
 *   sessionId: routeParams?.params?.sessionId,
 * });
 *
 * // After creating a journal entry:
 * if (res.returnCode === 200 && res.returnData?.id) {
 *   await syncJournalEntry(res.returnData.id);
 * }
 * ```
 */
export const useSessionSync = ({
  sessionId,
}: UseSessionSyncOptions = {}): UseSessionSyncReturn => {
  const [syncing, setSyncing] = useState(false);

  const syncJournalEntry = useCallback(
    async (journalEntryId: number) => {
      if (!sessionId) return;
      setSyncing(true);
      try {
        await sendPostRequest('exegesis', `${sessionId}/progress`, {
          journalEntryId,
          completed: true,
        });
      } catch (e: any) {
        console.error('Failed to update session with journalEntryId:', e);
      } finally {
        setSyncing(false);
      }
    },
    [sessionId],
  );

  return { syncing, syncJournalEntry };
};
