import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/infra/db';
import crypto from 'crypto';
import { generateSeed, hashSeed } from '@/shared/utils';
import { GAME_CONFIG } from '@/shared/constants/payout';

// Zod validation schema
const BetSchema = z.object({
  roundId: z.string().optional(),
  selectedNumbers: z.array(z.number().int().min(1).max(80)).min(1).max(10),
  amount: z.number().min(5).max(10000),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[BET-API] POST /api/game/bet');
    console.log('[BET-API] body:', JSON.stringify(body));

    // 1. Validate input
    const parsed = BetSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[BET-API] Validation failed:', parsed.error.issues);
      return NextResponse.json(
        { success: false, error: 'Invalid bet data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { selectedNumbers, amount } = parsed.data;
    let userId = parsed.data.userId || '';

    // 2. Extract userId from JWT if not provided
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { verifyToken } = await import('@/services/auth-service');
          const user = await verifyToken(token);
          userId = user.id;
          console.log('[BET-API] userId from JWT:', userId);
        } catch (e) {
          console.log('[BET-API] JWT failed:', e);
        }
      }
    }

    // 3. Ensure we have a valid user in the database
    if (!userId) {
      console.log('[BET-API] No userId, creating anonymous player');
      try {
        const { createDevUser } = await import('@/services/auth-service');
        const devResult = await createDevUser('anon_' + Date.now());
        userId = devResult.user.id;
        console.log('[BET-API] Created anonymous user:', userId);
      } catch (e) {
        console.error('[BET-API] Failed to create anonymous user:', e);
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
    }

    // 4. Verify user exists in DB
    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });
    } catch (e) {
      console.error('[BET-API] DB lookup failed:', e);
    }

    if (!dbUser) {
      console.log('[BET-API] User not found in DB:', userId);
      return NextResponse.json({ success: false, error: 'User not found. Please re-open the app from Telegram.' }, { status: 404 });
    }

    // 5. Check balance
    const balance = Number(dbUser.wallet?.balance || 0);
    if (balance < amount) {
      console.log('[BET-API] Insufficient balance:', balance, '<', amount);
      return NextResponse.json(
        { success: false, error: `Insufficient balance: have ${balance.toFixed(2)}, need ${amount.toFixed(2)}` },
        { status: 400 }
      );
    }

    // 6. Get or create a round ID for the bet record
    let roundId = parsed.data.roundId || '';
    if (!roundId) {
      const activeRound = await prisma.round.findFirst({
        where: { status: 'BETTING_OPEN' },
        orderBy: { startedAt: 'desc' },
      });
      roundId = activeRound?.id || '';
    }

    // 7. Find or create the round in DB
    let dbRound;
    try {
      dbRound = await prisma.round.findUnique({ where: { id: roundId } });
    } catch {
      // Round might not be in DB (in-memory only)
    }

    if (!dbRound) {
      try {
        dbRound = await prisma.round.create({
          data: {
            id: roundId,
            roundNumber: Date.now() % 1000000,
            status: 'BETTING_OPEN',
            drawnNumbers: [],
            totalBets: 0,
            totalPayout: 0,
          },
        });
        console.log('[BET-API] Created round in DB:', roundId);
      } catch (e) {
        // Round might already exist (race condition) - try to find it again
        console.log('[BET-API] Round create failed (may exist):', e);
        try {
          dbRound = await prisma.round.findUnique({ where: { id: roundId } });
        } catch {
          // Use a fresh round ID if all else fails
          roundId = 'round_' + Date.now();
          dbRound = await prisma.round.create({
            data: {
              id: roundId,
              roundNumber: Date.now() % 1000000,
              status: 'BETTING_OPEN',
              drawnNumbers: [],
              totalBets: 0,
              totalPayout: 0,
            },
          });
        }
      }
    }

    // 8. Create bet in DB + deduct balance (atomic transaction)
    const betResult = await prisma.$transaction(async (tx) => {
      // Deduct balance
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          lockedBalance: { increment: amount },
        },
      });

      // Create bet record
      const bet = await tx.bet.create({
        data: {
          userId,
          roundId,
          selectedNumbers: selectedNumbers.sort((a, b) => a - b),
          amount,
          status: 'PENDING',
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'BET',
          amount: -amount,
          roundId,
        },
      });

      // Update round total bets
      await tx.round.update({
        where: { id: roundId },
        data: { totalBets: { increment: amount } },
      });

      return {
        bet,
        newBalance: Number(updatedWallet.balance),
        newLocked: Number(updatedWallet.lockedBalance),
      };
    });

    console.log('[BET-API] Bet placed!', {
      betId: betResult.bet.id,
      userId,
      roundId,
      amount,
      picks: selectedNumbers.length,
      newBalance: betResult.newBalance,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: betResult.bet.id,
        selectedNumbers: betResult.bet.selectedNumbers,
        amount: Number(betResult.bet.amount),
        status: betResult.bet.status,
        maskedUsername: dbUser.username || 'player',
        payout: null,
        wallet: {
          balance: betResult.newBalance,
          lockedBalance: betResult.newLocked,
        },
      },
    });
  } catch (error) {
    console.error('[BET-API] CRASH:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Start a new round
export async function PUT() {
  try {
    // Find active round from DB
    let activeRound = await prisma.round.findFirst({
      where: { status: { in: ['BETTING_OPEN', 'DRAWING'] } },
      orderBy: { startedAt: 'desc' },
    });

    if (!activeRound) {
      const serverSeed = generateSeed();
      activeRound = await prisma.round.create({
        data: {
          roundNumber: Math.floor(Date.now() / 1000) % 1000000,
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
      });
    }

    const elapsed = Date.now() - activeRound.startedAt.getTime();
    const timeRemaining = Math.max(0, Math.ceil((GAME_CONFIG.roundDurationMs - elapsed) / 1000));

    return NextResponse.json({
      success: true,
      data: {
        id: activeRound.id,
        roundNumber: activeRound.roundNumber,
        status: activeRound.status,
        drawnNumbers: activeRound.drawnNumbers,
        timeRemaining,
        totalBets: Number(activeRound.totalBets),
      },
    });
  } catch (error) {
    console.error('[BET-API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
