// ============================================
// CORE GAME TYPES
// ============================================

export interface GameConfig {
  totalNumbers: number;       // 80
  drawCount: number;          // 20
  maxPicks: number;           // 10
  minPicks: number;           // 1
  minBet: number;
  maxBet: number;
  roundDurationMs: number;    // betting window
  drawIntervalMs: number;     // 500ms per ball
}

export interface RoundState {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  drawnNumbers: number[];
  timeRemaining: number;
  totalBets: number;
}

export type RoundStatus = 'BETTING_OPEN' | 'BETTING_CLOSED' | 'DRAWING' | 'FINISHED' | 'CANCELLED';
export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'CANCELLED' | 'REFUNDED';
export type TransactionType = 'BET' | 'WIN' | 'DEPOSIT' | 'WITHDRAW' | 'ROLLBACK';

// ============================================
// USER & AUTH TYPES
// ============================================

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  role: 'PLAYER' | 'ADMIN';
}

// ============================================
// WALLET TYPES
// ============================================

export interface WalletState {
  balance: number;
  lockedBalance: number;
  totalDeposit: number;
  totalWithdraw: number;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  roundId: string | null;
  createdAt: string;
}

// ============================================
// BET TYPES
// ============================================

export interface BetRequest {
  roundId: string;
  selectedNumbers: number[];
  amount: number;
}

export interface BetResult {
  id: string;
  userId: string;
  username: string | null;
  selectedNumbers: number[];
  matchedNumbers: number[];
  amount: number;
  multiplier: number | null;
  payout: number | null;
  status: BetStatus;
}

export interface PublicBet {
  id: string;
  maskedUsername: string;
  selectedNumbers: number[];
  amount: number;
  status: BetStatus;
  payout: number | null;
}

// ============================================
// RISK ENGINE TYPES
// ============================================

export interface ExposureState {
  currentExposure: number;
  maxAllowedExposure: number;
  houseProfit: number;
  activeLiability: number;
}

export interface OutcomeRiskMap {
  outcomeId: string;
  maxLoss: number;
  probability: number;
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  currentExposure: number;
  potentialPayout: number;
}

// ============================================
// SOCKET EVENT TYPES
// ============================================

export interface SocketEvents {
  // Server -> Client
  round_started: (data: RoundState) => void;
  bet_accepted: (data: PublicBet) => void;
  ball_drawn: (data: { number: number; index: number; total: number }) => void;
  round_finished: (data: { roundId: string; drawnNumbers: number[]; results: BetResult[] }) => void;
  balance_updated: (data: { balance: number; lockedBalance: number }) => void;
  timer_update: (data: { timeRemaining: number }) => void;

  // Client -> Server
  place_bet: (data: BetRequest) => void;
  join_round: (data: { roundId: string }) => void;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminDashboard {
  activeRounds: number;
  totalBetsToday: number;
  totalPayoutToday: number;
  realtimeProfit: number;
  activeLiability: number;
  riskWarnings: string[];
  activeUsers: number;
}

export interface PayoutTableEntry {
  picks: number;
  matches: number;
  multiplier: number;
}

// ============================================
// PROVABLY FAIR TYPES
// ============================================

export interface ProvablyFairData {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string; // Only revealed after round
}

// ============================================
// LEADERBOARD & STATISTICS
// ============================================

export interface LeaderboardEntry {
  rank: number;
  maskedId: string;
  betAmount: number;
  winAmount: number;
}

export interface NumberStatistic {
  number: number;
  frequency: number;
}

export interface DrawResult {
  drawId: string;
  roundNumber: number;
  timestamp: string;
  combination: number[];
}

// ============================================
// API RESPONSE WRAPPER
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
