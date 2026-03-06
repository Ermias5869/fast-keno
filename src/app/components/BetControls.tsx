'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * BetControls - Bet amount controls and BET button
 * Matches reference: [−] amount [+] X2 MAX ⚙ | BET button
 */
export default function BetControls() {
  const {
    betAmount, setBetAmount, doubleBet, maxBet,
    selectedNumbers, activeRound, isDrawing, hasBet,
    wallet
  } = useGameStore();

  const canBet = selectedNumbers.length >= 1 &&
    activeRound?.status === 'BETTING_OPEN' &&
    !isDrawing &&
    !hasBet &&
    wallet.balance >= betAmount;

  const handlePlaceBet = async () => {
    if (!canBet || !activeRound) return;

    try {
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: activeRound.id,
          selectedNumbers,
          amount: betAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        useGameStore.getState().setHasBet(true);
        useGameStore.getState().setWallet({
          balance: wallet.balance - betAmount,
          lockedBalance: wallet.lockedBalance + betAmount,
        });
        useGameStore.getState().addBet(data.data);
      }
    } catch (err) {
      console.error('Failed to place bet:', err);
    }
  };

  return (
    <div className="px-2 py-2">
      {/* Amount controls */}
      <div className="flex items-center gap-2 mb-2" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 12px' }}>
        {/* Minus */}
        <button
          onClick={() => setBetAmount(betAmount - 5)}
          className="w-8 h-8 rounded flex items-center justify-center text-xl font-bold"
          style={{ color: '#e4e8ec', background: 'var(--bg-cell)' }}
        >
          −
        </button>

        {/* Amount display */}
        <div className="flex-1 text-center">
          <span className="text-xl font-bold" style={{ color: '#e4e8ec' }}>
            {betAmount.toFixed(2)}
          </span>
        </div>

        {/* Plus */}
        <button
          onClick={() => setBetAmount(betAmount + 5)}
          className="w-8 h-8 rounded flex items-center justify-center text-xl font-bold"
          style={{ color: '#e4e8ec', background: 'var(--bg-cell)' }}
        >
          +
        </button>

        {/* X2 */}
        <button
          onClick={doubleBet}
          className="px-3 py-1 rounded text-sm font-bold"
          style={{ color: '#4ade80', background: 'transparent', border: '1px solid #4ade80' }}
        >
          X2
        </button>

        {/* MAX */}
        <button
          onClick={maxBet}
          className="px-3 py-1 rounded text-sm font-bold"
          style={{ color: '#4ade80', background: 'transparent', border: '1px solid #4ade80' }}
        >
          MAX
        </button>

        {/* Settings */}
        <button className="w-8 h-8 rounded flex items-center justify-center"
          style={{ color: '#8b949e' }}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>
      </div>

      {/* BET Button */}
      <button
        className="btn-bet"
        disabled={!canBet}
        onClick={handlePlaceBet}
      >
        BET
      </button>
    </div>
  );
}
