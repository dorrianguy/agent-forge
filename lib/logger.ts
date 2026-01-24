/**
 * Production-ready logger utility
 * Replaces console.log with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${dataStr}`;
}

function createLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (isDev) {
      const entry = createLogEntry('debug', message, data);
      console.debug(formatLog(entry));
    }
  },

  info(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry('info', message, data);
    if (isDev) {
      console.info(formatLog(entry));
    }
    // In production, send to logging service (e.g., Datadog, LogDNA)
  },

  warn(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry('warn', message, data);
    console.warn(formatLog(entry));
  },

  error(message: string, error?: unknown, data?: Record<string, unknown>) {
    const errorData = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack, ...data }
      : { error, ...data };
    const entry = createLogEntry('error', message, errorData);
    console.error(formatLog(entry));
  },
};

export default logger;
