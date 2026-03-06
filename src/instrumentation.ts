/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts.
 * Used to bootstrap background services (Telegram bot, workers).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (not during build or on the edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrap } = await import('@/infra/bootstrap');
    await bootstrap();
  }
}
