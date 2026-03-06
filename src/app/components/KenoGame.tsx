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

const BallDraw3D = dynamic(() => import('@/app/components/BallDraw3D'), {
  ssr: false,
  loading: () => <div style={{ height: '180px' }} />,
});

/**
 * KenoGame - Main game page
 *
 * REAL KENO FLOW (DB-backed):
 * 1. Fetch active round from /api/game/round (creates one if none)
 * 2. Timer counts down from round's startedAt
 * 3. Player selects numbers + places bet via /api/game/bet
 * 4. When timer hits 0 → call /api/game/draw → server draws 20 numbers + settles bets
 * 5. Show drawn numbers with animation
 * 6. After animation → fetch new round → restart cycle
 */
export default function KenoGame() {
  const {
    activeTab, isDrawing, drawnNumbers,
    setActiveRound, setAllBets, setRoundHistory, setStatistics, setLeaderboard,
    setTimeRemaining, addDrawnNumber, setDrawing, resetRound, setUser, setWallet,
  } = useGameStore();

  const { initData, isTelegram, isReady } = useTelegram();
  const authAttempted = useRef(false);
  const drawInProgress = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── AUTH ────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || authAttempted.current) return;
    authAttempted.current = true;

    const doAuth = async () => {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: isTelegram ? initData : '' }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setUser(data.data.user, data.data.token);
          if (data.data.user?.id) {
            const walletRes = await fetch(`/api/wallet/balance?userId=${data.data.user.id}`);
            const walletData = await walletRes.json();
            if (walletData.success) setWallet(walletData.data);
          }
        }
      } catch (err) {
        console.error('[GAME] Auth failed:', err);
      }
    };
    doAuth();
  }, [isReady, isTelegram, initData, setUser, setWallet]);

  // ─── FETCH GAME DATA FROM DB ────────────────────────────
  const fetchGameData = useCallback(async () => {
    try {
      const res = await fetch('/api/game/round');
      const data = await res.json();
      if (!data.success) return;

      const { activeRound, history, statistics, leaderboard, activeBets } = data.data;
      if (activeRound) {
        setActiveRound(activeRound);
        setTimeRemaining(activeRound.timeRemaining);
      }
      setAllBets(activeBets || []);
      setRoundHistory(history || []);
      setStatistics(statistics || []);
      setLeaderboard(leaderboard || []);
    } catch (err) {
      console.error('[GAME] Fetch error:', err);
    }
  }, [setActiveRound, setAllBets, setRoundHistory, setStatistics, setLeaderboard, setTimeRemaining]);

  // ─── TRIGGER DRAW (calls /api/game/draw) ────────────────
  const triggerDraw = useCallback(async () => {
    if (drawInProgress.current) return;
    drawInProgress.current = true;

    const state = useGameStore.getState();
    const roundId = state.activeRound?.id;
    if (!roundId) {
      drawInProgress.current = false;
      return;
    }

    console.log('[GAME] Triggering draw for round:', roundId);
    setDrawing(true);

    try {
      const res = await fetch('/api/game/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      const data = await res.json();

      if (data.success && data.data.drawnNumbers) {
        const nums: number[] = data.data.drawnNumbers;

        // Animate balls one by one
        useGameStore.setState({
          activeRound: state.activeRound ? {
            ...state.activeRound,
            status: 'DRAWING',
          } : null,
        });

        for (let i = 0; i < nums.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          addDrawnNumber(nums[i], i);
        }

        // Check if user won — update wallet
        const userState = useGameStore.getState();
        if (userState.user?.id) {
          const walletRes = await fetch(`/api/wallet/balance?userId=${userState.user.id}`);
          const walletData = await walletRes.json();
          if (walletData.success) setWallet(walletData.data);
        }

        // Wait, then start next round
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (err) {
      console.error('[GAME] Draw failed:', err);
    }

    setDrawing(false);
    resetRound();
    await fetchGameData(); // Fetch new round
    drawInProgress.current = false;
  }, [setDrawing, addDrawnNumber, resetRound, fetchGameData, setWallet]);

  // ─── TIMER COUNTDOWN (drives the game loop) ─────────────
  useEffect(() => {
    // Initial fetch
    fetchGameData();

    // Timer ticks every second
    timerRef.current = setInterval(() => {
      const state = useGameStore.getState();
      if (state.isDrawing) return; // Don't tick during draw

      if (state.timeRemaining > 0) {
        setTimeRemaining(state.timeRemaining - 1);
      } else if (state.timeRemaining <= 0 && state.activeRound && !drawInProgress.current) {
        // Timer expired — trigger the draw
        triggerDraw();
      }
    }, 1000);

    // Also poll for fresh data periodically
    const pollInterval = setInterval(fetchGameData, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(pollInterval);
    };
  }, [fetchGameData, setTimeRemaining, triggerDraw]);

  // ─── RENDER ─────────────────────────────────────────────
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
