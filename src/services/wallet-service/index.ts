/**
 * Wallet Service
 * Handles all balance operations with strict transactional integrity.
 *
 * CRITICAL RULES:
 * - Never update balance directly without a transaction record
 * - Always lock funds before bet
 * - Release locked funds after round settlement
 * - Use atomic operations to prevent race conditions
 */

import { createLogger } from '@/infra/logger';
import { InsufficientBalanceError } from '@/shared/errors';
import { getUserById } from '@/services/auth-service';

const log = createLogger('wallet-service');

// ============================================
// In-memory transaction log (dev mode)
// In production, uses Prisma + PostgreSQL with proper DB transactions
// ============================================
interface TransactionRecord {
  id: string;
  userId: string;
  type: 'BET' | 'WIN' | 'DEPOSIT' | 'WITHDRAW' | 'ROLLBACK';
  amount: number;
  roundId: string | null;
  createdAt: Date;
}

const transactions: TransactionRecord[] = [];
let txCounter = 0;

/**
 * Get user wallet state
 */
export function getWalletBalance(userId: string) {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  return {
    balance: user.balance,
    lockedBalance: user.lockedBalance,
    totalDeposit: 0,
    totalWithdraw: 0,
  };
}

/**
 * Lock funds for a bet (moves from balance to lockedBalance)
 * This is an atomic operation that creates a transaction record.
 */
export function lockFunds(userId: string, amount: number, roundId: string): TransactionRecord {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  // Critical: Check available balance
  if (user.balance < amount) {
    throw new InsufficientBalanceError(amount, user.balance);
  }

  // Atomic: Move from balance to locked
  user.balance -= amount;
  user.lockedBalance += amount;

  const tx: TransactionRecord = {
    id: `tx_${++txCounter}_${Date.now()}`,
    userId,
    type: 'BET',
    amount: -amount, // negative = debit
    roundId,
    createdAt: new Date(),
  };
  transactions.push(tx);

  log.info('Funds locked', {
    userId,
    amount,
    roundId,
    newBalance: user.balance,
    newLocked: user.lockedBalance,
  });

  return tx;
}

/**
 * Settle a bet - release locked funds and credit winnings
 */
export function settleBet(
  userId: string,
  amount: number,
  payout: number,
  roundId: string
): TransactionRecord | null {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  // Release locked funds
  user.lockedBalance = Math.max(0, user.lockedBalance - amount);

  // Credit winnings if any
  if (payout > 0) {
    user.balance += payout;

    const tx: TransactionRecord = {
      id: `tx_${++txCounter}_${Date.now()}`,
      userId,
      type: 'WIN',
      amount: payout,
      roundId,
      createdAt: new Date(),
    };
    transactions.push(tx);

    log.info('Bet settled with win', {
      userId,
      betAmount: amount,
      payout,
      roundId,
      newBalance: user.balance,
    });

    return tx;
  }

  log.info('Bet settled with loss', {
    userId,
    betAmount: amount,
    roundId,
    newBalance: user.balance,
  });

  return null;
}

/**
 * Rollback a bet (refund locked funds)
 */
export function rollbackBet(userId: string, amount: number, roundId: string): TransactionRecord {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  user.lockedBalance = Math.max(0, user.lockedBalance - amount);
  user.balance += amount;

  const tx: TransactionRecord = {
    id: `tx_${++txCounter}_${Date.now()}`,
    userId,
    type: 'ROLLBACK',
    amount,
    roundId,
    createdAt: new Date(),
  };
  transactions.push(tx);

  log.info('Bet rolled back', { userId, amount, roundId, newBalance: user.balance });

  return tx;
}

/**
 * Get transaction history for a user
 */
export function getTransactionHistory(userId: string, limit: number = 50): TransactionRecord[] {
  return transactions
    .filter(tx => tx.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Deposit funds (admin or payment gateway)
 */
export function deposit(userId: string, amount: number): TransactionRecord {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  user.balance += amount;

  const tx: TransactionRecord = {
    id: `tx_${++txCounter}_${Date.now()}`,
    userId,
    type: 'DEPOSIT',
    amount,
    roundId: null,
    createdAt: new Date(),
  };
  transactions.push(tx);

  log.info('Deposit', { userId, amount, newBalance: user.balance });
  return tx;
}
