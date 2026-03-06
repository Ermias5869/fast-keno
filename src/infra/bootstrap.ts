/**
 * Bootstrap — Server startup initialization.
 *
 * Starts background services when the backend comes up:
 *   1. Telegram Bot (polling)
 *   2. Risk worker
 *   3. Settlement worker
 *
 * This module is imported by the instrumentation hook so it runs
 * once when the Next.js server starts.
 */

import { createLogger } from '@/infra/logger';

const log = createLogger('bootstrap');

let initialized = false;

export async function bootstrap(): Promise<void> {
  if (initialized) return;
  initialized = true;

  log.info('Bootstrapping SyntaxKeno services...');

  // ── Start Telegram Bot ──────────────────────────────────
  try {
    const { startTelegramBot } = await import('@/services/telegram-bot/telegramBot');
    startTelegramBot();
  } catch (err) {
    log.error('Failed to start Telegram bot', { error: String(err) });
  }

  // ── Start Risk Worker ───────────────────────────────────
  try {
    const { startRiskWorker } = await import('@/workers/risk.worker');
    startRiskWorker(10000);
  } catch (err) {
    log.error('Failed to start risk worker', { error: String(err) });
  }

  // ── Start Settlement Worker ─────────────────────────────
  try {
    const { startSettlementWorker } = await import('@/workers/settlement.worker');
    startSettlementWorker(5000);
  } catch (err) {
    log.error('Failed to start settlement worker', { error: String(err) });
  }

  log.info('All services bootstrapped ✓');
}

export default bootstrap;
