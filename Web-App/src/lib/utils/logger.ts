/**
 * Client-side logger for Web-App.
 * Only logs in development mode to avoid console noise in production.
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]) => {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, ...args);
  },
};

export default logger;
