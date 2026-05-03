import { Injectable } from '@nestjs/common';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class AiCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor() {
    this.ttlMs = parseInt(process.env.AI_CACHE_TTL_SEC ?? '300') * 1000;
  }

  buildKey(
    articleId: string,
    endpoint: string,
    params: Record<string, unknown>,
    updatedAt: Date | string | number,
  ): string {
    return `${endpoint}:${articleId}:${this.normalizeUpdatedAt(updatedAt)}:${this.stableStringify(params)}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  getStats(): {
    size: number;
    ttlSec: number;
    hits: number;
    misses: number;
    hitRatio: string;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      ttlSec: this.ttlMs / 1000,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Math.round((this.hits / total) * 100) + '%' : '0%',
    };
  }

  private normalizeUpdatedAt(updatedAt: Date | string | number): string {
    if (updatedAt instanceof Date) {
      return updatedAt.toISOString();
    }

    return String(updatedAt);
  }

  private stableStringify(params: Record<string, unknown>): string {
    return JSON.stringify(
      Object.keys(params)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = params[key];
            return acc;
          },
          {} as Record<string, unknown>,
        ),
    );
  }
}
