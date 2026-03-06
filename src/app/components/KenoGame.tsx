'use client';

import React, { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import GameHeader from '@/app/components/GameHeader';
import NumberGrid from '@/app/components/NumberGrid';
import BetControls from '@/app/components/BetControls';
import BallDrawArea from '@/app/components/BallDrawArea';
import TabNavigation from '@/app/components/TabNavigation';
import GameTab from '@/app/components/tabs/GameTab';
import HistoryTab from '@/app/components/tabs/HistoryTab';
import ResultsTab from '@/app/components/tabs/ResultsTab';
import StatisticsTab from '@/app/components/tabs/StatisticsTab';
import LeadersTab from '@/app/components/tabs/LeadersTab';
import useGameStore from '@/app/store/gameStore';

// Dynamic import for Three.js (client-only)
const BallDraw3D = dynamic(() => import('@/app/components/BallDraw3D'), {
  ssr: false,
  loading: () => <div style={{ height: '180px' }} />,
});

/**
 * KenoGame - Main game page
 * Assembles all components into the full game interface
 */
export default function KenoGame() {
  const {
    activeTab,
    isDrawing,
    drawnNumbers,
    setActiveRound,
    setAllBets,
    setRoundHistory,
    setStatistics,
    setLeaderboard,
    setTimeRemaining,
    addDrawnNumber,
    setDrawing,
    resetRound,
  } = useGameStore();

  // Fetch initial game data
  const fetchGameData = useCallback(async () => {
    try {
      const res = await fetch('/api/game/round');
      const data = await res.json();
      if (data.success) {
        if (data.data.activeRound) {
          setActiveRound(data.data.activeRound);
          setTimeRemaining(data.data.activeRound.timeRemaining);
        }
        setAllBets(data.data.activeBets || []);
        setRoundHistory(data.data.history || []);
        setStatistics(data.data.statistics || []);
        setLeaderboard(data.data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch game data:', err);
    }
  }, [setActiveRound, setAllBets, setRoundHistory, setStatistics, setLeaderboard, setTimeRemaining]);

  // Start a new round
  const startRound = useCallback(async () => {
    try {
      const res = await fetch('/api/game/bet', { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        resetRound();
        setActiveRound(data.data);
        setTimeRemaining(data.data.timeRemaining || 54);
      }
    } catch (err) {
      console.error('Failed to start round:', err);
    }
  }, [resetRound, setActiveRound, setTimeRemaining]);

  // Initialize
  useEffect(() => {
    fetchGameData();
    startRound();

    // Poll for updates
    const interval = setInterval(fetchGameData, 5000);
    return () => clearInterval(interval);
  }, [fetchGameData, startRound]);

  // Simulated timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const state = useGameStore.getState();
      if (state.activeRound?.status === 'BETTING_OPEN' && state.timeRemaining > 0) {
        setTimeRemaining(state.timeRemaining - 1);

        // When timer hits 0, simulate draw
        if (state.timeRemaining <= 1) {
          simulateDraw();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [setTimeRemaining]);

  // Simulate ball drawing (client-side preview)
  const simulateDraw = async () => {
    setDrawing(true);
    const state = useGameStore.getState();
    if (state.activeRound) {
      useGameStore.setState({
        activeRound: { ...state.activeRound, status: 'DRAWING' },
      });
    }

    // Draw 20 random numbers
    const drawn = new Set<number>();
    while (drawn.size < 20) {
      drawn.add(Math.floor(Math.random() * 80) + 1);
    }
    const numbers = Array.from(drawn);

    for (let i = 0; i < numbers.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addDrawnNumber(numbers[i], i);
    }

    // Wait a moment then reset for next round
    setTimeout(async () => {
      setDrawing(false);
      await fetchGameData();
      await startRound();
    }, 3000);
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'GAME': return <GameTab />;
      case 'HISTORY': return <HistoryTab />;
      case 'RESULTS': return <ResultsTab />;
      case 'STATISTICS': return <StatisticsTab />;
      case 'LEADERS': return <LeadersTab />;
      default: return <GameTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)', maxWidth: '500px', margin: '0 auto' }}>
      {/* Header */}
      <GameHeader />

      {/* 3D Ball Draw Area */}
      {(isDrawing || drawnNumbers.length > 0) && (
        <BallDraw3D />
      )}

      {/* 2D Ball Draw Fallback / Result Row */}
      <BallDrawArea />

      {/* Number Grid */}
      <NumberGrid />

      {/* Bet Controls */}
      <BetControls />

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      <div className="flex-1" style={{ background: 'var(--bg-primary)' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
