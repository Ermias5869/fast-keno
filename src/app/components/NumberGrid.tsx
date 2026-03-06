'use client';

import React, { useMemo } from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * NumberGrid - 8×10 grid of numbers 1-80
 * Matches the reference UI with dark teal cells, green selection,
 * and hot/cold indicator dots.
 */
export default function NumberGrid() {
  const { selectedNumbers, toggleNumber, drawnNumbers, isDrawing, statistics, activeRound } = useGameStore();

  const canSelect = activeRound?.status === 'BETTING_OPEN' && !isDrawing;

  // Hot/cold analysis from statistics
  const hotColdMap = useMemo(() => {
    if (!statistics.length) return new Map<number, 'hot' | 'cold'>();
    const map = new Map<number, 'hot' | 'cold'>();
    const sorted = [...statistics].sort((a, b) => b.frequency - a.frequency);
    // Top 10 are hot
    sorted.slice(0, 10).forEach(s => map.set(s.number, 'hot'));
    // Bottom 10 are cold
    sorted.slice(-10).forEach(s => map.set(s.number, 'cold'));
    return map;
  }, [statistics]);

  const drawnSet = useMemo(() => new Set(drawnNumbers), [drawnNumbers]);
  const selectedSet = useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  const handleClick = (num: number) => {
    if (!canSelect) return;
    toggleNumber(num);
  };

  // Generate 1-80 numbers in 8-column grid
  const rows: number[][] = [];
  for (let i = 0; i < 80; i += 10) {
    rows.push(Array.from({ length: 10 }, (_, j) => i + j + 1));
  }

  return (
    <div className="px-2 py-2">
      {/* Selection info */}
      <div className="flex items-center gap-3 mb-3 px-1">
        {/* Ball icons showing selection count */}
        <div className="flex items-center gap-1 relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: 'radial-gradient(circle, #4ade80 0%, #166534 70%)',
              boxShadow: '0 0 15px rgba(74,222,128,0.3)',
              color: '#fff',
            }}>
            {selectedNumbers.length || '?'}
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: '#1a2d3d', border: '1px solid #4ade80', color: '#4ade80' }}>
            80
          </div>
          <div className="absolute -top-2 left-4 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: '#1a2d3d', border: '1px solid #4ade80', color: '#4ade80' }}>
            10
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: '#e4e8ec' }}>Choose 10 numbers</h2>
          <p className="text-sm font-medium" style={{ color: '#4ade80' }}>From 1 to 80</p>
        </div>

        {/* Help button */}
        <button className="w-8 h-8 rounded-full flex items-center justify-center border"
          style={{ borderColor: '#4ade80', color: '#4ade80' }}>
          ?
        </button>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-10 gap-1">
        {rows.flat().map(num => {
          const isSelected = selectedSet.has(num);
          const isDrawn = drawnSet.has(num);
          const isMatched = isSelected && isDrawn;
          const hotCold = hotColdMap.get(num);

          let cellClass = 'keno-cell relative';
          if (isMatched) cellClass += ' matched';
          else if (isDrawn) cellClass += ' drawn';
          else if (isSelected) cellClass += ' selected';

          return (
            <button
              key={num}
              className={cellClass}
              onClick={() => handleClick(num)}
              disabled={!canSelect && !isSelected}
              style={{
                minHeight: '36px',
                fontSize: '13px',
              }}
            >
              {num}
              {hotCold === 'hot' && !isSelected && !isDrawn && <span className="hot-dot" />}
              {hotCold === 'cold' && !isSelected && !isDrawn && <span className="cold-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
