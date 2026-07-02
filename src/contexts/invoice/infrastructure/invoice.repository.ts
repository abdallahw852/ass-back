import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceOrmEntity } from './persistence/invoice.orm-entity';

@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectRepository(InvoiceOrmEntity, 'write')
    private readonly repo: Repository<InvoiceOrmEntity>,
  ) {}

  async findByOrderId(
    orderInternalId: number,
  ): Promise<InvoiceOrmEntity | null> {
    return this.repo.findOne({ where: { order_id: orderInternalId } });
  }

  async save(data: Partial<InvoiceOrmEntity>): Promise<InvoiceOrmEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async updatePdfUrl(id: number, pdfUrl: string): Promise<void> {
    await this.repo.update({ id }, { pdf_url: pdfUrl });
  }
}
