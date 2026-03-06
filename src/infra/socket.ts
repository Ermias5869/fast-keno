/**
 * Socket.io Infrastructure
 * Manages real-time event broadcasting for the Keno game.
 * In development, uses a simple event emitter pattern.
 */

import type { RoundState, PublicBet, BetResult } from '@/shared/types';

type EventHandler = (...args: unknown[]) => void;

class SocketManager {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private static instance: SocketManager;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Socket handler error for ${event}:`, err);
      }
    });
  }

  // Game-specific emitters
  emitRoundStarted(round: RoundState) {
    this.emit('round_started', round);
  }

  emitBetAccepted(bet: PublicBet) {
    this.emit('bet_accepted', bet);
  }

  emitBallDrawn(data: { number: number; index: number; total: number }) {
    this.emit('ball_drawn', data);
  }

  emitRoundFinished(data: { roundId: string; drawnNumbers: number[]; results: BetResult[] }) {
    this.emit('round_finished', data);
  }

  emitBalanceUpdated(userId: string, data: { balance: number; lockedBalance: number }) {
    this.emit(`balance_updated:${userId}`, data);
  }

  emitTimerUpdate(data: { timeRemaining: number }) {
    this.emit('timer_update', data);
  }
}

export const socketManager = SocketManager.getInstance();
export default socketManager;
