import { createClient } from 'redis';

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMilliseconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export class RedisKeyValueStore implements KeyValueStore {
  constructor(private readonly client: ReturnType<typeof createClient>) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.client.get(key);
    return value === null ? undefined : JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlMilliseconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { PX: Math.max(1, ttlMilliseconds) });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.values.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMilliseconds: number): Promise<void> {
    this.values.set(key, { value, expiresAt: Date.now() + ttlMilliseconds });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}
