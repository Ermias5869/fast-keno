import { NextRequest, NextResponse } from 'next/server';
import { getUserBets, getRoundHistory } from '@/services/game-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'rounds'; // 'rounds' or 'bets'
    const limit = parseInt(searchParams.get('limit') || '20');

    if (type === 'bets' && userId) {
      const userBets = getUserBets(userId, limit);
      return NextResponse.json({ success: true, data: userBets });
    }

    const history = getRoundHistory(limit);
    return NextResponse.json({
      success: true,
      data: history.map(r => ({
        drawId: r.id,
        roundNumber: r.roundNumber,
        timestamp: r.finishedAt?.toISOString() || r.startedAt.toISOString(),
        combination: r.drawnNumbers,
        totalBets: r.totalBets,
        totalPayout: r.totalPayout,
      })),
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
