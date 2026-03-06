import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { placeBet, startNewRound, getActiveRound } from '@/services/game-service';
import { handleApiError } from '@/shared/errors';

// Zod validation schema for bet request
const BetSchema = z.object({
  roundId: z.string(),
  selectedNumbers: z.array(z.number().int().min(1).max(80)).min(1).max(10),
  amount: z.number().min(5).max(10000),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[BET-API] POST /api/game/bet received');
    console.log('[BET-API] body:', JSON.stringify(body));

    // Validate input with Zod
    const parsed = BetSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[BET-API] Validation failed:', parsed.error.issues);
      return NextResponse.json(
        { success: false, error: 'Invalid bet data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    let { roundId, selectedNumbers, amount, userId } = parsed.data;

    // Extract userId from JWT if available
    if (!userId || userId === '') {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { verifyToken } = await import('@/services/auth-service');
          const user = await verifyToken(token);
          userId = user.id;
          console.log('[BET-API] userId from JWT:', userId);
        } catch {
          console.log('[BET-API] JWT verification failed, using fallback');
        }
      }
    }

    // Fallback: if still no userId, use a dev user
    if (!userId || userId === '') {
      userId = 'dev_user';
      console.log('[BET-API] Using fallback userId:', userId);
    }

    // If no active round, start one
    if (!roundId || roundId === '') {
      const activeRound = getActiveRound();
      if (activeRound) {
        roundId = activeRound.id;
      } else {
        const newRound = startNewRound();
        roundId = newRound.id;
      }
      console.log('[BET-API] Using roundId:', roundId);
    }

    console.log('[BET-API] Placing bet:', { userId, roundId, selectedNumbers, amount });

    const result = await placeBet(userId, roundId, selectedNumbers, amount);
    console.log('[BET-API] Bet placed successfully:', result.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[BET-API] Error:', error);
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}

// Start a new round (admin/dev endpoint)
export async function PUT() {
  try {
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
