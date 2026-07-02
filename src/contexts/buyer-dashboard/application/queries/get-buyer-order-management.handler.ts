import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';
import { GetBuyerOrderManagementQuery } from './get-buyer-order-management.query';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

export interface BuyerOrderManagementResult {
  items: Array<{
    _id: string;
    referenceNumber: string | null;
    supplierName: string;
    status: string;
    amount: number;
    currency: string;
    lines: Record<string, unknown>[];
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(GetBuyerOrderManagementQuery)
export class GetBuyerOrderManagementHandler implements IQueryHandler<GetBuyerOrderManagementQuery> {
  constructor(
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(
    query: GetBuyerOrderManagementQuery,
  ): Promise<BuyerOrderManagementResult> {
    const { userId, page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyer_id = :buyerId', { buyerId: userId });

    if (status) {
      qb.andWhere('o.status = :status', { status });
    }

    let relevanceExpr: string | null = null;
    if (search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: search,
        columns: [{ expr: 'o.reference_number', weight: 1 }],
      });
    }

    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC').addOrderBy('o.created_at', 'DESC');
    } else {
      qb.orderBy('o.created_at', 'DESC');
    }

    const [orders, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const supplierIds = [...new Set(orders.map((o) => o.supplier_id))];
    const suppliers = supplierIds.length
      ? await this.supplierRepo.findBy({ id: In(supplierIds) })
      : [];
    const supplierUserIds = [...new Set(suppliers.map((s) => s.userId))];
    const supplierUsers = supplierUserIds.length
      ? await this.userRepo.findBy({ id: In(supplierUserIds) })
      : [];

    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const userById = new Map(supplierUsers.map((u) => [u.id, u]));

    const items = orders.map((o) => {
      const supplier = supplierById.get(o.supplier_id);
      const supplierUser = supplier ? userById.get(supplier.userId) : undefined;
      const supplierName =
        supplierUser?.name ?? supplierUser?.email ?? 'Unknown';
      return {
        _id: o._id,
        referenceNumber: o.reference_number,
        supplierName,
        status: o.status,
        amount: parseFloat(String(o.subtotal)),
        currency: o.currency,
        lines: o.lines,
        createdAt: o.created_at,
      };
    });

    return { items, total, page, limit };
  }
}
