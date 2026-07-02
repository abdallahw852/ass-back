import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GetBuyerHomeQuery } from './get-buyer-home.query';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { RfqOrmEntity } from '../../../rfq/infrastructure/persistence/rfq.orm-entity';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

export interface BuyerHomeResult {
  kpis: {
    activeOrders: number;
    totalSpent: number;
    openRfqs: number;
    totalOrders: number;
  };
  recentOrders: Array<{
    _id: string;
    referenceNumber: string | null;
    supplierName: string;
    status: string;
    amount: number;
    date: Date;
  }>;
  rfqStatusDistribution: Array<{ name: string; value: number }>;
}

@QueryHandler(GetBuyerHomeQuery)
export class GetBuyerHomeHandler implements IQueryHandler<GetBuyerHomeQuery> {
  constructor(
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(RfqOrmEntity, 'write')
    private readonly rfqRepo: Repository<RfqOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(query: GetBuyerHomeQuery): Promise<BuyerHomeResult> {
    const { userId, period } = query;

    const now = new Date();
    const periodStart = this.getPeriodStart(period, now);

    // Active orders: status NOT in delivered or cancelled (snapshot, not period-bound)
    const activeOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyer_id = :buyerId', { buyerId: userId })
      .andWhere("o.status NOT IN ('delivered', 'cancelled')")
      .getCount();

    // Total spent: sum subtotals of non-cancelled/non-pending orders in period
    const [spentRow] = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.subtotal), 0)', 'total')
      .where('o.buyer_id = :buyerId', { buyerId: userId })
      .andWhere("o.status NOT IN ('pending_payment', 'cancelled')")
      .getRawMany<{ total: string }>();

    const totalSpent = parseFloat(spentRow?.total ?? '0');

    // Open RFQs: status open or awarded (snapshot)
    const openRfqs = await this.rfqRepo
      .createQueryBuilder('r')
      .where('r.buyerId = :buyerId', { buyerId: userId })
      .andWhere("r.status IN ('open', 'pending')")
      .getCount();

    // Total orders in period
    const totalOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyer_id = :buyerId', { buyerId: userId })
      .andWhere('o.created_at >= :start', { start: periodStart })
      .getCount();

    // Recent 5 orders with supplier names
    const recentOrderRows = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyer_id = :buyerId', { buyerId: userId })
      .orderBy('o.created_at', 'DESC')
      .limit(5)
      .getMany();

    const supplierIds = [...new Set(recentOrderRows.map((o) => o.supplier_id))];
    const suppliers = supplierIds.length
      ? await this.supplierRepo.findBy({ id: In(supplierIds) })
      : [];
    const supplierUserIds = [...new Set(suppliers.map((s) => s.userId))];
    const supplierUsers = supplierUserIds.length
      ? await this.userRepo.findBy({ id: In(supplierUserIds) })
      : [];

    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const userById = new Map(supplierUsers.map((u) => [u.id, u]));

    const recentOrders = recentOrderRows.map((o) => {
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
        date: o.created_at,
      };
    });

    // RFQ status distribution
    const rfqStatusRows = await this.rfqRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('r.buyerId = :buyerId', { buyerId: userId })
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();

    const rfqStatusDistribution = rfqStatusRows.map((r) => ({
      name: r.status,
      value: parseInt(r.count, 10),
    }));

    return {
      kpis: {
        activeOrders,
        totalSpent,
        openRfqs,
        totalOrders,
      },
      recentOrders,
      rfqStatusDistribution,
    };
  }

  private getPeriodStart(period: 'week' | 'month' | 'year', from: Date): Date {
    const d = new Date(from);
    if (period === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (period === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setFullYear(d.getFullYear() - 1);
    }
    return d;
  }
}
