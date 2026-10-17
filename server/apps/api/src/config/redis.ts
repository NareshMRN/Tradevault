import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import { env } from "./env";

class CacheClient {
  private upstash: UpstashRedis | null = null;
  private memoryFallback: Map<string, { value: any; expiresAt?: number }> = new Map();

  constructor() {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.upstash = new UpstashRedis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log("⚡ [Upstash Redis] Connected via HTTP REST Client");
      } catch (err) {
        console.warn("[Upstash Redis] Warning initializing REST client:", err);
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.upstash) {
      try {
        return (await this.upstash.get<T>(key)) ?? null;
      } catch (e) {
        console.warn(`[Redis get error for ${key}]`, e);
      }
    }

    // Memory fallback
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (this.upstash) {
      try {
        if (ttlSeconds) {
          await this.upstash.set(key, value, { ex: ttlSeconds });
        } else {
          await this.upstash.set(key, value);
        }
        return;
      } catch (e) {
        console.warn(`[Redis set error for ${key}]`, e);
      }
    }

    // Memory fallback
    this.memoryFallback.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async incr(key: string): Promise<number> {
    if (this.upstash) {
      try {
        return await this.upstash.incr(key);
      } catch (e) {}
    }

    const current = (await this.get<number>(key)) || 0;
    const nextVal = current + 1;
    await this.set(key, nextVal);
    return nextVal;
  }

  async del(key: string): Promise<void> {
    if (this.upstash) {
      try {
        await this.upstash.del(key);
      } catch (e) {}
    }
    this.memoryFallback.delete(key);
  }

  async ping(): Promise<boolean> {
    if (this.upstash) {
      try {
        await this.upstash.set("ping_check", "pong", { ex: 5 });
        const val = await this.upstash.get("ping_check");
        return val === "pong";
      } catch (e) {
        return false;
      }
    }
    return true;
  }
}

export const cache = new CacheClient();
