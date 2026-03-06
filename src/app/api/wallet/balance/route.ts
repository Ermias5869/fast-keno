import { NextRequest, NextResponse } from 'next/server';
import { getWalletBalance, getTransactionHistory } from '@/services/wallet-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'balance';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    if (type === 'transactions') {
      const txns = getTransactionHistory(userId);
      return NextResponse.json({ success: true, data: txns });
    }

    const wallet = getWalletBalance(userId);
    return NextResponse.json({ success: true, data: wallet });
  } catch (error) {
    console.error('Wallet error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get wallet data' },
      { status: 500 }
    );
  }
}
