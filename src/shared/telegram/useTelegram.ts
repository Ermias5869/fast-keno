'use client';

/**
 * useTelegram — React hook for Telegram WebApp integration.
 *
 * Exposes:
 *   user       — Telegram user object (id, first_name, username, photo_url)
 *   initData   — raw initData string for backend verification
 *   themeParams — Telegram theme colors
 *   isTelegram — true if running inside Telegram WebApp
 *
 * Usage:
 *   const { user, initData, isTelegram } = useTelegram();
 */

import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface UseTelegramReturn {
  user: TelegramUser | null;
  initData: string;
  themeParams: TelegramThemeParams;
  isTelegram: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
}

// Access the global Telegram WebApp object
function getWebApp(): {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: { user?: TelegramUser; [key: string]: unknown };
  themeParams: TelegramThemeParams;
  platform: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} | null {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  return tg || null;
}

export function useTelegram(): UseTelegramReturn {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');
  const [themeParams, setThemeParams] = useState<TelegramThemeParams>({});
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) {
      setIsTelegram(false);
      return;
    }

    setIsTelegram(true);
    setInitData(webApp.initData || '');
    setThemeParams(webApp.themeParams || {});

    const tgUser = webApp.initDataUnsafe?.user;
    if (tgUser) {
      setUser(tgUser);
    }

    // Signal Telegram that the app is ready
    webApp.ready();
    // Expand to full screen
    webApp.expand();
  }, []);

  const ready = useCallback(() => {
    getWebApp()?.ready();
  }, []);

  const expand = useCallback(() => {
    getWebApp()?.expand();
  }, []);

  const close = useCallback(() => {
    getWebApp()?.close();
  }, []);

  return {
    user,
    initData,
    themeParams,
    isTelegram,
    ready,
    expand,
    close,
  };
}

export default useTelegram;
