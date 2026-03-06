/**
 * Redis Infrastructure
 * Provides Redis client for caching, pub/sub, and session management.
 * Falls back to in-memory storage when Redis is not available.
 */

type RedisStore = Map<string, { value: string; expiry?: number }>;

class InMemoryRedis {
  private store: RedisStore = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (parseInt(current || '0') + 1).toString();
    this.store.set(key, { value: next });
    return parseInt(next);
  }

  async incrby(key: string, amount: number): Promise<number> {
    const current = await this.get(key);
    const next = (parseFloat(current || '0') + amount).toString();
    this.store.set(key, { value: next });
    return parseFloat(next);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const current = await this.get(key);
    const hash = current ? JSON.parse(current) : {};
    hash[field] = value;
    this.store.set(key, { value: JSON.stringify(hash) });
  }

  async hget(key: string, field: string): Promise<string | null> {
    const current = await this.get(key);
    if (!current) return null;
    const hash = JSON.parse(current);
    return hash[field] || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const current = await this.get(key);
    if (!current) return {};
    return JSON.parse(current);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
    }
  }

  async publish(_channel: string, _message: string): Promise<void> {
    // No-op for in-memory
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }
}

// Singleton Redis client (in-memory fallback for development)
const redis = new InMemoryRedis();

export default redis;

// Redis key helpers
export const RedisKeys = {
  roundState: (roundId: string) => `round:${roundId}:state`,
  roundExposure: (roundId: string) => `round:${roundId}:exposure`,
  roundBets: (roundId: string) => `round:${roundId}:bets`,
  userSession: (userId: string) => `session:${userId}`,
  rateLimit: (ip: string) => `rate:${ip}`,
  houseProfit: () => 'house:profit',
  exposure: () => 'risk:exposure',
  activeRound: () => 'game:active_round',
};
