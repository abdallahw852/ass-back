import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Not } from 'typeorm';
import type {
  IQuotationRepository,
  SaveQuotationInput,
} from '../domain/quotation.repository.interface';
import { QuotationStatus } from '../domain/rfq.types';
import { QuotationOrmEntity } from './persistence/quotation.orm-entity';

@Injectable()
export class QuotationRepository implements IQuotationRepository {
  constructor(
    @InjectRepository(QuotationOrmEntity, 'write')
    private readonly repository: Repository<QuotationOrmEntity>,
  ) {}

  findByPublicId(publicId: string): Promise<QuotationOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['customizations'],
    });
  }

  findByPublicIdWithRelations(
    publicId: string,
  ): Promise<QuotationOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['rfq', 'supplier', 'customizations'],
    });
  }

  findByRfqAndSupplier(
    rfqId: number,
    supplierId: number,
  ): Promise<QuotationOrmEntity | null> {
    return this.repository.findOne({
      where: { rfqId, supplierId, status: Not(QuotationStatus.CANCELLED) },
      order: { createdAt: 'DESC' },
      relations: ['customizations'],
    });
  }

  async save(input: SaveQuotationInput): Promise<QuotationOrmEntity> {
    const entity = this.repository.create(input);
    const saved = await this.repository.save(entity);
    return this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['rfq', 'supplier', 'customizations'],
    });
  }

  async update(
    id: number,
    input: SaveQuotationInput,
  ): Promise<QuotationOrmEntity> {
    const existing = await this.repository.findOneOrFail({
      where: { id },
      relations: ['customizations'],
    });
    const merged = this.repository.merge(existing, input);
    const saved = await this.repository.save(merged);
    return this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['rfq', 'supplier', 'customizations'],
    });
  }

  countSupplierQuotationsInPeriod(
    supplierId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder('q')
      .where('q.supplierId = :supplierId', { supplierId })
      .andWhere('q.createdAt >= :periodStart', { periodStart })
      .andWhere('q.createdAt <= :periodEnd', { periodEnd })
      .andWhere('q.status != :cancelled', {
        cancelled: QuotationStatus.CANCELLED,
      })
      .getCount();
  }

  async rejectOtherSubmitted(rfqId: number, acceptedId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(QuotationOrmEntity)
      .set({ status: QuotationStatus.REJECTED })
      .where('rfqId = :rfqId', { rfqId })
      .andWhere('id != :acceptedId', { acceptedId })
      .andWhere('status = :status', { status: QuotationStatus.SUBMITTED })
      .execute();
  }
}
