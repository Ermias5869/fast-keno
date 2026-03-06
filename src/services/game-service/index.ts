/**
 * Game Engine Service
 * Core Keno game logic, round lifecycle, and provably fair system.
 *
 * Round Lifecycle:
 * 1. Betting open
 * 2. Accept bets (validate through risk engine)
 * 3. Lock betting
 * 4. Run risk check on all bets
 * 5. Generate secure random numbers using crypto.randomInt
 * 6. Calculate matches
 * 7. Calculate payouts
 * 8. Update balances
 * 9. Broadcast via socket
 */

import crypto from 'crypto';
import { createLogger } from '@/infra/logger';
import redis, { RedisKeys } from '@/infra/redis';
import socketManager from '@/infra/socket';
import { GAME_CONFIG, getMultiplier, calculatePayout } from '@/shared/constants/payout';
import { InvalidBetError, DuplicateBetError, BettingClosedError } from '@/shared/errors';
import { maskUsername, generateSeed, hashSeed, generateFairNumbers, calculateMatches } from '@/shared/utils';
import { checkBetRisk, recordExposure, calculateMaxPotentialPayout, updateHouseProfit } from '@/services/risk-service';
import { lockFunds, settleBet } from '@/services/wallet-service';
import { getUserById } from '@/services/auth-service';
import type { RoundState, BetResult, PublicBet, BetStatus } from '@/shared/types';

const log = createLogger('game-engine');

// ============================================
// IN-MEMORY GAME STATE (dev mode)
// ============================================

