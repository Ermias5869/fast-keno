'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * ResultsTab - Past draw results
 * Matches reference: Draw ID + timestamp | 2 rows of 10 numbers each
 */
export default function ResultsTab() {
  const { roundHistory } = useGameStore();

  return (
    <div className="px-2 py-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {/* Column headers */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium" style={{ color: '#8b949e' }}>Draw ID</span>
        <span className="text-xs font-medium" style={{ color: '#8b949e' }}>Combination</span>
      </div>

      {roundHistory.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#8b949e' }}>
          <p className="text-sm">No results yet</p>
        </div>
      ) : (
        roundHistory.map(result => (
          <div key={result.drawId} className="flex items-start gap-2 mb-3 py-2 px-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {/* Draw ID & time */}
            <div className="flex items-center gap-2 min-w-[80px]">
              <svg className="w-4 h-4 flex-shrink-0" fill="#4ade80" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <div>
                <div className="text-xs font-medium" style={{ color: '#4ade80' }}>{result.roundNumber}</div>
                <div className="text-[10px]" style={{ color: '#8b949e' }}>
                  {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Number grid - 2 rows of 10 */}
            <div className="flex-1">
              <div className="grid grid-cols-10 gap-0.5">
                {result.combination.map((num, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[11px] font-medium py-1"
                    style={{
                      background: 'var(--bg-cell)',
                      color: 'var(--text-primary)',
                      borderRadius: '2px',
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
