import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { IdempotencyKeyOrmEntity } from './idempotency-key.entity';

@Injectable()
export class IdempotencyStore {
  constructor(
    @InjectRepository(IdempotencyKeyOrmEntity, 'write')
    private readonly repo: Repository<IdempotencyKeyOrmEntity>,
  ) {}

  hash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  async get(key: string): Promise<IdempotencyKeyOrmEntity | null> {
    return this.repo.findOne({ where: { key } });
  }

  async set(
    key: string,
    userId: number,
    route: string,
    requestHash: string,
    response: Record<string, unknown> | null,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKeyOrmEntity)
      .values({
        key,
        user_id: userId,
        route,
        request_hash: requestHash,
        response: response as any,
      })
      .orIgnore()
      .execute();
  }

  async updateResponse(
    key: string,
    response: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.update({ key }, { response: response as any });
  }
}
