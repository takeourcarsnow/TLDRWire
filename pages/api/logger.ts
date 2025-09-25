// Minimal structured logger with levels and timing helpers.
// Configure via env: LOG_LEVEL=debug|info|warn|error|silent (default: info)

interface Levels {
  debug: number;
  info: number;
  warn: number;
  error: number;
  silent: number;
}

interface LogMeta {
  [key: string]: any;
  body?: any;
}

interface Logger {
  debug: (msg: string, meta?: LogMeta) => void;
  info: (msg: string, meta?: LogMeta) => void;
  warn: (msg: string, meta?: LogMeta) => void;
  error: (msg: string, meta?: LogMeta) => void;
  level: string;
  child: (staticMeta?: LogMeta) => Logger;
  startTimer: (label: string, meta?: LogMeta) => (extra?: LogMeta) => number;
}

const LEVELS: Levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const CURRENT_LEVEL = LEVELS[envLevel as keyof Levels] ?? LEVELS.info;

function ts(): string {
  return new Date().toISOString();
}

function fmt(level: string, msg: string, meta?: LogMeta): string {
  const base = `[${ts()}] ${level.toUpperCase()}: ${msg}`;
  if (!meta) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return base;
  }
}

function logAt(levelName: string, minLevel: number) {
  return (msg: string, meta?: LogMeta) => {
    if (CURRENT_LEVEL <= minLevel) {
      // Avoid logging secrets by shallow filtering known fields
      if (meta && meta.body && typeof meta.body === 'object') {
        const b = { ...meta.body };
        if (b.GEMINI_API_KEY) b.GEMINI_API_KEY = '[redacted]';
        meta = { ...meta, body: b };
      }
      console.log(fmt(levelName, msg, meta));
    }
  };
}

const logger: Logger = {
  debug: logAt('debug', LEVELS.debug),
  info: logAt('info', LEVELS.info),
  warn: logAt('warn', LEVELS.warn),
  error: logAt('error', LEVELS.error),
  level: envLevel,
  // Create a child logger that prefixes messages with static context
  child(staticMeta: LogMeta = {}): Logger {
    const wrap = (fn: (msg: string, meta?: LogMeta) => void) => 
      (msg: string, meta?: LogMeta) => fn(msg, { ...staticMeta, ...(meta || {}) });
    return {
      debug: wrap(logger.debug),
      info: wrap(logger.info),
      warn: wrap(logger.warn),
      error: wrap(logger.error),
      level: logger.level,
      child: (m?: LogMeta) => logger.child({ ...staticMeta, ...(m || {}) }),
      startTimer: logger.startTimer
    };
  },
  // Timing helper
  startTimer(label: string, meta?: LogMeta) {
    const start = Date.now();
    logger.debug(`start: ${label}`, meta);
    return (extra?: LogMeta) => {
      const ms = Date.now() - start;
      logger.info(`done: ${label}`, { ...meta, ...(extra || {}), ms });
      return ms;
    };
  }
};

export default logger;