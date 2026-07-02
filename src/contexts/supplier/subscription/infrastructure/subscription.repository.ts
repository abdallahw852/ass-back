import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ISubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionOrmEntity } from './persistence/subscription.orm-entity';

@Injectable()
export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionOrmEntity, 'write')
    private readonly repository: Repository<SubscriptionOrmEntity>,
  ) {}

  findById(id: number): Promise<SubscriptionOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findBySupplierId(supplierId: number): Promise<SubscriptionOrmEntity | null> {
    return this.repository.findOne({
      where: { supplierId },
      order: { createdAt: 'DESC' },
    });
  }

  findActiveByPlanId(planId: number): Promise<SubscriptionOrmEntity | null> {
    return this.repository.findOne({ where: { planId, status: 'active' } });
  }

  findCancellingExpired(now: Date): Promise<SubscriptionOrmEntity[]> {
    return this.repository.find({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: LessThanOrEqual(now),
      },
    });
  }

  save(input: Partial<SubscriptionOrmEntity>): Promise<SubscriptionOrmEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }
}
