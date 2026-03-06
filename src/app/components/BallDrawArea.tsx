'use client';

import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * BallDrawArea - Shows the animated ball drawing area
 * Displays current ball being drawn and the result row
 * Matches reference: large ball number animation + drawn number chips below
 */
export default function BallDrawArea() {
  const { drawnNumbers, currentBall, currentBallIndex, isDrawing } = useGameStore();

  if (!isDrawing && drawnNumbers.length === 0) return null;

  return (
    <div className="draw-area py-4 px-3">
      {/* Current ball being drawn */}
      {isDrawing && currentBall !== null && (
        <div className="flex flex-col items-center mb-3">
          {/* Draw counter */}
          <div className="text-xs mb-2" style={{ color: '#8b949e' }}>
            {currentBallIndex + 1} / 20
          </div>

          {/* Large animated ball */}
          <div
            key={`ball-${currentBall}-${currentBallIndex}`}
            className="glow-ball w-16 h-16 text-2xl"
            style={{ color: '#fff' }}
          >
            {currentBall}
          </div>
        </div>
      )}

      {/* Drawn numbers row */}
      {drawnNumbers.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {drawnNumbers.map((num, i) => (
            <div
              key={`drawn-${i}`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: i === drawnNumbers.length - 1 && isDrawing
                  ? 'radial-gradient(circle, #4ade80 0%, #166534 70%)'
                  : 'var(--bg-cell)',
                color: i === drawnNumbers.length - 1 && isDrawing ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                animation: i === drawnNumbers.length - 1 ? 'ball-drop 0.5s ease-out' : undefined,
              }}
            >
              {num}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
