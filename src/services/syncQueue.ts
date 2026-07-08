import { run, queryAll, queryFirst } from '../db/database';

interface QueueItem {
  id: string;
  type: string;
  payload: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
}

const MAX_RETRIES = 5;

/**
 * Enqueue a failed mutation to the offline queue.
 */
export async function enqueueMutation(
  controller: string,
  request: string,
  data: object,
): Promise<void> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const type = `${controller}/${request}`;
  await run(
    `INSERT OR REPLACE INTO offline_queue (id, type, payload, status)
     VALUES (?, ?, ?, 'pending')`,
    [id, type, JSON.stringify(data)],
  );
}

/**
 * Process all pending items in the offline queue.
 * Called automatically when connectivity is restored.
 */
export async function processQueue(): Promise<void> {
  const items = await queryAll<QueueItem>(
    `SELECT * FROM offline_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT 50`,
  );

  if (items.length === 0) return;

  for (const item of items) {
    await run(
      `UPDATE offline_queue SET status = 'in_progress' WHERE id = ?`,
      [item.id],
    );

    try {
      const [controller, ...requestParts] = item.type.split('/');
      const request = requestParts.join('/');
      const { sendPostRequest } = await import('./api');
      const payload = JSON.parse(item.payload);

      const res = await sendPostRequest(controller, request, payload, true);

      if (res.returnCode === 200 || res.returnCode === 201) {
        await run(`DELETE FROM offline_queue WHERE id = ?`, [item.id]);
      } else {
        throw new Error(res.returnMessage || 'Sync failed');
      }
    } catch (error: any) {
      const newRetryCount = item.retry_count + 1;
      const errorMsg = error?.message || 'Unknown error';

      if (newRetryCount >= MAX_RETRIES) {
        await run(
          `UPDATE offline_queue
           SET status = 'failed', retry_count = ?, last_error = ?
           WHERE id = ?`,
          [newRetryCount, errorMsg, item.id],
        );
      } else {
        await run(
          `UPDATE offline_queue
           SET status = 'pending', retry_count = ?, last_error = ?
           WHERE id = ?`,
          [newRetryCount, errorMsg, item.id],
        );
      }
    }
  }
}

/**
 * Get the count of pending/failed queue items.
 */
export async function getQueueCount(): Promise<{ pending: number; failed: number }> {
  try {
    const pending = await queryFirst<{ count: number }>(
      `SELECT COUNT(*) AS count FROM offline_queue WHERE status = 'pending'`,
    );
    const failed = await queryFirst<{ count: number }>(
      `SELECT COUNT(*) AS count FROM offline_queue WHERE status = 'failed'`,
    );
    return {
      pending: pending?.count ?? 0,
      failed: failed?.count ?? 0,
    };
  } catch {
    return { pending: 0, failed: 0 };
  }
}
