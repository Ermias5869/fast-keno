'use client';

import React, { useMemo } from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * StatisticsTab - Number frequency bars from last 100 rounds
 * Matches reference: number | bar | count per row
 */
export default function StatisticsTab() {
  const { statistics } = useGameStore();

  const maxFreq = useMemo(() => {
    if (!statistics.length) return 1;
    return Math.max(...statistics.map(s => s.frequency), 1);
  }, [statistics]);

  return (
    <div className="px-2 py-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs" style={{ color: '#8b949e' }}>Last 100 rounds</span>
        <button className="text-xs flex items-center gap-1" style={{ color: '#8b949e' }}>
          Sort
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
          </svg>
        </button>
      </div>

      {statistics.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#8b949e' }}>
          <p className="text-sm">No statistics available</p>
        </div>
      ) : (
        <div className="space-y-1">
          {statistics.map(stat => (
            <div key={stat.number} className="flex items-center gap-2 py-1">
              {/* Number */}
              <span className="w-6 text-right text-sm font-bold" style={{
                color: stat.frequency > maxFreq * 0.7 ? '#4ade80' : '#e4e8ec'
              }}>
                {stat.number}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-cell)' }}>
                <div
                  className="stat-bar"
                  style={{
                    width: `${(stat.frequency / maxFreq) * 100}%`,
                    opacity: 0.8 + (stat.frequency / maxFreq) * 0.2,
                  }}
                />
              </div>

              {/* Count */}
              <span className="w-6 text-right text-xs" style={{ color: '#8b949e' }}>
                {stat.frequency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
