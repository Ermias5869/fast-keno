import { NextResponse } from 'next/server';
import prisma from '@/infra/db';
import crypto from 'crypto';
import { generateSeed, hashSeed } from '@/shared/utils';
import { GAME_CONFIG } from '@/shared/constants/payout';

/**
 * GET /api/game/round
 * Returns the active round (or creates one) + history + stats + leaderboard.
 * All from PostgreSQL — no in-memory state.
 */
export async function GET() {
  try {
    const roundDuration = GAME_CONFIG.roundDurationMs;

    // 1. Find most recent active round
    let activeRound = await prisma.round.findFirst({
      where: { status: { in: ['BETTING_OPEN', 'DRAWING'] } },
      orderBy: { startedAt: 'desc' },
      include: {
        bets: { select: { id: true, userId: true, selectedNumbers: true, amount: true, status: true, payout: true } },
      },
    });

    // 2. Check if active round has expired
    if (activeRound && activeRound.status === 'BETTING_OPEN') {
      const elapsed = Date.now() - activeRound.startedAt.getTime();
      if (elapsed > roundDuration) {
        // This round's betting period is over — mark as DRAWING
        activeRound = await prisma.round.update({
          where: { id: activeRound.id },
          data: { status: 'DRAWING', closedAt: new Date() },
          include: {
            bets: { select: { id: true, userId: true, selectedNumbers: true, amount: true, status: true, payout: true } },
          },
        });
      }
    }

    // 3. If no active round exists, create a new one
    if (!activeRound || activeRound.status === 'FINISHED' || activeRound.status === 'CANCELLED') {
      const serverSeed = generateSeed();
      const roundNumber = Math.floor(Date.now() / 1000) % 1000000;

      activeRound = await prisma.round.create({
        data: {
          roundNumber,
          status: 'BETTING_OPEN',
          drawnNumbers: [],
          totalBets: 0,
          totalPayout: 0,
          provablyFair: {
            create: {
              serverSeed,
              serverSeedHash: hashSeed(serverSeed),
              clientSeed: crypto.randomBytes(16).toString('hex'),
              nonce: 0,
            },
          },
        },
        include: {
          bets: { select: { id: true, userId: true, selectedNumbers: true, amount: true, status: true, payout: true } },
        },
      });
      console.log('[ROUND] New round created:', activeRound.roundNumber);
    }

    // Calculate time remaining
    const elapsed = Date.now() - activeRound.startedAt.getTime();
    const timeRemaining = Math.max(0, Math.ceil((roundDuration - elapsed) / 1000));

    // 4. Get round history (last 20 finished rounds)
    const history = await prisma.round.findMany({
      where: { status: 'FINISHED' },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        roundNumber: true,
        drawnNumbers: true,
        startedAt: true,
        finishedAt: true,
        totalBets: true,
        totalPayout: true,
      },
    });

    // 5. Get number statistics (frequency from last 100 rounds)
    const recentRounds = await prisma.round.findMany({
      where: { status: 'FINISHED' },
      orderBy: { startedAt: 'desc' },
      take: 100,
      select: { drawnNumbers: true },
    });

    const freq = new Map<number, number>();
    for (let i = 1; i <= 80; i++) freq.set(i, 0);
    for (const r of recentRounds) {
      for (const n of r.drawnNumbers) {
        freq.set(n, (freq.get(n) || 0) + 1);
      }
    }
    const statistics = Array.from(freq.entries())
      .map(([number, frequency]) => ({ number, frequency }))
      .sort((a, b) => a.number - b.number);

    // 6. Get leaderboard (top winners)
    const topWinners = await prisma.bet.groupBy({
      by: ['userId'],
      where: { status: 'WON' },
      _sum: { payout: true, amount: true },
      orderBy: { _sum: { payout: 'desc' } },
      take: 20,
    });

    const leaderboard = topWinners.map((w, i) => ({
      rank: i + 1,
      maskedId: 'p***' + w.userId.slice(-3),
      betAmount: Number(w._sum.amount || 0),
      winAmount: Number(w._sum.payout || 0),
    }));

    // 7. Format active bets
    const activeBets = (activeRound.bets || []).map((b) => ({
      id: b.id,
      maskedUsername: 'p***' + b.userId.slice(-3),
      selectedNumbers: b.selectedNumbers,
      amount: Number(b.amount),
      status: b.status,
      payout: b.payout ? Number(b.payout) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        activeRound: {
          id: activeRound.id,
          roundNumber: activeRound.roundNumber,
          status: activeRound.status,
          drawnNumbers: activeRound.drawnNumbers,
          timeRemaining,
          totalBets: Number(activeRound.totalBets),
        },
        history: history.map(r => ({
          drawId: r.id,
          roundNumber: r.roundNumber,
          timestamp: r.finishedAt?.toISOString() || r.startedAt.toISOString(),
          combination: r.drawnNumbers,
        })),
        statistics,
        leaderboard,
        activeBets,
        totalBets: activeBets.length,
      },
    });
  } catch (error) {
    console.error('[ROUND] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get round data' },
      { status: 500 }
    );
  }
}
