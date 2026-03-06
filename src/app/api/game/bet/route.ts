import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { placeBet, startNewRound, getActiveRound } from '@/services/game-service';
import { handleApiError } from '@/shared/errors';

// Zod validation schema for bet request
const BetSchema = z.object({
  roundId: z.string().uuid(),
  selectedNumbers: z.array(z.number().int().min(1).max(80)).min(1).max(10),
  amount: z.number().min(5).max(10000),
  userId: z.string().optional(), // Dev mode: pass userId directly
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const parsed = BetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid bet data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { roundId, selectedNumbers, amount, userId } = parsed.data;

    // In production, extract userId from JWT token
    const betUserId = userId || 'dev_user';

    const result = await placeBet(betUserId, roundId, selectedNumbers, amount);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}

// Start a new round (admin/dev endpoint)
export async function PUT() {
  try {
    // Ensure there's an active round
    let round = getActiveRound();
    if (!round || round.status === 'FINISHED') {
      const newRound = startNewRound();
      round = {
        id: newRound.id,
        roundNumber: newRound.roundNumber,
        status: newRound.status,
        drawnNumbers: [],
        timeRemaining: 54,
        totalBets: 0,
      };
    }
    return NextResponse.json({ success: true, data: round });
  } catch (error) {
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
