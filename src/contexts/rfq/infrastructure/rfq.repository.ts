import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type {
  IRfqRepository,
  SaveRfqInput,
} from '../domain/rfq.repository.interface';
import { QuotationStatus } from '../domain/rfq.types';
import { RfqOrmEntity } from './persistence/rfq.orm-entity';

@Injectable()
export class RfqRepository implements IRfqRepository {
  constructor(
    @InjectRepository(RfqOrmEntity, 'write')
    private readonly repository: Repository<RfqOrmEntity>,
  ) {}

  findByPublicId(publicId: string): Promise<RfqOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['customizations', 'attachments'],
    });
  }

  async findByPublicIdWithRelations(
    publicId: string,
  ): Promise<RfqOrmEntity | null> {
    // Cancelled quotations are hidden by filtering the loaded relation, NOT
    // via a `quotations.status` condition in `where` — that would also drop
    // the RFQ itself when it has zero (or only cancelled) quotations.
    const rfq = await this.repository.findOne({
      where: { _id: publicId },
      relations: [
        'buyer',
        'product',
        'targetSupplier',
        'customizations',
        'attachments',
        'quotations',
        'quotations.supplier',
        'quotations.customizations',
      ],
      order: {
        quotations: {
          createdAt: 'DESC',
        },
      },
    });

    if (rfq?.quotations) {
      rfq.quotations = rfq.quotations.filter(
        (quotation) => quotation.status !== QuotationStatus.CANCELLED,
      );
    }

    return rfq;
  }

  async save(input: SaveRfqInput): Promise<RfqOrmEntity> {
    const entity = this.repository.create(input);
    const saved = await this.repository.save(entity);

    if (!saved.referenceNumber) {
      const referenceNumber = `RFQ-${saved.createdAt.getUTCFullYear()}-${String(
        saved.id,
      ).padStart(5, '0')}`;
      await this.repository.update(saved.id, { referenceNumber });
      saved.referenceNumber = referenceNumber;
    }

    return this.findByPublicIdWithRelations(saved._id).then(
      (rfq) => rfq as RfqOrmEntity,
    );
  }

  async update(
    id: number,
    input: Partial<RfqOrmEntity>,
  ): Promise<RfqOrmEntity> {
    await this.repository.update(id, input);
    return this.repository.findOneOrFail({
      where: { id },
      relations: [
        'buyer',
        'product',
        'targetSupplier',
        'customizations',
        'attachments',
        'quotations',
        'quotations.supplier',
        'quotations.customizations',
      ],
      order: {
        quotations: {
          createdAt: 'DESC',
        },
      },
    });
  }
}
