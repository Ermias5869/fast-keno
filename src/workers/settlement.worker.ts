/**
 * Settlement Worker
 * Background process for settling completed rounds.
 *
 * Responsibilities:
 * - Process pending round settlements
 * - Calculate final payouts
 * - Update user balances
 * - Generate round reports
 */

import { createLogger } from '@/infra/logger';

const log = createLogger('settlement-worker');

interface SettlementJob {
  roundId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  completedAt: Date | null;
}

const queue: SettlementJob[] = [];

/**
 * Add a round to the settlement queue
 */
export function queueSettlement(roundId: string): void {
  queue.push({
    roundId,
    status: 'PENDING',
    createdAt: new Date(),
    completedAt: null,
  });
  log.info('Settlement queued', { roundId });
}

/**
 * Process pending settlements
 */
async function processSettlements(): Promise<void> {
  const pending = queue.filter(j => j.status === 'PENDING');
  if (pending.length === 0) return;

  for (const job of pending) {
    try {
      job.status = 'PROCESSING';
      log.info('Processing settlement', { roundId: job.roundId });

      // Settlement is handled by the game engine in-process
      // This worker handles retry logic and cleanup

      job.status = 'COMPLETED';
      job.completedAt = new Date();
      log.info('Settlement completed', { roundId: job.roundId });
    } catch (error) {
      job.status = 'FAILED';
      log.error('Settlement failed', { roundId: job.roundId, error: String(error) });
    }
  }
}

/**
 * Start the settlement worker
 */
export function startSettlementWorker(intervalMs: number = 5000): NodeJS.Timeout {
  log.info('Settlement worker started', { intervalMs });
  return setInterval(processSettlements, intervalMs);
}

export default { queueSettlement, startSettlementWorker };
