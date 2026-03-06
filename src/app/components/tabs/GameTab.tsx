'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * GameTab - shows all active bets for current round
 * Matches reference: masked username, number chips, bet amount, status
 */
export default function GameTab() {
  const { allBets, activeBetFilter, setBetFilter, activeRound } = useGameStore();

  const totalCount = allBets.length;

  return (
    <div className="px-2 py-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {/* Filter tabs */}
      <div className="flex items-center gap-6 mb-3 text-xs">
        <button
          className={`font-medium ${activeBetFilter === 'all' ? 'text-white' : ''}`}
          style={{ color: activeBetFilter === 'all' ? '#e4e8ec' : '#8b949e' }}
          onClick={() => setBetFilter('all')}
        >
          All <span style={{ color: '#4ade80' }}>{totalCount}</span>
        </button>
        <button
          className={`font-medium ${activeBetFilter === 'my_tickets' ? 'text-white' : ''}`}
          style={{ color: activeBetFilter === 'my_tickets' ? '#e4e8ec' : '#8b949e' }}
          onClick={() => setBetFilter('my_tickets')}
        >
          My Tickets <span style={{ color: '#4ade80' }}>0</span>
        </button>
        <button
          className={`font-medium ${activeBetFilter === 'my_bets' ? 'text-white' : ''}`}
          style={{ color: activeBetFilter === 'my_bets' ? '#e4e8ec' : '#8b949e' }}
          onClick={() => setBetFilter('my_bets')}
        >
          My Bets <span style={{ color: '#4ade80' }}>0</span>
        </button>
      </div>

      {/* Bets list */}
      {allBets.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#8b949e' }}>
          <p className="text-sm">No bets yet for round #{activeRound?.roundNumber || '---'}</p>
          <p className="text-xs mt-1">Place your bet to get started!</p>
        </div>
      ) : (
        allBets.map(bet => (
          <div key={bet.id} className="bet-card">
            {/* Username */}
            <div className="text-xs font-medium mb-1" style={{ color: '#fbbf24' }}>
              {bet.maskedUsername}
            </div>

            {/* Number chips */}
            <div className="flex gap-1 mb-2">
              {bet.selectedNumbers.map((num, i) => (
                <span key={i} className="number-chip">
                  {num}
                </span>
              ))}
              {/* Empty slots to show max 10 */}
              {Array.from({ length: Math.max(0, 10 - bet.selectedNumbers.length) }).map((_, i) => (
                <span key={`empty-${i}`} className="number-chip" style={{ opacity: 0.3 }} />
              ))}
            </div>

            {/* Bet amount + status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: '#e4e8ec' }}>
                Bet {bet.amount}
              </span>
              <span className="text-xs font-bold" style={{
                color: bet.status === 'WON' ? '#4ade80' :
                       bet.status === 'LOST' ? '#ef4444' : '#fbbf24'
              }}>
                {bet.status === 'PENDING' ? 'Waiting' :
                 bet.status === 'WON' ? `Won ${bet.payout}` :
                 bet.status === 'LOST' ? 'Lost' : bet.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
