import type { GameConfig, PayoutTableEntry } from '../types';

// ============================================
// STANDARD KENO PAYOUT TABLE
// ============================================
// Multipliers based on number of picks and matches
// Format: PAYOUT_TABLE[picks][matches] = multiplier

export const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1:  { 0: 0, 1: 3.5 },
  2:  { 0: 0, 1: 1, 2: 9 },
  3:  { 0: 0, 1: 0, 2: 2.5, 3: 25 },
  4:  { 0: 0, 1: 0, 2: 1.5, 3: 5, 4: 75 },
  5:  { 0: 0, 1: 0, 2: 1, 3: 3, 4: 15, 5: 250 },
  6:  { 0: 0, 1: 0, 2: 0.5, 3: 2, 4: 8, 5: 50, 6: 1000 },
  7:  { 0: 0, 1: 0, 2: 0.5, 3: 1, 4: 5, 5: 20, 6: 100, 7: 2500 },
  8:  { 0: 0, 1: 0, 2: 0, 3: 1, 4: 3, 5: 10, 6: 50, 7: 500, 8: 10000 },
  9:  { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 2, 5: 6, 6: 25, 7: 150, 8: 2500, 9: 25000 },
  10: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1.5, 5: 4, 6: 15, 7: 75, 8: 500, 9: 5000, 10: 30000 },
};

// ============================================
// GAME CONFIGURATION
// ============================================

export const GAME_CONFIG: GameConfig = {
  totalNumbers: 80,
  drawCount: 20,
  maxPicks: 10,
  minPicks: 1,
  minBet: 5,
  maxBet: 10000,
  roundDurationMs: 54000,    // 54 seconds betting window
  drawIntervalMs: 500,       // 500ms per ball draw
};

// ============================================
// RISK CONFIGURATION
// ============================================

export const RISK_CONFIG = {
  maxExposurePerRound: 1000000,     // Max total potential payout per round
  maxPayoutPerBet: 300000,          // Max single bet payout
  bankrollProtectionRatio: 0.1,     // Max 10% of bankroll at risk per round
  minHouseEdge: 0.02,               // 2% minimum house edge
  dynamicAdjustmentThreshold: -50000, // Start adjusting when loss exceeds this
  profitRelaxThreshold: 100000,      // Relax constraints when profit exceeds this
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the payout multiplier for a given number of picks and matches
 */
export function getMultiplier(picks: number, matches: number): number {
  const pickTable = PAYOUT_TABLE[picks];
  if (!pickTable) return 0;
  return pickTable[matches] ?? 0;
}

/**
 * Calculate potential payout for a bet
 */
export function calculatePayout(betAmount: number, picks: number, matches: number): number {
  return betAmount * getMultiplier(picks, matches);
}

/**
 * Get the maximum possible multiplier for a given number of picks
 */
export function getMaxMultiplier(picks: number): number {
  const pickTable = PAYOUT_TABLE[picks];
  if (!pickTable) return 0;
  return Math.max(...Object.values(pickTable));
}

/**
 * Get all payout table entries as a flat array
 */
export function getPayoutTableEntries(): PayoutTableEntry[] {
  const entries: PayoutTableEntry[] = [];
  for (const [picks, matchMap] of Object.entries(PAYOUT_TABLE)) {
    for (const [matches, multiplier] of Object.entries(matchMap)) {
      entries.push({
        picks: Number(picks),
        matches: Number(matches),
        multiplier: Number(multiplier),
      });
    }
  }
  return entries;
}
