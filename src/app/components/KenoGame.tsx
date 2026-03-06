'use client';

import React, { useEffect, useCallback, useRef } from 'react';
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
import useTelegram from '@/shared/telegram/useTelegram';

// Dynamic import for Three.js (client-only)
const BallDraw3D = dynamic(() => import('@/app/components/BallDraw3D'), {
  ssr: false,
  loading: () => <div style={{ height: '180px' }} />,
});

/**
 * KenoGame - Main game page
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
    setUser,
    setWallet,
  } = useGameStore();

  const { initData, isTelegram, isReady } = useTelegram();
  const authAttempted = useRef(false);

  // ─── AUTO-LOGIN: runs once when Telegram SDK is ready ─────
  useEffect(() => {
    if (!isReady) return;           // Wait for SDK to initialize
    if (authAttempted.current) return; // Only attempt once
    authAttempted.current = true;

    const doAuth = async () => {
      console.log('[GAME] Starting auth flow...');
      console.log('[GAME] isTelegram:', isTelegram);
      console.log('[GAME] initData length:', initData?.length || 0);

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: isTelegram ? initData : '',
          }),
        });

        const data = await res.json();
        console.log('[GAME] Auth response:', JSON.stringify(data));

        if (data.success && data.data) {
          setUser(data.data.user, data.data.token);
          console.log('[GAME] User set in store:', data.data.user.id);

          // Fetch wallet
          if (data.data.user?.id) {
            try {
              const walletRes = await fetch(`/api/wallet/balance?userId=${data.data.user.id}`);
              const walletData = await walletRes.json();
              console.log('[GAME] Wallet response:', JSON.stringify(walletData));
              if (walletData.success) setWallet(walletData.data);
            } catch (walletErr) {
              console.error('[GAME] Wallet fetch failed:', walletErr);
            }
          }
        } else {
          console.error('[GAME] Auth failed:', data.error);
        }
      } catch (err) {
        console.error('[GAME] Auth request failed:', err);
      }
    };

    doAuth();
  }, [isReady, isTelegram, initData, setUser, setWallet]);

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

    const interval = setInterval(fetchGameData, 5000);
    return () => clearInterval(interval);
  }, [fetchGameData, startRound]);

  // Simulated timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const state = useGameStore.getState();
      if (state.activeRound?.status === 'BETTING_OPEN' && state.timeRemaining > 0) {
        setTimeRemaining(state.timeRemaining - 1);

        if (state.timeRemaining <= 1) {
          simulateDraw();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [setTimeRemaining]);

  // Simulate ball drawing
  const simulateDraw = async () => {
    setDrawing(true);
    const state = useGameStore.getState();
    if (state.activeRound) {
      useGameStore.setState({
        activeRound: { ...state.activeRound, status: 'DRAWING' },
      });
    }

    const drawn = new Set<number>();
    while (drawn.size < 20) {
      drawn.add(Math.floor(Math.random() * 80) + 1);
    }
    const numbers = Array.from(drawn);

    for (let i = 0; i < numbers.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addDrawnNumber(numbers[i], i);
    }

    setTimeout(async () => {
      setDrawing(false);
      await fetchGameData();
      await startRound();
    }, 3000);
  };

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
      <GameHeader />
      {(isDrawing || drawnNumbers.length > 0) && <BallDraw3D />}
      <BallDrawArea />
      <NumberGrid />
      <BetControls />
      <TabNavigation />
      <div className="flex-1" style={{ background: 'var(--bg-primary)' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
