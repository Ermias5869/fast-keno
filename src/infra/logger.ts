/**
 * Logger Infrastructure
 * Structured logging with levels and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
}

class Logger {
  private context: string;

  constructor(context: string = 'app') {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(prefix, message, data || '');
        }
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }

    return entry;
  }

  debug(message: string, data?: Record<string, unknown>) { return this.log('debug', message, data); }
  info(message: string, data?: Record<string, unknown>) { return this.log('info', message, data); }
  warn(message: string, data?: Record<string, unknown>) { return this.log('warn', message, data); }
  error(message: string, data?: Record<string, unknown>) { return this.log('error', message, data); }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

// Export singleton and factory
export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);
export default logger;
