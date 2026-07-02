import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetBuyerRfqManagementQuery } from './get-buyer-rfq-management.query';
import { RfqOrmEntity } from '../../../rfq/infrastructure/persistence/rfq.orm-entity';

export interface BuyerRfqManagementResult {
  items: Array<{
    _id: string;
    referenceNumber: string | null;
    productName: string;
    status: string;
    quantity: number;
    createdAt: Date;
    quotationCount: number;
  }>;
  total: number;
}

@QueryHandler(GetBuyerRfqManagementQuery)
export class GetBuyerRfqManagementHandler implements IQueryHandler<GetBuyerRfqManagementQuery> {
  constructor(
    @InjectRepository(RfqOrmEntity, 'write')
    private readonly rfqRepo: Repository<RfqOrmEntity>,
  ) {}

  async execute(
    query: GetBuyerRfqManagementQuery,
  ): Promise<BuyerRfqManagementResult> {
    const { userId, page, limit, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.rfqRepo
      .createQueryBuilder('r')
      .where('r.buyerId = :buyerId', { buyerId: userId })
      .loadRelationCountAndMap('r.quotationCount', 'r.quotations');

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    const [rfqs, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const items = rfqs.map((r) => {
      const withCount = r as RfqOrmEntity & { quotationCount: number };
      return {
        _id: r._id,
        referenceNumber: r.referenceNumber,
        productName: r.productName,
        status: r.status,
        quantity: parseFloat(String(r.quantity)),
        createdAt: r.createdAt,
        quotationCount: withCount.quotationCount ?? 0,
      };
    });

    return { items, total };
  }
}
