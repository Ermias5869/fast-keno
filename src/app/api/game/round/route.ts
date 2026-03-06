import { NextResponse } from 'next/server';
import { getActiveRound, getRoundHistory, getNumberStatistics, getLeaderboard, getAllActiveBets } from '@/services/game-service';

export async function GET() {
  try {
    const activeRound = getActiveRound();
    const history = getRoundHistory(10);
    const statistics = getNumberStatistics(100);
    const leaderboard = getLeaderboard(10);
    const activeBets = getAllActiveBets();

    return NextResponse.json({
      success: true,
      data: {
        activeRound,
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
    console.error('Game round error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get round data' },
      { status: 500 }
    );
  }
}
