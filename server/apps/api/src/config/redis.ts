/**
 * In-memory Cache Client
 * Replaces external Redis/Upstash dependencies with a fast, zero-dependency in-memory store.
 */
class CacheClient {
  private memory: Map<string, { value: any; expiresAt?: number }> = new Map();

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const nextVal = current + 1;
    await this.set(key, nextVal);
    return nextVal;
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

export const cache = new CacheClient();
