/**
 * In-memory rate-limiting storage adapter.
 */

import type { RateLimitStorage } from './rate-limiting.types';

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

export class MemoryStorage implements RateLimitStorage {
  private store: Map<string, { value: number; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpa entradas expiradas a cada minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async incr(key: string, ttl: number): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || entry.expiresAt < now) {
      this.store.set(key, { value: 1, expiresAt: now + ttl * 1000 });
      return 1;
    }

    entry.value++;
    return entry.value;
  }

  async decr(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.value = Math.max(0, entry.value - 1);
    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getMulti(keys: string[]): Promise<(number | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}
