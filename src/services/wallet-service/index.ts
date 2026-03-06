/**
 * Wallet Service
 * Handles all balance operations with strict transactional integrity.
 *
 * NOW USES PRISMA + PostgreSQL for persistent storage.
 *
 * CRITICAL RULES:
 * - Never update balance directly without a transaction record
 * - Always lock funds before bet
 * - Release locked funds after round settlement
 * - Use Prisma transactions for atomicity
 */

import prisma from '@/infra/db';
import { createLogger } from '@/infra/logger';
import { InsufficientBalanceError } from '@/shared/errors';
import { cacheUser } from '@/services/auth-service';

const log = createLogger('wallet-service');

/**
 * Get user wallet state
 */
export async function getWalletBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    // Auto-create wallet if missing
    const newWallet = await prisma.wallet.create({
      data: { userId, balance: 10000, lockedBalance: 0, totalDeposit: 0, totalWithdraw: 0 },
    });
    return {
      balance: Number(newWallet.balance),
      lockedBalance: Number(newWallet.lockedBalance),
      totalDeposit: Number(newWallet.totalDeposit),
      totalWithdraw: Number(newWallet.totalWithdraw),
    };
  }

  return {
    balance: Number(wallet.balance),
    lockedBalance: Number(wallet.lockedBalance),
    totalDeposit: Number(wallet.totalDeposit),
    totalWithdraw: Number(wallet.totalWithdraw),
  };
}

/**
 * Lock funds for a bet (moves from balance to lockedBalance)
 * Uses Prisma transaction for atomicity.
 */
export async function lockFunds(userId: string, amount: number, roundId: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    const balance = Number(wallet.balance);
    if (balance < amount) {
      throw new InsufficientBalanceError(amount, balance);
    }

    // Atomic: debit balance, credit locked
    const updated = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        lockedBalance: { increment: amount },
      },
    });

    // Record transaction
    const txRecord = await tx.transaction.create({
      data: {
        userId,
        type: 'BET',
        amount: -amount,
        roundId,
      },
    });

    // Update cache for game engine
    cacheUser(userId, {
      username: null,
      balance: Number(updated.balance),
      lockedBalance: Number(updated.lockedBalance),
    });

    log.info('Funds locked', {
      userId, amount, roundId,
      newBalance: Number(updated.balance),
      newLocked: Number(updated.lockedBalance),
    });

    return txRecord;
  });
}

/**
 * Settle a bet - release locked funds and credit winnings
 */
export async function settleBet(
  userId: string,
  amount: number,
  payout: number,
  roundId: string
) {
  return prisma.$transaction(async (tx) => {
    // Release locked funds
    const wallet = await tx.wallet.update({
      where: { userId },
      data: {
        lockedBalance: { decrement: amount },
        balance: payout > 0 ? { increment: payout } : undefined,
      },
    });

    // Record WIN transaction if payout > 0
    let txRecord = null;
    if (payout > 0) {
      txRecord = await tx.transaction.create({
        data: {
          userId,
          type: 'WIN',
          amount: payout,
          roundId,
        },
      });

      log.info('Bet settled with win', {
        userId, betAmount: amount, payout, roundId,
        newBalance: Number(wallet.balance),
      });
    } else {
      log.info('Bet settled with loss', {
        userId, betAmount: amount, roundId,
        newBalance: Number(wallet.balance),
      });
    }

    // Update cache
    cacheUser(userId, {
      username: null,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
    });

    return txRecord;
  });
}

/**
 * Rollback a bet (refund locked funds)
 */
export async function rollbackBet(userId: string, amount: number, roundId: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId },
      data: {
        lockedBalance: { decrement: amount },
        balance: { increment: amount },
      },
    });

    const txRecord = await tx.transaction.create({
      data: {
        userId,
        type: 'ROLLBACK',
        amount,
        roundId,
      },
    });

    cacheUser(userId, {
      username: null,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
    });

    log.info('Bet rolled back', { userId, amount, roundId, newBalance: Number(wallet.balance) });
    return txRecord;
  });
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(userId: string, limit: number = 50) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Deposit funds
 */
export async function deposit(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        totalDeposit: { increment: amount },
      },
    });

    const txRecord = await tx.transaction.create({
      data: { userId, type: 'DEPOSIT', amount },
    });

    cacheUser(userId, {
      username: null,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
    });

    log.info('Deposit', { userId, amount, newBalance: Number(wallet.balance) });
    return txRecord;
  });
}
