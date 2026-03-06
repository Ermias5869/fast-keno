'use client';

/**
 * useTelegram — React hook using @twa-dev/sdk for Telegram WebApp.
 *
 * Exposes:
 *   user       — Telegram user object
 *   initData   — raw initData string for backend verification
 *   isTelegram — true if running inside Telegram WebApp
 */

import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface UseTelegramReturn {
  user: TelegramUser | null;
  initData: string;
  isTelegram: boolean;
  isReady: boolean;
}

export function useTelegram(): UseTelegramReturn {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Dynamic import — @twa-dev/sdk only works in browser
        const WebApp = (await import('@twa-dev/sdk')).default;

        console.log('[TG] SDK loaded, platform:', WebApp.platform);
        console.log('[TG] initData length:', WebApp.initData?.length || 0);
        console.log('[TG] initDataUnsafe.user:', JSON.stringify(WebApp.initDataUnsafe?.user));

        WebApp.ready();
        WebApp.expand();

        const tgInitData = WebApp.initData;
        const tgUser = WebApp.initDataUnsafe?.user;

        if (tgInitData && tgInitData.length > 0) {
          setIsTelegram(true);
          setInitData(tgInitData);
          console.log('[TG] Running inside Telegram, initData available');
        } else {
          setIsTelegram(false);
          console.log('[TG] Not inside Telegram or initData empty');
        }

        if (tgUser) {
          setUser(tgUser as TelegramUser);
          console.log('[TG] User found:', tgUser.id, tgUser.first_name);
        }

        setIsReady(true);
      } catch (err) {
        console.log('[TG] SDK not available (not in Telegram):', err);
        setIsTelegram(false);
        setIsReady(true);
      }
    };

    init();
  }, []);

  return { user, initData, isTelegram, isReady };
}

export default useTelegram;
