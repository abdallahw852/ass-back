import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly writeClient: Redis;
  private readonly readClient: Redis;

  constructor() {
    this.writeClient = RedisService.createWriteClient();
    this.readClient = RedisService.createReadClient();
  }

  static createWriteClient(): Redis {
    const url = process.env.REDIS_PRIMARY_URL || process.env.REDIS_URL;
    if (url) return new Redis(url);
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB ?? 0),
    });
  }

  static createReadClient(): Redis {
    const url = process.env.REDIS_REPLICA_URL;
    if (url) return new Redis(url);

    const host = process.env.REDIS_REPLICA_HOST;
    if (host) {
      return new Redis({
        host,
        port: Number(process.env.REDIS_REPLICA_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB ?? 0),
      });
    }

    return RedisService.createWriteClient();
  }

  async onModuleDestroy(): Promise<void> {
    const quits: Promise<unknown>[] = [this.writeClient.quit()];
    if (this.readClient !== this.writeClient) {
      quits.push(this.readClient.quit());
    }
    await Promise.all(quits);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.writeClient.set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.writeClient.set(key, value);
  }

  get(key: string): Promise<string | null> {
    return this.readClient.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.writeClient.del(key);
  }

  getdel(key: string): Promise<string | null> {
    return this.writeClient.getdel(key);
  }
}
