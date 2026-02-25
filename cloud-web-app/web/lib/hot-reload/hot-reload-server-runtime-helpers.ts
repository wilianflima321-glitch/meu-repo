import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import type { FileChangeEvent } from './hot-reload-server-types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger {
  private level: LogLevel;
  private enabled: boolean;
  private prefix: string;

  constructor(enabled: boolean, level: LogLevel, prefix = '[HMR]') {
    this.enabled = enabled;
    this.level = level;
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `${this.prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }
}

export class Debouncer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingChanges: Map<string, FileChangeEvent[]> = new Map();

  constructor(private delay: number) {}

  debounce(key: string, event: FileChangeEvent, callback: (events: FileChangeEvent[]) => void): void {
    const pending = this.pendingChanges.get(key) || [];
    pending.push(event);
    this.pendingChanges.set(key, pending);

    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const events = this.pendingChanges.get(key) || [];
      this.pendingChanges.delete(key);
      this.timers.delete(key);

      if (events.length > 0) {
        callback(events);
      }
    }, this.delay);

    this.timers.set(key, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingChanges.clear();
  }
}

export class FileHashCache {
  private cache: Map<string, { hash: string; mtime: number }> = new Map();

  async getHash(filePath: string): Promise<string | null> {
    try {
      const stats = await stat(filePath);
      const cached = this.cache.get(filePath);

      if (cached && cached.mtime === stats.mtimeMs) {
        return cached.hash;
      }

      const content = await readFile(filePath);
      const hash = createHash('md5').update(content as unknown as string).digest('hex');

      this.cache.set(filePath, { hash, mtime: stats.mtimeMs });
      return hash;
    } catch {
      return null;
    }
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  clear(): void {
    this.cache.clear();
  }
}
