export class MemoryCache {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private memoryUsage = 0;

  constructor(private readonly maxMemoryFallback: number) {}

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    if (this.memoryUsage > this.maxMemoryFallback * 0.9) {
      await this.cleanup();
    }

    const existing = this.cache.get(key);
    if (existing) {
      this.memoryUsage -= existing.value.length;
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
    this.memoryUsage += value.length;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.memoryUsage -= entry.value.length;
    return this.cache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  async flush(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
  }

  getSize(): number {
    return this.cache.size;
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        await this.delete(key);
      }
    }
  }
}
