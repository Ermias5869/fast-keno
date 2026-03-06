'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * GameHeader - Top bar matching reference "FAST KENO" header
 * Shows logo, balance, round ID, menu icons
 */
export default function GameHeader() {
  const { wallet, activeRound, timeRemaining } = useGameStore();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m} : ${s}`;
  };

  return (
    <div className="header-bar px-3 py-2">
      {/* Top header row */}
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-black tracking-tighter italic" style={{ color: '#fbbf24' }}>FAST</span>
            <span className="text-[14px] font-black tracking-tighter italic" style={{ color: '#4ade80' }}>KENO</span>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold" style={{ color: '#4ade80' }}>
            {wallet.balance.toFixed(2)}
          </span>
          <span className="text-[10px]" style={{ color: '#8b949e' }}>ETB</span>
        </div>

        {/* Round ID */}
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: '#8b949e' }}>ID:</span>
          <span className="text-xs font-medium" style={{ color: '#e4e8ec' }}>
            {activeRound?.roundNumber || '---'}
          </span>
          <svg className="w-4 h-4" fill="#4ade80" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>

        {/* Menu icons */}
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timer */}
      {activeRound && activeRound.status === 'BETTING_OPEN' && (
        <div className="text-center mt-1">
          <span className="text-lg font-mono font-bold" style={{ color: '#4ade80' }}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      )}
    </div>
  );
}
