/**
 * Risk Worker
 * Background process for continuous risk monitoring and dynamic adjustments.
 *
 * Responsibilities:
 * - Monitor real-time exposure across all active rounds
 * - Adjust risk parameters based on bankroll health
 * - Alert on exposure anomalies
 * - Periodic risk recalculation
 */

import { getExposureState } from '@/services/risk-service';
import { createLogger } from '@/infra/logger';

const log = createLogger('risk-worker');

interface RiskAlert {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: Date;
  exposure: number;
}

const alerts: RiskAlert[] = [];

/**
 * Run risk monitoring cycle
 */
async function runRiskCheck(): Promise<void> {
  try {
    const exposure = await getExposureState();

    // Check exposure thresholds
    const ratio = exposure.currentExposure / exposure.maxAllowedExposure;

    if (ratio > 0.9) {
      const alert: RiskAlert = {
        level: 'CRITICAL',
        message: `Exposure at ${(ratio * 100).toFixed(1)}% of maximum`,
        timestamp: new Date(),
        exposure: exposure.currentExposure,
      };
      alerts.push(alert);
      log.error('CRITICAL RISK ALERT', { ratio, exposure: exposure.currentExposure });
    } else if (ratio > 0.7) {
      log.warn('High exposure warning', { ratio, exposure: exposure.currentExposure });
    }

    // Check house profit
    if (exposure.houseProfit < -100000) {
      log.error('Significant house loss detected', { profit: exposure.houseProfit });
    }

    log.debug('Risk check completed', {
      exposure: exposure.currentExposure,
      profit: exposure.houseProfit,
      ratio,
    });
  } catch (error) {
    log.error('Risk check failed', { error: String(error) });
  }
}

/**
 * Start the risk monitoring worker
 */
export function startRiskWorker(intervalMs: number = 10000): NodeJS.Timeout {
  log.info('Risk worker started', { intervalMs });
  return setInterval(runRiskCheck, intervalMs);
}

/**
 * Get current risk alerts
 */
export function getRiskAlerts(limit: number = 10): RiskAlert[] {
  return alerts.slice(-limit);
}

export default { startRiskWorker, getRiskAlerts };
