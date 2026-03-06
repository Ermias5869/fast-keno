import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infra/db';

/**
 * GET /api/game/history
 * Returns round history and user bet history from PostgreSQL.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'rounds';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (type === 'bets' && userId) {
      const userBets = await prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          round: { select: { roundNumber: true, drawnNumbers: true } },
        },
      });

      return NextResponse.json({
        success: true,
        data: userBets.map(b => ({
          id: b.id,
          roundNumber: b.round.roundNumber,
          selectedNumbers: b.selectedNumbers,
          matchedNumbers: b.matchedNumbers,
          amount: Number(b.amount),
          payout: b.payout ? Number(b.payout) : null,
          multiplier: b.multiplier ? Number(b.multiplier) : null,
          status: b.status,
          createdAt: b.createdAt.toISOString(),
        })),
      });
    }

    // Default: round history
    const history = await prisma.round.findMany({
      where: { status: 'FINISHED' },
      orderBy: { startedAt: 'desc' },
      take: limit,
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

    return NextResponse.json({
      success: true,
      data: history.map(r => ({
        drawId: r.id,
        roundNumber: r.roundNumber,
        timestamp: r.finishedAt?.toISOString() || r.startedAt.toISOString(),
        combination: r.drawnNumbers,
        totalBets: Number(r.totalBets),
        totalPayout: Number(r.totalPayout),
      })),
    });
  } catch (error) {
    console.error('[HISTORY] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