interface GameRound {
  id: string;
  roundNumber: number;
  status: 'BETTING_OPEN' | 'BETTING_CLOSED' | 'DRAWING' | 'FINISHED' | 'CANCELLED';
  drawnNumbers: number[];
  startedAt: Date;
  closedAt: Date | null;
  finishedAt: Date | null;
  totalBets: number;
  totalPayout: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

interface GameBet {
  id: string;
  userId: string;
  roundId: string;
  selectedNumbers: number[];
  amount: number;
  multiplier: number | null;
  payout: number | null;
  matchedNumbers: number[];
  status: BetStatus;
  createdAt: Date;
}

const rounds: Map<string, GameRound> = new Map();
const bets: Map<string, GameBet[]> = new Map(); // roundId -> bets
let roundCounter = 176700; // Starting round number matching reference
let activeRoundId: string | null = null;
let roundTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================
// ROUND LIFECYCLE
// ============================================

/**
 * Start a new round
 */
export function startNewRound(): GameRound {
  // Generate provably fair seeds
  const serverSeed = generateSeed();
  const serverSeedHash = hashSeed(serverSeed);
  const clientSeed = crypto.randomBytes(16).toString('hex');

  const round: GameRound = {
    id: crypto.randomUUID(),
    roundNumber: ++roundCounter,
    status: 'BETTING_OPEN',
    drawnNumbers: [],
    startedAt: new Date(),
    closedAt: null,
    finishedAt: null,
    totalBets: 0,
    totalPayout: 0,
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce: 0,
  };

  rounds.set(round.id, round);
  bets.set(round.id, []);
  activeRoundId = round.id;

  // Store in Redis
  redis.set(RedisKeys.activeRound(), round.id);

  // Broadcast round start
  socketManager.emitRoundStarted({
    id: round.id,
    roundNumber: round.roundNumber,
    status: round.status,
    drawnNumbers: [],
    timeRemaining: GAME_CONFIG.roundDurationMs / 1000,
    totalBets: 0,
  });

  log.info('Round started', { roundId: round.id, roundNumber: round.roundNumber });

  // Auto-start countdown timer
  startRoundTimer(round.id);

  return round;
}

/**
 * Start the round timer
 */
function startRoundTimer(roundId: string) {
  if (roundTimer) clearTimeout(roundTimer);

  const round = rounds.get(roundId);
  if (!round) return;

  // Timer countdown
  let timeLeft = GAME_CONFIG.roundDurationMs / 1000;
  const interval = setInterval(() => {
    timeLeft--;
    socketManager.emitTimerUpdate({ timeRemaining: timeLeft });
    if (timeLeft <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  // Close betting and start draw
  roundTimer = setTimeout(async () => {
    clearInterval(interval);
    await closeBettingAndDraw(roundId);
  }, GAME_CONFIG.roundDurationMs);
}

/**
 * Place a bet in the current round
 */
export async function placeBet(
  userId: string,
  roundId: string,
  selectedNumbers: number[],
  amount: number
): Promise<PublicBet> {
  const round = rounds.get(roundId);
  if (!round) throw new BettingClosedError(roundId);
  if (round.status !== 'BETTING_OPEN') throw new BettingClosedError(roundId);

  // Validate bet
  if (selectedNumbers.length < GAME_CONFIG.minPicks || selectedNumbers.length > GAME_CONFIG.maxPicks) {
    throw new InvalidBetError(`Must select ${GAME_CONFIG.minPicks}-${GAME_CONFIG.maxPicks} numbers`);
  }

  if (amount < GAME_CONFIG.minBet || amount > GAME_CONFIG.maxBet) {
    throw new InvalidBetError(`Bet must be between ${GAME_CONFIG.minBet} and ${GAME_CONFIG.maxBet}`);
  }

  // Validate numbers are in range
  if (selectedNumbers.some(n => n < 1 || n > GAME_CONFIG.totalNumbers)) {
    throw new InvalidBetError('Numbers must be between 1 and 80');
  }

  // Check for duplicates in selection
  if (new Set(selectedNumbers).size !== selectedNumbers.length) {
    throw new InvalidBetError('Duplicate numbers not allowed');
  }

  // Anti double-bet protection
  const roundBets = bets.get(roundId) || [];
  if (roundBets.some(b => b.userId === userId)) {
    throw new DuplicateBetError(userId, roundId);
  }

  // Risk check
  const riskResult = await checkBetRisk(amount, selectedNumbers.length, roundId);
  if (!riskResult.approved) {
    throw new InvalidBetError(riskResult.reason || 'Risk check failed');
  }

  // Lock funds
  lockFunds(userId, amount, roundId);

  // Record exposure
  const maxPayout = calculateMaxPotentialPayout(amount, selectedNumbers.length);
  await recordExposure(roundId, maxPayout);

  // Create bet
  const bet: GameBet = {
    id: crypto.randomUUID(),
    userId,
    roundId,
    selectedNumbers: selectedNumbers.sort((a, b) => a - b),
    amount,
    multiplier: null,
    payout: null,
    matchedNumbers: [],
    status: 'PENDING',
    createdAt: new Date(),
  };

  roundBets.push(bet);
  bets.set(roundId, roundBets);
  round.totalBets += amount;

  const user = getUserById(userId);
  const publicBet: PublicBet = {
    id: bet.id,
    maskedUsername: maskUsername(user?.username || null),
    selectedNumbers: bet.selectedNumbers,
    amount: bet.amount,
    status: bet.status,
    payout: null,
  };

  // Broadcast
  socketManager.emitBetAccepted(publicBet);

  // Update user balance via socket
  if (user) {
    socketManager.emitBalanceUpdated(userId, {
      balance: user.balance,
      lockedBalance: user.lockedBalance,
    });
  }

  log.info('Bet placed', { betId: bet.id, userId, roundId, amount, picks: selectedNumbers.length });

  return publicBet;
}

/**
 * Close betting and start the draw
 */
async function closeBettingAndDraw(roundId: string): Promise<void> {
  const round = rounds.get(roundId);
  if (!round || round.status !== 'BETTING_OPEN') return;

  round.status = 'BETTING_CLOSED';
  round.closedAt = new Date();
  log.info('Betting closed', { roundId, roundNumber: round.roundNumber });

  // Short delay then start drawing
  setTimeout(() => drawNumbers(roundId), 1000);
}

/**
 * Draw numbers one by one with socket broadcast
 * Uses provably fair algorithm
 */
async function drawNumbers(roundId: string): Promise<void> {
  const round = rounds.get(roundId);
  if (!round) return;

  round.status = 'DRAWING';

  // Generate provably fair numbers
  const drawnNumbers = generateFairNumbers(
    round.serverSeed,
    round.clientSeed,
    round.nonce,
    GAME_CONFIG.drawCount,
    GAME_CONFIG.totalNumbers
  );

  // Draw balls one by one with 500ms interval
  for (let i = 0; i < drawnNumbers.length; i++) {
    await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.drawIntervalMs));

    round.drawnNumbers.push(drawnNumbers[i]);
    socketManager.emitBallDrawn({
      number: drawnNumbers[i],
      index: i,
      total: GAME_CONFIG.drawCount,
    });
  }

  // Settle round after all balls drawn
  setTimeout(() => settleRound(roundId), 1000);
}

/**
 * Settle all bets in a round
 */
async function settleRound(roundId: string): Promise<void> {
  const round = rounds.get(roundId);
  if (!round) return;

  const roundBets = bets.get(roundId) || [];
  const results: BetResult[] = [];
  let totalPayout = 0;

  for (const bet of roundBets) {
    // Calculate matches
    const matched = calculateMatches(bet.selectedNumbers, round.drawnNumbers);
    const picks = bet.selectedNumbers.length;
    const multiplier = getMultiplier(picks, matched.length);
    const payout = calculatePayout(bet.amount, picks, matched.length);

    // Update bet
    bet.matchedNumbers = matched;
    bet.multiplier = multiplier;
    bet.payout = payout;
    bet.status = payout > 0 ? 'WON' : 'LOST';

    // Settle wallet
    settleBet(bet.userId, bet.amount, payout, roundId);
    totalPayout += payout;

    const user = getUserById(bet.userId);
    results.push({
      id: bet.id,
      userId: bet.userId,
      username: user?.username || null,
      selectedNumbers: bet.selectedNumbers,
      matchedNumbers: matched,
      amount: bet.amount,
      multiplier,
      payout,
      status: bet.status,
    });

    // Update user balance
    if (user) {
      socketManager.emitBalanceUpdated(bet.userId, {
        balance: user.balance,
        lockedBalance: user.lockedBalance,
      });
    }
  }

  round.totalPayout = totalPayout;
  round.status = 'FINISHED';
  round.finishedAt = new Date();

  // Update house profit
  await updateHouseProfit(round.totalBets, totalPayout);

  // Broadcast round finished
  socketManager.emitRoundFinished({
    roundId: round.id,
    drawnNumbers: round.drawnNumbers,
    results,
  });

  log.info('Round settled', {
    roundId,
    roundNumber: round.roundNumber,
    totalBets: round.totalBets,
    totalPayout,
    profit: round.totalBets - totalPayout,
    betsCount: roundBets.length,
  });

  // Auto-start next round after a delay
  setTimeout(() => startNewRound(), 3000);
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get current active round
 */
export function getActiveRound(): RoundState | null {
  if (!activeRoundId) return null;
  const round = rounds.get(activeRoundId);
  if (!round) return null;

  const elapsed = Date.now() - round.startedAt.getTime();
  const timeRemaining = Math.max(0, (GAME_CONFIG.roundDurationMs - elapsed) / 1000);

  return {
    id: round.id,
    roundNumber: round.roundNumber,
    status: round.status,
    drawnNumbers: round.drawnNumbers,
    timeRemaining: Math.ceil(timeRemaining),
    totalBets: round.totalBets,
  };
}

/**
 * Get bets for a round (public view)
 */
export function getRoundBets(roundId: string): PublicBet[] {
  const roundBets = bets.get(roundId) || [];
  return roundBets.map(bet => {
    const user = getUserById(bet.userId);
    return {
      id: bet.id,
      maskedUsername: maskUsername(user?.username || null),
      selectedNumbers: bet.selectedNumbers,
      amount: bet.amount,
      status: bet.status,
      payout: bet.payout,
    };
  });
}

/**
 * Get user's bet history
 */
export function getUserBets(userId: string, limit: number = 50): GameBet[] {
  const userBets: GameBet[] = [];
  for (const roundBetList of bets.values()) {
    for (const bet of roundBetList) {
      if (bet.userId === userId) {
        userBets.push(bet);
      }
    }
  }
  return userBets
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Get round history (results)
 */
export function getRoundHistory(limit: number = 20): GameRound[] {
  return Array.from(rounds.values())
    .filter(r => r.status === 'FINISHED')
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .slice(0, limit);
}

/**
 * Get all bets across all rounds (for GAME tab)
 */
export function getAllActiveBets(): PublicBet[] {
  if (!activeRoundId) return [];
  return getRoundBets(activeRoundId);
}

/**
 * Get number statistics for last N rounds
 */
export function getNumberStatistics(lastNRounds: number = 100): { number: number; frequency: number }[] {
  const finishedRounds = Array.from(rounds.values())
    .filter(r => r.status === 'FINISHED')
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .slice(0, lastNRounds);

  const freq = new Map<number, number>();
  for (let i = 1; i <= 80; i++) freq.set(i, 0);

  for (const round of finishedRounds) {
    for (const num of round.drawnNumbers) {
      freq.set(num, (freq.get(num) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([number, frequency]) => ({ number, frequency }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Get leaderboard (top winners)
 */
export function getLeaderboard(limit: number = 20): { rank: number; maskedId: string; betAmount: number; winAmount: number }[] {
  const winMap = new Map<string, { total: number; maxBet: number }>();

  for (const roundBetList of bets.values()) {
    for (const bet of roundBetList) {
      if (bet.status === 'WON' && bet.payout && bet.payout > 0) {
        const existing = winMap.get(bet.userId) || { total: 0, maxBet: 0 };
        existing.total += bet.payout;
        existing.maxBet = Math.max(existing.maxBet, bet.amount);
        winMap.set(bet.userId, existing);
      }
    }
  }

  return Array.from(winMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([userId, data], index) => {
      const user = getUserById(userId);
      return {
        rank: index + 1,
        maskedId: maskUsername(user?.username || null),
        betAmount: data.maxBet,
        winAmount: data.total,
      };
    });
}

/**
 * Get provably fair data for a round (revealed after round finishes)
 */
export function getProvablyFairData(roundId: string) {
  const round = rounds.get(roundId);
  if (!round) return null;

  return {
    serverSeedHash: round.serverSeedHash,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
    serverSeed: round.status === 'FINISHED' ? round.serverSeed : undefined,
    revealed: round.status === 'FINISHED',
  };
}

// ============================================
// DEMO DATA GENERATION
// ============================================

/**
 * Generate demo rounds and bets for initial display
 */
export function generateDemoData(): void {
  const demoUsernames = ['j***z', 'u***b', 'x***g', 'b***c', 'o***n', 'n***v', 'g***p', 'y***v', 'y***m', 'd***k'];

  // Generate 10 past rounds
  for (let i = 0; i < 10; i++) {
    const roundId = crypto.randomUUID();
    const serverSeed = generateSeed();
    const roundNum = roundCounter - (10 - i);

    const drawnNumbers: number[] = [];
    const numSet = new Set<number>();
    while (numSet.size < 20) {
      numSet.add(crypto.randomInt(1, 81));
    }
    drawnNumbers.push(...numSet);

    const round: GameRound = {
      id: roundId,
      roundNumber: roundNum,
      status: 'FINISHED',
      drawnNumbers,
      startedAt: new Date(Date.now() - (10 - i) * 90000),
      closedAt: new Date(Date.now() - (10 - i) * 90000 + 54000),
      finishedAt: new Date(Date.now() - (10 - i) * 90000 + 64000),
      totalBets: 0,
      totalPayout: 0,
      serverSeed,
      serverSeedHash: hashSeed(serverSeed),
      clientSeed: crypto.randomBytes(16).toString('hex'),
      nonce: 0,
    };

    rounds.set(roundId, round);

    // Generate random bets for this round
    const roundBets: GameBet[] = [];
    const betCount = 3 + crypto.randomInt(0, 8);
    let totalBetsAmount = 0;
    let totalPayoutAmount = 0;

    for (let j = 0; j < betCount; j++) {
      const picks = 1 + crypto.randomInt(0, 10);
      const selected: number[] = [];
      const selSet = new Set<number>();
      while (selSet.size < picks) {
        selSet.add(crypto.randomInt(1, 81));
      }
      selected.push(...selSet);

      const matched = calculateMatches(selected, drawnNumbers);
      const multiplier = getMultiplier(picks, matched.length);
      const betAmount = [100, 200, 500, 1000][crypto.randomInt(0, 4)];
      const payout = betAmount * multiplier;

      totalBetsAmount += betAmount;
      totalPayoutAmount += payout;

      roundBets.push({
        id: crypto.randomUUID(),
        userId: `demo_${j}`,
        roundId,
        selectedNumbers: selected.sort((a, b) => a - b),
        amount: betAmount,
        multiplier,
        payout,
        matchedNumbers: matched,
        status: payout > 0 ? 'WON' : 'LOST',
        createdAt: new Date(Date.now() - (10 - i) * 90000 + j * 1000),
      });
    }

    round.totalBets = totalBetsAmount;
    round.totalPayout = totalPayoutAmount;
    bets.set(roundId, roundBets);
  }

  log.info('Demo data generated', { rounds: 10 });
}

// Initialize demo data
generateDemoData();
