'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * GameHeader - Top bar with FAST KENO logo, balance, round ID, timer.
 * Bug fix: timer now always shows (removed BETTING_OPEN status check).
 */
export default function GameHeader() {
  const { wallet, activeRound, timeRemaining, isDrawing } = useGameStore();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m} : ${s}`;
  };

  const getStatusText = () => {
    if (isDrawing) return '🎱 DRAWING...';
    if (timeRemaining <= 0) return '⏳ SETTLING...';
    return null;
  };

  const statusText = getStatusText();

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
        </div>

        {/* Menu icons */}
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timer — always visible */}
      <div className="text-center mt-1">
        {statusText ? (
          <span className="text-lg font-mono font-bold" style={{ color: '#fbbf24' }}>
            {statusText}
          </span>
        ) : (
          <span className="text-lg font-mono font-bold" style={{ color: '#4ade80' }}>
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>
    </div>
  );
}
