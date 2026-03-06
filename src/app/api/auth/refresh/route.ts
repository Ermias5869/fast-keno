import { NextRequest, NextResponse } from 'next/server';
import { refreshAuthToken } from '@/services/auth-service';
import { handleApiError } from '@/shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'refreshToken is required' },
        { status: 400 }
      );
    }

    const result = await refreshAuthToken(refreshToken);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const { message, status, code } = handleApiError(error);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
