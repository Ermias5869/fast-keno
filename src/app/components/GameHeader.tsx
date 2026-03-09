'use client';
import Image from "next/image";
import React from 'react';
import useGameStore from '@/app/store/gameStore';

/**
 * GameHeader - Top bar with FAST KENO logo, balance, round ID, timer.
 * Updated with exact 00:27 timer visual styling
 */
export default function GameHeader() {
  const { wallet, activeRound, timeRemaining, isDrawing } = useGameStore();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m} : ${s}`; // Added spaces for LCD segment spacing
  };

  const getStatusText = () => {
    if (isDrawing) return '🎱 DRAWING...';
    if (timeRemaining <= 0) return '⏳ SETTLING...';
    return null;
  };

  const statusText = getStatusText();

  return (
    <div className="relative w-full max-w-xl bg-[#06090c] overflow-hidden shadow-2xl">
      {/* Top header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Fast Keno"
            width={80}
            height={20}
            priority
          />
        </div>

        {/* Balance & ID Container - Pill shaped with border */}
        <div className="grid grid-cols-2 border border-white/5 bg-[#0d1616] w-60 divide-x divide-white/10 rounded-full overflow-hidden">
          {/* Balance */}
          <div className="flex items-center justify-center gap-1 py-1 px-4">
            <span className="text-sm text-amber-400 font-bold">
              {wallet.balance.toFixed(0)}
            </span>
            <span className="text-[10px] text-gray-500 font-bold">ETB</span>
          </div>

          {/* Round ID with checkmark */}
          <div className="flex items-center justify-center gap-2 py-1 px-3">
            <span className="text-xs text-gray-400">ID:</span>
            <span className="text-xs font-semibold text-gray-200">
              {activeRound?.roundNumber || "176701"}
            </span>
            <div className="bg-green-600 rounded-[4px] p-0.5 shadow-[0_0_8px_rgba(22,163,74,0.4)]">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Menu */}
        <button className="text-green-500/80 hover:text-white transition">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      {/* Timer Section - with LCD styling exactly like 00:27 image */}
      {timeRemaining > 0 && (<div className="relative w-full h-8 flex flex-col items-center justify-center">
        {/* Teal Fog Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.15)_0%,rgba(6,9,12,0)_70%)]" />

        {/* Central White Flare Streak - gives that bright core look */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[1px] bg-cyan-400 blur-[8px] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[0.5px] bg-white blur-[2px] opacity-40" />

        <div className="relative z-10 flex flex-col items-center">
          
          
          {/* LCD Numbers - exact styling from 00:27 image */}
          <span className="font-['Orbitron'] text-xl font-bold text-white tracking-[0.1em] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
            {formatTime(timeRemaining)}
          </span>
          
          {/* Floor Reflection Line - subtle glow line under numbers */}
          <div className="mt-2 w-12 h-[1.5px] bg-cyan-400/60 shadow-[0_0_10px_#22d3ee] blur-[1px]" />
        </div>
      </div>)}
    </div>
  );
}