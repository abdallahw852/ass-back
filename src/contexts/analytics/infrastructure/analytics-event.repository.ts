import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IAnalyticsEventRepository } from '../domain/analytics-event.repository.interface';
import { AnalyticsEventOrmEntity } from './persistence/analytics-event.orm-entity';

@Injectable()
export class AnalyticsEventRepository implements IAnalyticsEventRepository {
  constructor(
    @InjectRepository(AnalyticsEventOrmEntity, 'write')
    private readonly repo: Repository<AnalyticsEventOrmEntity>,
  ) {}

  async save(
    entity: Partial<AnalyticsEventOrmEntity>,
  ): Promise<AnalyticsEventOrmEntity> {
    return this.repo.save(this.repo.create(entity));
  }
}
