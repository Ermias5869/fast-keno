import { NextRequest, NextResponse } from 'next/server';
import { authenticateTelegram, createDevUser } from '@/services/auth-service';
import { handleApiError } from '@/shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;

    // Dev mode: create test user without Telegram
    if (!initData && process.env.NODE_ENV === 'development') {
      const result = await createDevUser('dev_user_' + Date.now());
      return NextResponse.json({ success: true, data: result });
    }

    if (!initData) {
      return NextResponse.json(
        { success: false, error: 'initData is required' },
        { status: 400 }
      );
    }

    const result = await authenticateTelegram(initData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
