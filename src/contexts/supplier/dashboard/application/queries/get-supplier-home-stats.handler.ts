import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GetSupplierHomeStatsQuery } from './get-supplier-home-stats.query';
import { SupplierOrmEntity } from '../../../identity/infrastructure/persistence/supplier.orm-entity';
import { TradeOrderOrmEntity } from '../../../../order/infrastructure/persistence/trade-order.orm-entity';
import { PaymentRecordOrmEntity } from '../../../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { UserOrmEntity } from '../../../../auth/infrastructure/persistence/user.orm-entity';

export interface SupplierHomeStatsResult {
  kpis: {
    totalOrders: number;
    totalSales: number;
    revenue: number;
    deltaOrders: number;
    deltaSales: number;
  };
  salesSeries: Array<{ month: string; value: number }>;
  orderStatus: Array<{ name: string; value: number; color: string }>;
  recentOrders: Array<{
    customer: string;
    date: Date;
    status: string;
    amount: number;
  }>;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#FFA500',
  paid: '#4CAF50',
  processing: '#2196F3',
  shipped: '#9C27B0',
  delivered: '#00BCD4',
  cancelled: '#F44336',
  disputed: '#FF5722',
};

@QueryHandler(GetSupplierHomeStatsQuery)
export class GetSupplierHomeStatsHandler implements IQueryHandler<GetSupplierHomeStatsQuery> {
  constructor(
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly paymentRepo: Repository<PaymentRecordOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(
    query: GetSupplierHomeStatsQuery,
  ): Promise<SupplierHomeStatsResult> {
    let supplier = await this.supplierRepo.findOne({
      where: { userId: query.userId },
    });

    if (!supplier) {
      // supplier_employee: look up their parent supplier via User.supplierId
      const user = await this.userRepo.findOne({
        where: { id: query.userId },
        select: ['supplierId'],
      });
      if (user?.supplierId) {
        supplier = await this.supplierRepo.findOne({
          where: { id: user.supplierId },
        });
      }
    }

    if (!supplier) {
      throw new NotFoundException('Supplier not found for this user');
    }

    const now = new Date();
    const periodStart = this.getPeriodStart(query.period, now);
    const prevPeriodStart = this.getPeriodStart(query.period, periodStart);

    // Current period order count
    const totalOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.supplier_id = :supplierId', { supplierId: supplier.id })
      .andWhere('o.created_at >= :start', { start: periodStart })
      .getCount();

    // Previous period order count for delta
    const prevOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.supplier_id = :supplierId', { supplierId: supplier.id })
      .andWhere('o.created_at >= :start', { start: prevPeriodStart })
      .andWhere('o.created_at < :end', { end: periodStart })
      .getCount();

    // Revenue from payment_records
    const [revRow] = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.supplierId = :supplierId', { supplierId: supplier.id })
      .andWhere("p.status = 'completed'")
      .andWhere('p.createdAt >= :start', { start: periodStart })
      .getRawMany<{ total: string }>();

    const [prevRevRow] = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.supplierId = :supplierId', { supplierId: supplier.id })
      .andWhere("p.status = 'completed'")
      .andWhere('p.createdAt >= :start', { start: prevPeriodStart })
      .andWhere('p.createdAt < :end', { end: periodStart })
      .getRawMany<{ total: string }>();

    const revenue = parseFloat(revRow?.total ?? '0');
    const prevRevenue = parseFloat(prevRevRow?.total ?? '0');
    const deltaOrders =
      prevOrders > 0
        ? Math.round(((totalOrders - prevOrders) / prevOrders) * 100)
        : 0;
    const deltaSales =
      prevRevenue > 0
        ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
        : 0;

    // Monthly sales series — last 9 months
    const salesSeries: SupplierHomeStatsResult['salesSeries'] = [];
    for (let i = 8; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );

      const [row] = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.supplierId = :supplierId', { supplierId: supplier.id })
        .andWhere("p.status = 'completed'")
        .andWhere('p.createdAt >= :s', { s: monthStart })
        .andWhere('p.createdAt <= :e', { e: monthEnd })
        .getRawMany<{ total: string }>();

      salesSeries.push({
        month: MONTH_NAMES[monthStart.getMonth()],
        value: parseFloat(row?.total ?? '0'),
      });
    }

    // Order status distribution
    const statusRows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.supplier_id = :supplierId', { supplierId: supplier.id })
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const orderStatus = statusRows.map((r) => ({
      name: r.status,
      value: parseInt(r.count, 10),
      color: STATUS_COLORS[r.status] ?? '#607D8B',
    }));

    // Recent orders
    const recentOrderRows = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.supplier_id = :supplierId', { supplierId: supplier.id })
      .orderBy('o.created_at', 'DESC')
      .limit(7)
      .getMany();

    const recentOrders = await Promise.all(
      recentOrderRows.map(async (o) => {
        const buyer = await this.userRepo.findOne({
          where: { id: o.buyer_id },
          select: ['name', 'email'],
        });
        return {
          customer: buyer?.name ?? buyer?.email ?? 'Unknown',
          date: o.created_at,
          status: o.status,
          amount: parseFloat(String(o.subtotal)),
        };
      }),
    );

    return {
      kpis: {
        totalOrders,
        totalSales: revenue,
        revenue,
        deltaOrders,
        deltaSales,
      },
      salesSeries,
      orderStatus,
      recentOrders,
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
