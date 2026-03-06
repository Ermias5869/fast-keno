/**
 * Auth Service
 * Handles Telegram WebApp authentication, JWT token management,
 * and user session lifecycle.
 *
 * NOW USES PRISMA + PostgreSQL for persistent storage.
 *
 * CRITICAL: Never trust frontend user data. Always verify on server.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '@/infra/db';
import { createLogger } from '@/infra/logger';
import type { TelegramUser, AuthResponse } from '@/shared/types';
import { AuthenticationError } from '@/shared/errors';

const log = createLogger('auth-service');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// ============================================
// TELEGRAM VERIFICATION
// ============================================

/**
 * Verify Telegram WebApp initData signature
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramAuth(initData: string): TelegramUser {
  if (!BOT_TOKEN) {
    log.warn('TELEGRAM_BOT_TOKEN not set, using dev mode');
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

  params.delete('hash');

  const checkString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash))) {
    throw new AuthenticationError('Invalid Telegram signature');
  }

  const authDate = parseInt(params.get('auth_date') || '0');
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) {
    throw new AuthenticationError('Authentication data expired');
  }

  const userJson = params.get('user');
  if (!userJson) throw new AuthenticationError('No user data in initData');

  return JSON.parse(userJson) as TelegramUser;
}

// ============================================
// USER MANAGEMENT (Prisma)
// ============================================

/**
 * Create or update user from Telegram data — persisted to PostgreSQL
 */
export async function findOrCreateUser(telegramUser: TelegramUser) {
  const telegramId = telegramUser.id.toString();

  // Upsert: create if not exists, update if exists
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      username: telegramUser.username || undefined,
      firstName: telegramUser.first_name,
      photoUrl: telegramUser.photo_url || undefined,
    },
    create: {
      telegramId,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name,
      photoUrl: telegramUser.photo_url || null,
      role: 'PLAYER',
      wallet: {
        create: {
          balance: 10000, // Starting balance for demo
          lockedBalance: 0,
          totalDeposit: 0,
          totalWithdraw: 0,
        },
      },
    },
    include: {
      wallet: true,
    },
  });

  log.info(user.createdAt.getTime() === user.updatedAt.getTime() ? 'New user created' : 'User updated', {
    userId: user.id,
    telegramId,
    username: user.username,
  });

  return user;
}

// ============================================
// JWT TOKEN MANAGEMENT
// ============================================

/**
 * Generate JWT token pair and persist session
 */
export async function generateTokens(userId: string): Promise<{ token: string; refreshToken: string }> {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  // Store session in DB
  await prisma.session.create({
    data: {
      userId,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { token, refreshToken };
}

/**
 * Verify JWT token and return user
 */
export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { wallet: true },
    });
    if (!user) throw new AuthenticationError('User not found');
    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Invalid or expired token');
  }
}

// ============================================
// AUTH FLOWS
// ============================================

/**
 * Full Telegram authentication flow
 */
export async function authenticateTelegram(initData: string): Promise<AuthResponse> {
  const telegramUser = verifyTelegramAuth(initData);
  const user = await findOrCreateUser(telegramUser);
  const tokens = await generateTokens(user.id);

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
export async function refreshAuthToken(refreshToken: string): Promise<AuthResponse> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'refresh') throw new AuthenticationError('Invalid refresh token');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { wallet: true },
    });
    if (!user) throw new AuthenticationError('User not found');

    const tokens = await generateTokens(user.id);

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
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
}

/**
 * Get user by ID - synchronous in-memory cache for game engine compatibility
 * Falls back to null if not cached yet
 */
const userCache = new Map<string, { id: string; username: string | null; balance: number; lockedBalance: number }>();

export function getUserByIdSync(userId: string) {
  return userCache.get(userId) || null;
}

export function cacheUser(userId: string, data: { username: string | null; balance: number; lockedBalance: number }) {
  userCache.set(userId, { id: userId, ...data });
}

/**
 * Get all users (admin)
 */
export async function getAllUsers() {
  return prisma.user.findMany({ include: { wallet: true } });
}

/**
 * Create a dev user for testing without Telegram
 */
export async function createDevUser(username: string = 'dev_user'): Promise<AuthResponse> {
  const telegramId = Math.floor(Math.random() * 1000000000).toString();

  const user = await prisma.user.create({
    data: {
      telegramId,
      username,
      firstName: username,
      role: 'PLAYER',
      wallet: {
        create: {
          balance: 10000,
          lockedBalance: 0,
          totalDeposit: 0,
          totalWithdraw: 0,
        },
      },
    },
    include: { wallet: true },
  });

  // Cache for game engine
  cacheUser(user.id, {
    username: user.username,
    balance: Number(user.wallet?.balance || 0),
    lockedBalance: Number(user.wallet?.lockedBalance || 0),
  });

  const tokens = await generateTokens(user.id);

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
