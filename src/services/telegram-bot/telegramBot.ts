/**
 * Telegram Bot Service
 * Entry point that launches the SyntaxKeno web app as a Telegram Mini App.
 *
 * - Listens for /start command
 * - Sends inline keyboard with WebApp button
 * - Uses polling mode for development
 */

import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '@/infra/logger';

const log = createLogger('telegram-bot');

let bot: TelegramBot | null = null;

/**
 * Initialize and start the Telegram Bot
 */
export function startTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!token) {
    log.warn('TELEGRAM_BOT_TOKEN not set — bot will not start');
    return null;
  }

  if (!webAppUrl) {
    log.warn('TELEGRAM_WEBAPP_URL not set — bot will not start');
    return null;
  }

  // Prevent double-initialization (Next.js hot reload)
  if (bot) {
    log.info('Bot already running, skipping re-initialization');
    return bot;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    log.info('Telegram bot started with polling', { webAppUrl });

    // ─── /start command ───────────────────────────────────
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Player';

      log.info('/start received', { chatId, firstName });

      bot!.sendMessage(
        chatId,
        `🎰 Welcome to *SyntaxKeno*, ${firstName}!\n\n` +
        `Play Keno, pick your lucky numbers, and win big.\n` +
        `Tap the button below to open the game 👇`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🚀 Open SyntaxKeno',
                  web_app: { url: webAppUrl },
                },
              ],
              [
                {
                  text: '📖 How to Play',
                  callback_data: 'how_to_play',
                },
                {
                  text: '💰 My Balance',
                  callback_data: 'my_balance',
                },
              ],
            ],
          },
        }
      );
    });

    // ─── Callback queries ─────────────────────────────────
    bot.on('callback_query', (query) => {
      const chatId = query.message?.chat.id;
      if (!chatId) return;

      if (query.data === 'how_to_play') {
        bot!.answerCallbackQuery(query.id);
        bot!.sendMessage(
          chatId,
          `🎯 *How to Play SyntaxKeno*\n\n` +
          `1️⃣ Choose 1–10 numbers from 1 to 80\n` +
          `2️⃣ Set your bet amount\n` +
          `3️⃣ Tap BET and wait for the draw\n` +
          `4️⃣ 20 numbers are drawn — matches = wins!\n\n` +
          `The more numbers you match, the bigger the payout 🏆`,
          { parse_mode: 'Markdown' }
        );
      }

      if (query.data === 'my_balance') {
        bot!.answerCallbackQuery(query.id);
        bot!.sendMessage(
          chatId,
          `💰 Open the game to check your balance:\n`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Open SyntaxKeno', web_app: { url: webAppUrl } }],
              ],
            },
          }
        );
      }
    });

    // ─── Error handling ───────────────────────────────────
    bot.on('polling_error', (error) => {
      log.error('Bot polling error', { message: error.message });
    });

    bot.on('error', (error) => {
      log.error('Bot error', { message: error.message });
    });

    return bot;
  } catch (error) {
    log.error('Failed to start Telegram bot', { error: String(error) });
    return null;
  }
}

/**
 * Stop the bot gracefully
 */
export function stopTelegramBot(): void {
  if (bot) {
    bot.stopPolling();
    bot = null;
    log.info('Telegram bot stopped');
  }
}

export default { startTelegramBot, stopTelegramBot };
