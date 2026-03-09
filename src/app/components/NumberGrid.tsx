'use client';

import React, { useMemo } from 'react';
import useGameStore from '@/app/store/gameStore';
import { getMultipliersForPicks, getMaxWin } from '@/app/lib/payoutClient';

/**
 * NumberGrid - 8×10 grid of numbers 1-80
 * Shows dynamic selection info when numbers are picked.
 */
export default function NumberGrid() {
  const { selectedNumbers, toggleNumber, drawnNumbers, isDrawing, statistics, betAmount } =
    useGameStore();

  const canSelect = !isDrawing;
  const pickCount = selectedNumbers.length;

  // Hot/cold analysis from statistics
  const hotColdMap = useMemo(() => {
    if (!statistics.length) return new Map<number, 'hot' | 'cold'>();
    const map = new Map<number, 'hot' | 'cold'>();
    const sorted = [...statistics].sort((a, b) => b.frequency - a.frequency);
    sorted.slice(0, 10).forEach((s) => map.set(s.number, 'hot'));
    sorted.slice(-10).forEach((s) => map.set(s.number, 'cold'));
    return map;
  }, [statistics]);

  const drawnSet = useMemo(() => new Set(drawnNumbers), [drawnNumbers]);
  const selectedSet = useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  // Non-zero multipliers for current pick count
  const multipliers = useMemo(
    () => (pickCount > 0 ? getMultipliersForPicks(pickCount) : []),
    [pickCount]
  );

  const maxWin = useMemo(
    () => (pickCount > 0 ? getMaxWin(pickCount, betAmount) : 0),
    [pickCount, betAmount]
  );

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
    <div className="px-2 py-2">
      {/* Selection info */}
      <div
        className="relative flex items-center gap-4 px-4 py-4 mb-3 ml-10 rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg,#1a2d33 0%,#142126 100%)',
          border: '1px solid #23363d',
          minHeight: '160px',
        }}
      >
        {pickCount === 0 ? (
          /* ---- No selection: decorative balls ---- */
          <>
            {/* floating balls */}
            <div className="absolute left-6 -top-4 flex gap-2">
              <div
                className="w-9 h-9 mt-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'radial-gradient(circle at 30% 30%,#3a4d56,#0f1c22)',
                  color: '#cbd5e1',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)',
                }}
              >
                80
              </div>
              <div
                className="w-11 h-11 mt-5 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: 'radial-gradient(circle at 30% 30%,#3a4d56,#0f1c22)',
                  color: '#cbd5e1',
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
                boxShadow: '0 0 20px rgba(58, 69, 62, 0.5)',
              }}
            >
              1
            </div>

            {/* title */}
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: '#e6edf3' }}>
                Choose 10 numbers
              </h2>
              <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                From 1 to 80
              </p>
            </div>

            {/* help icon */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
              style={{
                background: '#1a2d33',
                border: '1px solid #2e4850',
                color: '#6ee7b7',
              }}
            >
              ?
            </div>
          </>
        ) : (
          /* ---- Numbers selected: match/pays + chips ---- */
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '6px' }}>
            {/* Top row: possible win + help icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="possible-win text-lg font-bold">
                Possible win&nbsp;
                <span style={{ color: '#4ade80' }}>
                  {maxWin.toLocaleString()}
                </span>
              </p>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: '#1a2d33', border: '1px solid #2e4850', color: '#6ee7b7',
                }}
              >
                ?
              </div>
            </div>

            {/* Horizontal Match row */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, fontSize: 13, lineHeight: 1 }}>
              <span style={{ color: '#64748b', minWidth: 42 }}>Match</span>
              {multipliers.map((entry) => (
                <span key={`m-${entry.matches}`} style={{ color: '#cbd5e1' }}>
                  {entry.matches}
                </span>
              ))}
            </div>

            {/* Horizontal Pays row */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, fontSize: 13, lineHeight: 1 }}>
              <span style={{ color: '#64748b', minWidth: 42 }}>Pays</span>
              {multipliers.map((entry) => (
                <span key={`p-${entry.matches}`} style={{ color: '#cbd5e1' }}>
                  x{entry.multiplier}
                </span>
              ))}
            </div>

            {/* Selected number chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {selectedNumbers.map((num) => (
                <button
                  key={num}
                  className="selected-chip"
                  onClick={() => toggleNumber(num)}
                  title={`Deselect ${num}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 36, height: 32, padding: '0 8px',
                    borderRadius: 6, fontSize: 14, fontWeight: 700,
                    background: '#1a2d3d', border: '1px solid #21333d', color: '#e4e8ec',
                    cursor: 'pointer',
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-10 gap-1">
        {rows.flat().map((num) => {
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
              <span className="text-white tracking-[0.1em] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                {num}
              </span>

              {hotCold === 'hot' && !isSelected && !isDrawn && (
                <span className="hot-dot" />
              )}
              {hotCold === 'cold' && !isSelected && !isDrawn && (
                <span className="cold-dot" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
