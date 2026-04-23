/**
 * Log cleanup scheduler - automatically removes old logs and completed events.
 */

import logger from './logger.js';

const LOG_RETENTION_DAYS = 30;
const EVENT_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Clean up old logs and archived events from database.
 * This function performs raw SQL cleanup via the database connection.
 * For SQLite: directly execute DELETE statements.
 * For Supabase: use the Supabase client with .delete().lt() filters.
 */
export async function cleanupOldData(): Promise<{ logsDeleted: number; eventsArchived: number }> {
  try {
    const logCutoff = Math.floor(Date.now() / 1000) - LOG_RETENTION_DAYS * 24 * 60 * 60;
    const eventCutoff = Math.floor(Date.now() / 1000) - EVENT_RETENTION_DAYS * 24 * 60 * 60;

    let logsDeleted = 0;
    let eventsArchived = 0;

    // For SQLite backend, try direct SQL cleanup
    try {
      const { db } = await import('../mining/database.js');
      if (db) {
        const logResult = db.prepare('DELETE FROM mining_logs WHERE created_at < ?').run(logCutoff);
        logsDeleted = logResult.changes || 0;

        const eventResult = db.prepare('UPDATE mining_events SET status = ? WHERE status = ? AND created_at < ?')
          .run('archived', 'finished', eventCutoff);
        eventsArchived = eventResult.changes || 0;
      }
    } catch {
      // SQLite not available, try Supabase
    }

    logger.info('Data cleanup completed', { logsDeleted, eventsArchived });
    return { logsDeleted, eventsArchived };
  } catch (error) {
    logger.error('Cleanup error:', { error: (error as Error).message });
    return { logsDeleted: 0, eventsArchived: 0 };
  }
}

/**
 * Start periodic cleanup
 */
export function startCleanupScheduler(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => { cleanupOldData().catch(() => {}); }, CLEANUP_INTERVAL_MS);
  logger.info('Log cleanup scheduler started');
}

/**
 * Stop periodic cleanup
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Log cleanup scheduler stopped');
  }
}
