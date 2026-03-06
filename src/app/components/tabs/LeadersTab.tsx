'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * LeadersTab - Leaderboard showing top winners
 * Matches reference: # | ID | Bet | Win columns
 */
export default function LeadersTab() {
  const { leaderboard } = useGameStore();

  return (
    <div className="px-2 py-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {/* Column headers */}
      <div className="grid grid-cols-4 gap-2 mb-2 px-1 text-xs font-medium" style={{ color: '#8b949e' }}>
        <span>#</span>
        <span>ID</span>
        <span className="text-center">Bet</span>
        <span className="text-right">Win</span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#8b949e' }}>
          <p className="text-sm">No winners yet</p>
        </div>
      ) : (
        leaderboard.map((entry, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 py-2.5 px-1 items-center"
            style={{
              borderBottom: '1px solid var(--border-color)',
              background: i < 3 ? 'rgba(74, 222, 128, 0.05)' : 'transparent',
            }}
          >
            {/* Rank */}
            <span className="text-sm font-bold" style={{
              color: i < 3 ? '#4ade80' : '#e4e8ec'
            }}>
              {entry.rank}
            </span>

            {/* Masked ID */}
            <span className="text-xs font-medium" style={{
              color: i < 3 ? '#4ade80' : '#8b949e'
            }}>
              {entry.maskedId}
            </span>

            {/* Bet amount */}
            <span className="text-xs text-center" style={{ color: '#e4e8ec' }}>
              {entry.betAmount}
            </span>

            {/* Win amount */}
            <span className="text-sm font-bold text-right" style={{
              color: '#4ade80'
            }}>
              {entry.winAmount.toLocaleString()} ETB
            </span>
          </div>
        ))
      )}
    </div>
  );
}
