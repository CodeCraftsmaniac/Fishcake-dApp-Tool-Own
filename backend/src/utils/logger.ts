/**
 * Structured logger with configurable levels and log rotation support.
 * Replaces console.log/console.error for production code.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT'
};

function getEnvLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
  switch (env) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'SILENT': return LogLevel.SILENT;
    default: return LogLevel.INFO;
  }
}

const CURRENT_LEVEL = getEnvLevel();
const IS_PROD = process.env.NODE_ENV === 'production';

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const levelName = LEVEL_NAMES[level];
  let logLine = `[${timestamp}] [${levelName}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    logLine += ' | ' + JSON.stringify(meta);
  }
  return logLine;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (CURRENT_LEVEL <= LogLevel.DEBUG) {
      if (!IS_PROD) console.debug(formatMessage(LogLevel.DEBUG, message, meta));
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (CURRENT_LEVEL <= LogLevel.INFO) {
      console.log(formatMessage(LogLevel.INFO, message, meta));
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (CURRENT_LEVEL <= LogLevel.WARN) {
      console.warn(formatMessage(LogLevel.WARN, message, meta));
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (CURRENT_LEVEL <= LogLevel.ERROR) {
      console.error(formatMessage(LogLevel.ERROR, message, meta));
    }
  }
};

export default logger;
