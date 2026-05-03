import { Injectable } from '@nestjs/common';

@Injectable()
export class AiCacheService {
  private readonly cache = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T) {
    this.cache.set(key, value);
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}
