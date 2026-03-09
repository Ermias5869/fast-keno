'use client';

import React, { useMemo } from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * NumberGrid - 8×10 grid of numbers 1-80
 * Bug fix: removed `activeRound?.status === 'BETTING_OPEN'` check.
 * Players can now always select numbers (selections persist between rounds).
 */
export default function NumberGrid() {
  const { selectedNumbers, toggleNumber, drawnNumbers, isDrawing, statistics } = useGameStore();

  // Always allow selection unless draw is in progress
  const canSelect = !isDrawing;

  // Hot/cold analysis from statistics
  const hotColdMap = useMemo(() => {
    if (!statistics.length) return new Map<number, 'hot' | 'cold'>();
    const map = new Map<number, 'hot' | 'cold'>();
    const sorted = [...statistics].sort((a, b) => b.frequency - a.frequency);
    sorted.slice(0, 10).forEach(s => map.set(s.number, 'hot'));
    sorted.slice(-10).forEach(s => map.set(s.number, 'cold'));
    return map;
  }, [statistics]);

  const drawnSet = useMemo(() => new Set(drawnNumbers), [drawnNumbers]);
  const selectedSet = useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  const handleClick = (num: number) => {
    if (!canSelect) return;
    toggleNumber(num);
  };

  // Generate 1-80 numbers in rows of 10
  const rows: number[][] = [];
  for (let i = 0; i < 80; i += 10) {
    rows.push(Array.from({ length: 10 }, (_, j) => i + j + 1));
  }

  return (
    <div className="px-2 py-2 ">
      {/* Selection info */}
     <div
  className="relative flex items-center gap-4 px-4 py-4 mb-3 ml-10 h-40 rounded-xl overflow-hidden"
  style={{
    background: 'linear-gradient(180deg,#1a2d33 0%,#142126 100%)',
    border: '1px solid #23363d',
  }}
>

  {/* floating balls */}
  <div className="absolute left-6 -top-4 flex gap-2">

    <div
      className="w-9 h-9 mt-5 rounded-full flex items-center justify-center text-xs font-bold"
      style={{
        background: 'radial-gradient(circle at 30% 30%,#3a4d56,#0f1c22)',
        color: '#cbd5e1',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)'
      }}
    >
      80
    </div>

    <div
      className="w-11 h-11 mt-5 rounded-full flex items-center justify-center text-sm font-bold"
      style={{
        background: 'radial-gradient(circle at 30% 30%,#3a4d56,#0f1c22)',
        color: '#cbd5e1'
      }}
    >
      10
    </div>

  </div>

  {/* big green ball */}
  <div
    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
    style={{
      background: 'radial-gradient(circle at 100% 100%,#4ade80,#166534)',
      color: '#fff',
      boxShadow: '0 0 20px rgba(58, 69, 62, 0.5)'
    }}
  >
    {selectedNumbers.length || 1}
  </div>

  {/* title */}
  <div className="flex-1">

    <h2
      className="text-xl font-bold"
      style={{ color: '#e6edf3' }}
    >
      Choose 10 numbers
    </h2>

    <p
      className="text-sm font-semibold"
      style={{ color: '#4ade80' }}
    >
      From 1 to 80
    </p>

  </div>

  {/* help icon */}
  <div
    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
    style={{
      background: '#1a2d33',
      border: '1px solid #2e4850',
      color: '#6ee7b7'
    }}
  >
    ?
  </div>

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
              style={{
                minHeight: '36px',
                fontSize: '13px',
              }}
            >
              <span className="  text-white tracking-[0.1em] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
            {num}
          </span>
             
              {hotCold === 'hot' && !isSelected && !isDrawn && <span className="hot-dot" />}
              {hotCold === 'cold' && !isSelected && !isDrawn && <span className="cold-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
