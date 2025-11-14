// Cache utility for in-memory caching with TTL

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlMs: number, maxSize: number = 50) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.ttlMs) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}