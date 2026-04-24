/**
 * Log cleanup scheduler - automatically removes old logs and completed events.
 * Uses Supabase for all database operations.
 */

import logger from './logger.js';

const LOG_RETENTION_DAYS = 30;
const EVENT_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Clean up old logs and archived events from Supabase database.
 */
export async function cleanupOldData(): Promise<{ logsDeleted: number; eventsArchived: number }> {
  try {
    const { supabase } = await import('../mining/databaseAdapter.js');
    const logCutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const eventCutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let logsDeleted = 0;
    let eventsArchived = 0;

    // Delete old logs
    try {
      const { count } = await supabase()
        .from('mining_logs')
        .delete({ count: 'exact' })
        .lt('created_at', logCutoff);
      logsDeleted = count || 0;
    } catch (error) {
      logger.error('Failed to cleanup logs:', { error: (error as Error).message });
    }

    // Archive old finished events
    try {
      const { count } = await supabase()
        .from('mining_events')
        .update({ status: 'ARCHIVED' })
        .eq('status', 'FINISHED')
        .lt('created_at', eventCutoff)
        .neq('status', 'ARCHIVED');
      eventsArchived = (count as number) || 0;
    } catch (error) {
      logger.error('Failed to archive events:', { error: (error as Error).message });
    }

    // Cleanup expired refresh tokens
    try {
      const { refreshTokenOps } = await import('../mining/databaseAdapter.js');
      await refreshTokenOps.cleanupExpired();
    } catch {
      // Non-critical
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
