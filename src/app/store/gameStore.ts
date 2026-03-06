'use client';

import { create } from 'zustand';
import type { RoundState, PublicBet, WalletState, UserProfile } from '@/shared/types';

// ============================================
// GAME STORE
// ============================================

interface GameState {
  // User
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;

  // Wallet
  wallet: WalletState;

  // Round
  activeRound: RoundState | null;
  timeRemaining: number;
  drawnNumbers: number[];
  isDrawing: boolean;
  currentBall: number | null;
  currentBallIndex: number;

  // Betting
  selectedNumbers: number[];
  betAmount: number;
  hasBet: boolean;

  // Tab state
  activeTab: 'GAME' | 'HISTORY' | 'RESULTS' | 'STATISTICS' | 'LEADERS';
  activeBetFilter: 'all' | 'my_tickets' | 'my_bets';

  // Data
  allBets: PublicBet[];
  roundHistory: Array<{
    drawId: string;
    roundNumber: number;
    timestamp: string;
    combination: number[];
  }>;
  statistics: Array<{ number: number; frequency: number }>;
  leaderboard: Array<{ rank: number; maskedId: string; betAmount: number; winAmount: number }>;

  // Actions
  setUser: (user: UserProfile | null, token: string | null) => void;
  setWallet: (wallet: Partial<WalletState>) => void;
  toggleNumber: (num: number) => void;
  clearSelection: () => void;
  setBetAmount: (amount: number) => void;
  doubleBet: () => void;
  maxBet: () => void;
  setActiveTab: (tab: GameState['activeTab']) => void;
  setBetFilter: (filter: GameState['activeBetFilter']) => void;
  setActiveRound: (round: RoundState | null) => void;
  setTimeRemaining: (time: number) => void;
  addDrawnNumber: (num: number, index: number) => void;
  setDrawing: (drawing: boolean) => void;
  setAllBets: (bets: PublicBet[]) => void;
  addBet: (bet: PublicBet) => void;
  setHasBet: (hasBet: boolean) => void;
  setRoundHistory: (history: GameState['roundHistory']) => void;
  setStatistics: (stats: GameState['statistics']) => void;
  setLeaderboard: (leaders: GameState['leaderboard']) => void;
  resetRound: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // User
  user: null,
  token: null,
  isAuthenticated: false,

  // Wallet
  wallet: {
    balance: 10000,
    lockedBalance: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
  },

  // Round
  activeRound: null,
  timeRemaining: 54,
  drawnNumbers: [],
  isDrawing: false,
  currentBall: null,
  currentBallIndex: 0,

  // Betting
  selectedNumbers: [],
  betAmount: 5,
  hasBet: false,

  // Tab state
  activeTab: 'GAME',
  activeBetFilter: 'all',

  // Data
  allBets: [],
  roundHistory: [],
  statistics: [],
  leaderboard: [],

  // Actions
  setUser: (user, token) => set({ user, token, isAuthenticated: !!user }),

  setWallet: (wallet) => set((state) => ({
    wallet: { ...state.wallet, ...wallet },
  })),

  toggleNumber: (num) => set((state) => {
    const idx = state.selectedNumbers.indexOf(num);
    if (idx >= 0) {
      return { selectedNumbers: state.selectedNumbers.filter(n => n !== num) };
    }
    if (state.selectedNumbers.length >= 10) return state; // Max 10
    return { selectedNumbers: [...state.selectedNumbers, num].sort((a, b) => a - b) };
  }),

  clearSelection: () => set({ selectedNumbers: [] }),

  setBetAmount: (amount) => set({ betAmount: Math.max(5, Math.min(10000, amount)) }),

  doubleBet: () => set((state) => ({
    betAmount: Math.min(10000, state.betAmount * 2),
  })),

  maxBet: () => set((state) => ({
    betAmount: Math.min(10000, state.wallet.balance),
  })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setBetFilter: (filter) => set({ activeBetFilter: filter }),
  setActiveRound: (round) => set({ activeRound: round }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),

  addDrawnNumber: (num, index) => set((state) => ({
    drawnNumbers: [...state.drawnNumbers, num],
    currentBall: num,
    currentBallIndex: index,
  })),

  setDrawing: (drawing) => set({ isDrawing: drawing }),
  setAllBets: (bets) => set({ allBets: bets }),
  addBet: (bet) => set((state) => ({ allBets: [bet, ...state.allBets] })),
  setHasBet: (hasBet) => set({ hasBet }),
  setRoundHistory: (history) => set({ roundHistory: history }),
  setStatistics: (stats) => set({ statistics: stats }),
  setLeaderboard: (leaders) => set({ leaderboard: leaders }),

  resetRound: () => set({
    drawnNumbers: [],
    isDrawing: false,
    currentBall: null,
    currentBallIndex: 0,
    hasBet: false,
    allBets: [],
  }),
}));

export default useGameStore;
