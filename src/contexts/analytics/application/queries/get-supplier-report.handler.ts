import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetPlatformOverviewQuery } from './get-supplier-report.query';
import { PaymentRecordOrmEntity } from '../../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { AuditEventOrmEntity } from '../../../audit-log/infrastructure/persistence/audit-event.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

export interface PlatformOverviewResult {
  kpis: {
    totalRevenue: number;
    transactions: number;
    activeUsers: number;
    growthPercent: number;
  };
  monthlySeries: Array<{ name: string; value: number; previousValue: number }>;
  recentTransactions: Array<{
    id: string;
    userEmail: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
  activityFeed: Array<{
    id: string;
    eventName: string;
    entityType: string;
    createdAt: Date;
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

@QueryHandler(GetPlatformOverviewQuery)
export class GetPlatformOverviewHandler implements IQueryHandler<GetPlatformOverviewQuery> {
  constructor(
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly paymentRepo: Repository<PaymentRecordOrmEntity>,
    @InjectRepository(AuditEventOrmEntity, 'write')
    private readonly auditRepo: Repository<AuditEventOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(
    _query: GetPlatformOverviewQuery,
  ): Promise<PlatformOverviewResult> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Current month KPIs
    const [currentRevRow] = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(DISTINCT p.supplierId)', 'users')
      .where("p.status = 'completed'")
      .andWhere('p.createdAt >= :start', { start: currentMonthStart })
      .getRawMany<{ total: string; count: string; users: string }>();

    const [prevRevRow] = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where("p.status = 'completed'")
      .andWhere('p.createdAt >= :start', { start: prevMonthStart })
      .andWhere('p.createdAt <= :end', { end: prevMonthEnd })
      .getRawMany<{ total: string }>();

    const totalRevenue = parseFloat(currentRevRow?.total ?? '0');
    const transactions = parseInt(currentRevRow?.count ?? '0', 10);
    const activeUsers = parseInt(currentRevRow?.users ?? '0', 10);
    const prevRevenue = parseFloat(prevRevRow?.total ?? '0');
    const growthPercent =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : 0;

    // Monthly series — last 12 months
    const monthlySeries: PlatformOverviewResult['monthlySeries'] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const prevYearStart = new Date(
        monthStart.getFullYear() - 1,
        monthStart.getMonth(),
        1,
      );
      const prevYearEnd = new Date(
        monthStart.getFullYear() - 1,
        monthStart.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const [curr] = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where("p.status = 'completed'")
        .andWhere('p.createdAt >= :s', { s: monthStart })
        .andWhere('p.createdAt <= :e', { e: monthEnd })
        .getRawMany<{ total: string }>();

      const [prev] = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where("p.status = 'completed'")
        .andWhere('p.createdAt >= :s', { s: prevYearStart })
        .andWhere('p.createdAt <= :e', { e: prevYearEnd })
        .getRawMany<{ total: string }>();

      monthlySeries.push({
        name: MONTH_NAMES[monthStart.getMonth()],
        value: parseFloat(curr?.total ?? '0'),
        previousValue: parseFloat(prev?.total ?? '0'),
      });
    }

    // Recent transactions with user email
    const recentPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .orderBy('p.createdAt', 'DESC')
      .limit(5)
      .getMany();

    const recentTransactions = await Promise.all(
      recentPayments.map(async (p) => {
        const user = await this.userRepo.findOne({
          where: { supplierId: p.supplierId },
          select: ['email'],
        });
        return {
          id: p._id,
          userEmail: user?.email ?? 'Unknown',
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        };
      }),
    );

    // Activity feed
    const auditEvents = await this.auditRepo.find({
      order: { created_at: 'DESC' },
      take: 5,
    });
    const activityFeed = auditEvents.map((ae) => ({
      id: ae._id,
      eventName: ae.event_name,
      entityType: ae.entity_type,
      createdAt: ae.created_at,
    }));

    return {
      kpis: { totalRevenue, transactions, activeUsers, growthPercent },
      monthlySeries,
      recentTransactions,
      activityFeed,
    };
  }
}
