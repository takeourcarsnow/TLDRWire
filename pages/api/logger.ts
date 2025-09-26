// Minimal structured logger with levels and timing helpers.
// Configure via env: LOG_LEVEL=debug|info|warn|error|silent (default: info)

import util from 'util';

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
  const time = ts();
  const padLevel = level.toUpperCase().padEnd(5, ' ');
  const base = `[${time}] ${padLevel} ${msg}`;
  if (!meta) return base;
  try {
    // pretty-print meta with util.inspect for readability in terminals
    const pretty = util.inspect(meta, { colors: false, depth: 4, compact: false });
    return `${base}\n${pretty}`;
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
      // Add color to the level for terminal clarity
      const colors: { [k: string]: string } = {
        debug: '\u001b[36m', // cyan
        info: '\u001b[32m',  // green
        warn: '\u001b[33m',  // yellow
        error: '\u001b[31m'  // red
      };
      const reset = '\u001b[0m';
      const color = (colors[levelName] || '');
      const out = fmt(levelName, msg, meta);
      // ensure multi-line messages keep color only on the level/timestamp line
      const lines = out.split('\n');
      if (color) {
        lines[0] = `${color}${lines[0]}${reset}`;
      }
      console.log(lines.join('\n'));
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