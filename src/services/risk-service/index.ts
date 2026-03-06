/**
 * Risk Service & Exposure Engine
 * Casino-grade liquidity protection system.
 *
 * CRITICAL: This is the core risk management module.
 * All bet acceptance must pass through risk checks.
 *
 * Features:
 * 1. Real-time exposure tracking
 * 2. Max payout per round
 * 3. Max liability per outcome
 * 4. Bankroll protection
 * 5. Dynamic house edge adjustment
 */

import redis, { RedisKeys } from '@/infra/redis';
import { createLogger } from '@/infra/logger';
import { RISK_CONFIG, getMaxMultiplier } from '@/shared/constants/payout';
import { ExposureLimitExceededError } from '@/shared/errors';
import type { RiskCheckResult, OutcomeRiskMap, ExposureState } from '@/shared/types';

const log = createLogger('risk-service');

// ============================================
// EXPOSURE ENGINE
// ============================================

/**
 * Calculate potential maximum payout for a bet
 * This represents the worst-case scenario for the house.
 */
export function calculateMaxPotentialPayout(betAmount: number, picks: number): number {
  const maxMultiplier = getMaxMultiplier(picks);
  return betAmount * maxMultiplier;
}

/**
 * Pre-bet risk check
 * MUST be called before accepting any bet.
 *
 * Algorithm:
 * 1. Calculate potentialPayout = betAmount * maxMultiplier
 * 2. Check: currentExposure + potentialPayout <= maxAllowedExposure
 * 3. If not: Reject bet
 */
export async function checkBetRisk(
  betAmount: number,
  picks: number,
  roundId: string
): Promise<RiskCheckResult> {
  const potentialPayout = calculateMaxPotentialPayout(betAmount, picks);
  const currentExposure = await getCurrentExposure(roundId);

  // Check 1: Max exposure per round
  if (currentExposure + potentialPayout > RISK_CONFIG.maxExposurePerRound) {
    log.warn('Bet rejected: exposure limit', {
      currentExposure,
      potentialPayout,
      max: RISK_CONFIG.maxExposurePerRound,
    });
    return {
      approved: false,
      reason: 'Round exposure limit exceeded',
      currentExposure,
      potentialPayout,
    };
  }

  // Check 2: Max payout per individual bet
  if (potentialPayout > RISK_CONFIG.maxPayoutPerBet) {
    log.warn('Bet rejected: max payout exceeded', { potentialPayout, max: RISK_CONFIG.maxPayoutPerBet });
    return {
      approved: false,
      reason: 'Maximum potential payout exceeded',
      currentExposure,
      potentialPayout,
    };
  }

  // Check 3: Dynamic adjustment based on house profit
  const houseProfit = await getHouseProfit();
  if (houseProfit < RISK_CONFIG.dynamicAdjustmentThreshold) {
    // House is losing - tighten constraints
    const adjustedMax = RISK_CONFIG.maxExposurePerRound * 0.5; // 50% reduction
    if (currentExposure + potentialPayout > adjustedMax) {
      log.warn('Bet rejected: dynamic risk adjustment active', {
        houseProfit,
        adjustedMax,
      });
      return {
        approved: false,
        reason: 'Risk constraints tightened due to bankroll protection',
        currentExposure,
        potentialPayout,
      };
    }
  }

  // Approved
  log.info('Bet risk check passed', { betAmount, picks, potentialPayout, currentExposure });
  return {
    approved: true,
    currentExposure,
    potentialPayout,
  };
}

/**
 * Record exposure after bet is accepted
 */
export async function recordExposure(roundId: string, potentialPayout: number): Promise<void> {
  const key = RedisKeys.roundExposure(roundId);
  await redis.incrby(key, potentialPayout);
  await redis.expire(key, 3600); // 1 hour TTL
}

/**
 * Get current exposure for a round
 */
export async function getCurrentExposure(roundId: string): Promise<number> {
  const key = RedisKeys.roundExposure(roundId);
  const value = await redis.get(key);
  return parseFloat(value || '0');
}

/**
 * Get house profit (total bets - total payouts over time)
 */
export async function getHouseProfit(): Promise<number> {
  const value = await redis.get(RedisKeys.houseProfit());
  return parseFloat(value || '0');
}

/**
 * Update house profit after round settlement
 */
export async function updateHouseProfit(totalBets: number, totalPayouts: number): Promise<void> {
  const profit = totalBets - totalPayouts;
  await redis.incrby(RedisKeys.houseProfit(), profit);
  log.info('House profit updated', { roundProfit: profit });
}

// ============================================
// ADVANCED EXPOSURE ENGINE
// ============================================

/**
 * Generate outcome risk map for a round
 * For each possible outcome, simulate worst-case payout.
 *
 * System filters unsafe outcomes:
 * If maxLoss > allowedRisk → Remove from selection pool
 * Then randomly choose from safe outcomes.
 */
export function generateOutcomeRiskMap(
  bets: Array<{ selectedNumbers: number[]; amount: number }>,
  drawnNumbers: number[],
  picks: number
): OutcomeRiskMap[] {
  // For simplicity, evaluate the current drawn set
  // In full implementation, this would simulate all possible draw combinations
  const riskMap: OutcomeRiskMap[] = [];

  // Calculate actual payouts for each bet with current numbers
  let totalPayout = 0;
  for (const bet of bets) {
    const matches = bet.selectedNumbers.filter(n => drawnNumbers.includes(n)).length;
    const multiplier = getMaxMultiplier(picks);
    const worstCase = bet.amount * multiplier;
    totalPayout += worstCase;
  }

  riskMap.push({
    outcomeId: 'current',
    maxLoss: totalPayout,
    probability: 1,
  });

  return riskMap;
}

/**
 * Filter safe outcomes from drawn number candidates
 * Removes numbers that would cause excessive payouts
 */
export function filterSafeOutcomes(
  candidates: number[],
  bets: Array<{ selectedNumbers: number[]; amount: number; picks: number }>,
  maxAllowedLoss: number
): number[] {
  // Calculate which numbers would cause highest payouts if drawn
  const numberRisk = new Map<number, number>();

  for (const num of candidates) {
    let risk = 0;
    for (const bet of bets) {
      if (bet.selectedNumbers.includes(num)) {
        // This number appearing increases matches for this bet
        risk += calculateMaxPotentialPayout(bet.amount, bet.picks);
      }
    }
    numberRisk.set(num, risk);
  }

  // Filter out numbers with excessive risk
  const safeNumbers = candidates.filter(num => {
    const risk = numberRisk.get(num) || 0;
    return risk <= maxAllowedLoss;
  });

  // Always return at least the minimum needed numbers
  if (safeNumbers.length < 20) {
    // Sort by risk and take lowest-risk numbers
    return candidates
      .sort((a, b) => (numberRisk.get(a) || 0) - (numberRisk.get(b) || 0))
      .slice(0, 20);
  }

  return safeNumbers;
}

/**
 * Get comprehensive exposure state (for admin dashboard)
 */
export async function getExposureState(): Promise<ExposureState> {
  const houseProfit = await getHouseProfit();

  return {
    currentExposure: 0, // Would aggregate all active rounds
    maxAllowedExposure: RISK_CONFIG.maxExposurePerRound,
    houseProfit,
    activeLiability: 0,
  };
}
