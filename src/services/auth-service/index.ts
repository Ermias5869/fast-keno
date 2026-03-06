/**
 * Auth Service
 * Handles Telegram WebApp authentication, JWT token management,
 * and user session lifecycle.
 *
 * CRITICAL: Never trust frontend user data. Always verify on server.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createLogger } from '@/infra/logger';
import type { TelegramUser, AuthResponse, UserProfile } from '@/shared/types';
import { AuthenticationError } from '@/shared/errors';

const log = createLogger('auth-service');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// ============================================
// In-memory user & session store (dev mode)
// In production, these would use Prisma + PostgreSQL
// ============================================
interface StoredUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  role: 'PLAYER' | 'ADMIN';
  balance: number;
  lockedBalance: number;
}

const users = new Map<string, StoredUser>();
const sessions = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Verify Telegram WebApp initData signature
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramAuth(initData: string): TelegramUser {
  if (!BOT_TOKEN) {
    log.warn('TELEGRAM_BOT_TOKEN not set, using dev mode');
    // In dev mode, parse the initData as JSON directly
    try {
      const parsed = JSON.parse(initData);
      return parsed.user || parsed;
    } catch {
      throw new AuthenticationError('Invalid initData format');
    }
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new AuthenticationError('Missing hash in initData');

  // Remove hash from params for verification
  params.delete('hash');

  // Sort params alphabetically and create check string
  const checkString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Create HMAC using bot token
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash))) {
    throw new AuthenticationError('Invalid Telegram signature');
  }

  // Check auth_date is not too old (allow 1 hour)
  const authDate = parseInt(params.get('auth_date') || '0');
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) {
    throw new AuthenticationError('Authentication data expired');
  }

  // Extract user data
  const userJson = params.get('user');
  if (!userJson) throw new AuthenticationError('No user data in initData');

  return JSON.parse(userJson) as TelegramUser;
}

/**
 * Create or update user from Telegram data
 */
export function findOrCreateUser(telegramUser: TelegramUser): StoredUser {
  const telegramId = telegramUser.id.toString();
  let user = Array.from(users.values()).find(u => u.telegramId === telegramId);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      telegramId,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name,
      photoUrl: telegramUser.photo_url || null,
      role: 'PLAYER',
      balance: 10000, // Starting balance for demo
      lockedBalance: 0,
    };
    users.set(user.id, user);
    log.info('New user created', { userId: user.id, telegramId });
  } else {
    // Update user info
    user.username = telegramUser.username || user.username;
    user.firstName = telegramUser.first_name;
    user.photoUrl = telegramUser.photo_url || user.photoUrl;
    users.set(user.id, user);
  }

  return user;
}

/**
 * Generate JWT token pair
 */
export function generateTokens(userId: string): { token: string; refreshToken: string } {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  sessions.set(token, {
    userId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return { token, refreshToken };
}

/**
 * Verify JWT token and return user
 */
export function verifyToken(token: string): StoredUser {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = users.get(decoded.userId);
    if (!user) throw new AuthenticationError('User not found');
    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Full Telegram authentication flow
 */
export function authenticateTelegram(initData: string): AuthResponse {
  const telegramUser = verifyTelegramAuth(initData);
  const user = findOrCreateUser(telegramUser);
  const tokens = generateTokens(user.id);

  return {
    ...tokens,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      photoUrl: user.photoUrl,
      role: user.role,
    },
  };
}

/**
 * Refresh token flow
 */
export function refreshAuthToken(refreshToken: string): AuthResponse {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'refresh') throw new AuthenticationError('Invalid refresh token');

    const user = users.get(decoded.userId);
    if (!user) throw new AuthenticationError('User not found');

    const tokens = generateTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Invalid or expired refresh token');
  }
}

/**
 * Get user by ID (internal use)
 */
export function getUserById(userId: string): StoredUser | undefined {
  return users.get(userId);
}

/**
 * Get all users (admin)
 */
export function getAllUsers(): StoredUser[] {
  return Array.from(users.values());
}

/**
 * Create a dev user for testing without Telegram
 */
export function createDevUser(username: string = 'dev_user'): AuthResponse {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    telegramId: Math.floor(Math.random() * 1000000000).toString(),
    username,
    firstName: username,
    photoUrl: null,
    role: 'PLAYER',
    balance: 10000,
    lockedBalance: 0,
  };
  users.set(user.id, user);

  const tokens = generateTokens(user.id);
  return {
    ...tokens,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      photoUrl: user.photoUrl,
      role: user.role,
    },
  };
}
