import { NextRequest, NextResponse } from 'next/server';
import { authenticateTelegram, createDevUser } from '@/services/auth-service';
import { handleApiError } from '@/shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;

    console.log('[AUTH] /api/auth/telegram called');
    console.log('[AUTH] initData present:', !!initData);
    console.log('[AUTH] initData length:', initData?.length || 0);
    console.log('[AUTH] NODE_ENV:', process.env.NODE_ENV);

    // If no initData — create a dev user (works in both dev and prod for testing)
    if (!initData || initData.length === 0) {
      console.log('[AUTH] No initData — creating dev user');
      const result = await createDevUser('player_' + Date.now());
      console.log('[AUTH] Dev user created:', result.user.id);
      return NextResponse.json({ success: true, data: result });
    }

    // Verify Telegram signature and create/find user
    console.log('[AUTH] Verifying Telegram initData...');
    const result = await authenticateTelegram(initData);
    console.log('[AUTH] User authenticated:', result.user.id, result.user.username);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
