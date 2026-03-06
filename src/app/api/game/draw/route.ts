import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infra/db';
import crypto from 'crypto';
import { generateFairNumbers, calculateMatches } from '@/shared/utils';
import { getMultiplier, calculatePayout, GAME_CONFIG } from '@/shared/constants/payout';

/**
 * POST /api/game/draw
 * Triggers the draw for a round that has expired.
 * - Generates 20 provably fair numbers
 * - Settles all bets (calculates matches, payouts)
 * - Updates user wallets
 * - Returns results
 *
 * Called by the frontend when the timer hits 0.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const roundId = body.roundId || '';

    console.log('[DRAW] Triggered for round:', roundId);

    // 1. Find the round
    let round;
    if (roundId) {
      round = await prisma.round.findUnique({
        where: { id: roundId },
        include: {
          provablyFair: true,
          bets: { include: { user: { select: { id: true, username: true } } } },
        },
      });
    }

    // Fallback: find any round that needs drawing
    if (!round) {
      round = await prisma.round.findFirst({
        where: { status: { in: ['BETTING_OPEN', 'DRAWING'] } },
        orderBy: { startedAt: 'desc' },
        include: {
          provablyFair: true,
          bets: { include: { user: { select: { id: true, username: true } } } },
        },
      });
    }

    if (!round) {
      return NextResponse.json({ success: false, error: 'No round to draw' }, { status: 404 });
    }

    // Already finished?
    if (round.status === 'FINISHED') {
      return NextResponse.json({
        success: true,
        data: {
          roundId: round.id,
          roundNumber: round.roundNumber,
          drawnNumbers: round.drawnNumbers,
          status: 'FINISHED',
          results: [],
          alreadyFinished: true,
        },
      });
    }

    // 2. Generate provably fair drawn numbers
    let drawnNumbers: number[];
    if (round.provablyFair) {
      drawnNumbers = generateFairNumbers(
        round.provablyFair.serverSeed,
        round.provablyFair.clientSeed || 'default',
        round.provablyFair.nonce,
        GAME_CONFIG.drawCount,
        GAME_CONFIG.totalNumbers
      );
    } else {
      // Fallback: cryptographic random
      const numSet = new Set<number>();
      while (numSet.size < GAME_CONFIG.drawCount) {
        numSet.add(crypto.randomInt(1, GAME_CONFIG.totalNumbers + 1));
      }
      drawnNumbers = Array.from(numSet);
    }

    console.log('[DRAW] Numbers:', drawnNumbers.join(', '));

    // 3. Settle all bets
    const results = [];
    let totalPayout = 0;

    for (const bet of round.bets) {
      const matched = calculateMatches(bet.selectedNumbers, drawnNumbers);
      const picks = bet.selectedNumbers.length;
      const multiplier = getMultiplier(picks, matched.length);
      const payout = calculatePayout(Number(bet.amount), picks, matched.length);
      const status = payout > 0 ? 'WON' : 'LOST';

      totalPayout += payout;

      // Update bet in DB
      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          matchedNumbers: matched,
          multiplier,
          payout,
          status,
          settledAt: new Date(),
        },
      });

      // If won, credit the user's wallet
      if (payout > 0) {
        await prisma.wallet.update({
          where: { userId: bet.userId },
          data: {
            balance: { increment: payout },
            lockedBalance: { decrement: Number(bet.amount) },
          },
        });

        // Record WIN transaction
        await prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'WIN',
            amount: payout,
            roundId: round.id,
          },
        });
      } else {
        // Lost — just release locked
        await prisma.wallet.update({
          where: { userId: bet.userId },
          data: {
            lockedBalance: { decrement: Number(bet.amount) },
          },
        });
      }

      results.push({
        betId: bet.id,
        userId: bet.userId,
        username: bet.user?.username || 'player',
        selectedNumbers: bet.selectedNumbers,
        matchedNumbers: matched,
        picks,
        matches: matched.length,
        multiplier,
        amount: Number(bet.amount),
        payout,
        status,
      });

      console.log('[DRAW] Bet', bet.id, ':', picks, 'picks,', matched.length, 'matches, payout:', payout);
    }

    // 4. Update round status to FINISHED
    await prisma.round.update({
      where: { id: round.id },
      data: {
        status: 'FINISHED',
        drawnNumbers,
        closedAt: round.closedAt || new Date(),
        finishedAt: new Date(),
        totalPayout,
      },
    });

    // 5. Reveal the server seed
    if (round.provablyFair) {
      await prisma.provablyFair.update({
        where: { id: round.provablyFair.id },
        data: { revealed: true },
      });
    }

    console.log('[DRAW] Round settled:', {
      roundNumber: round.roundNumber,
      totalBets: Number(round.totalBets),
      totalPayout,
      profit: Number(round.totalBets) - totalPayout,
      betsCount: round.bets.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        roundId: round.id,
        roundNumber: round.roundNumber,
        drawnNumbers,
        status: 'FINISHED',
        totalBets: Number(round.totalBets),
        totalPayout,
        results,
      },
    });
  } catch (error) {
    console.error('[DRAW] Error:', error);
    const message = error instanceof Error ? error.message : 'Draw failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
