'use client';

import { PAYOUT_TABLE, getMaxMultiplier } from '@/shared/constants/payout';

/**
 * Get non-zero multiplier entries for a given pick count.
 * Returns array of { matches, multiplier } sorted by matches ascending.
 */
export function getMultipliersForPicks(
  picks: number
): { matches: number; multiplier: number }[] {
  const table = PAYOUT_TABLE[picks];
  if (!table) return [];

  return Object.entries(table)
    .map(([m, mult]) => ({ matches: Number(m), multiplier: mult }))
    .filter((e) => e.multiplier > 0)
    .sort((a, b) => a.matches - b.matches);
}

/**
 * Calculate the maximum possible win for a given pick count and bet amount.
 */
export function getMaxWin(picks: number, betAmount: number): number {
  return betAmount * getMaxMultiplier(picks);
}
