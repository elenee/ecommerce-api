import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT')!,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    this.client.on('error', (error) => {
      console.log('redis connection error', error);
    });

    this.client.on('connect', () => {
      console.log('redis connected successfully');
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  async set(key: string, value: string, ttlInSeconds?: number): Promise<void> {
    console.log('setting key:', key);
    if (ttlInSeconds) {
      await this.client.set(key, value, 'EX', ttlInSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async delete(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }
}
