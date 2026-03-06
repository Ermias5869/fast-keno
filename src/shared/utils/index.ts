import crypto from 'crypto';

/**
 * Mask a username for public display (e.g., "john_doe" -> "j***e")
 */
export function maskUsername(username: string | null): string {
  if (!username || username.length < 2) return '****';
  if (username.length <= 3) return username[0] + '***';
  return username[0] + '***' + username[username.length - 1];
}

/**
 * Generate a cryptographically secure random seed
 */
export function generateSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a seed using SHA-256
 */
export function hashSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

/**
 * Generate provably fair random numbers using combined seeds
 * Uses HMAC-SHA256 to ensure deterministic but fair output
 */
export function generateFairNumbers(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
  max: number
): number[] {
  const numbers: Set<number> = new Set();
  let iteration = 0;

  while (numbers.size < count) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${iteration}`);
    const hash = hmac.digest('hex');

    // Extract 4-byte chunks from the hash to generate numbers
    for (let i = 0; i < hash.length - 7 && numbers.size < count; i += 8) {
      const hex = hash.substring(i, i + 8);
      const value = parseInt(hex, 16);
      const number = (value % max) + 1; // 1-based
      numbers.add(number);
    }
    iteration++;

    // Safety: prevent infinite loop
    if (iteration > 1000) break;
  }

  return Array.from(numbers).slice(0, count);
}

/**
 * Generate random numbers using crypto.randomInt (non-provably-fair fallback)
 */
export function generateSecureRandomNumbers(count: number, max: number): number[] {
  const numbers: Set<number> = new Set();
  while (numbers.size < count) {
    const num = crypto.randomInt(1, max + 1);
    numbers.add(num);
  }
  return Array.from(numbers);
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'ETB'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Calculate match count between selected and drawn numbers
 */
export function calculateMatches(selected: number[], drawn: number[]): number[] {
  const drawnSet = new Set(drawn);
  return selected.filter(n => drawnSet.has(n));
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique round number based on timestamp
 */
export function generateRoundNumber(): number {
  return Math.floor(Date.now() / 1000);
}
