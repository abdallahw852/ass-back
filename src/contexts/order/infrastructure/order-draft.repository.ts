import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { IOrderDraftRepository } from '../domain/order-draft.repository.interface';
import { OrderDraftOrmEntity } from './persistence/order-draft.orm-entity';

@Injectable()
export class OrderDraftRepository implements IOrderDraftRepository {
  constructor(
    @InjectRepository(OrderDraftOrmEntity, 'write')
    private readonly repository: Repository<OrderDraftOrmEntity>,
  ) {}

  async save(
    input: Partial<OrderDraftOrmEntity>,
  ): Promise<OrderDraftOrmEntity> {
    const entity = this.repository.create(input);
    const saved = await this.repository.save(entity);

    if (!saved.referenceNumber) {
      const referenceNumber = `ORD-${new Date().getUTCFullYear()}-${String(
        saved.id,
      ).padStart(5, '0')}`;
      await this.repository.update(saved.id, { referenceNumber });
      saved.referenceNumber = referenceNumber;
    }

    return saved;
  }

  async findByPublicId(id: string): Promise<OrderDraftOrmEntity | null> {
    return this.repository.findOne({ where: { _id: id } });
  }

  async findPendingByRfqAndBuyer(
    rfqId: string,
    buyerId: number,
  ): Promise<OrderDraftOrmEntity | null> {
    return this.repository.findOne({
      where: { rfqId, buyerId, status: 'draft' },
    });
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.repository.update(id, { status });
  }
}
