import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAdminAnalyticsQuery } from './get-admin-analytics.query';
import { AnalyticsEventOrmEntity } from '../../infrastructure/persistence/analytics-event.orm-entity';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { PaymentRecordOrmEntity } from '../../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { CartOrmEntity } from '../../../cart/infrastructure/persistence/cart.orm-entity';

export interface AdminAnalyticsResult {
  pageViews: Array<{ date: string; views: number; visitors: number }>;
  visitors: number;
  topPages: Array<{ path: string; views: number; uniques: number }>;
  geo: Array<{ country: string; visits: number }>;
  funnel: Array<{ name: string; value: number; percent: number }>;
  bounceRate: number;
  avgTime: number;
}

@QueryHandler(GetAdminAnalyticsQuery)
export class GetAdminAnalyticsHandler implements IQueryHandler<GetAdminAnalyticsQuery> {
  constructor(
    @InjectRepository(AnalyticsEventOrmEntity, 'write')
    private readonly eventRepo: Repository<AnalyticsEventOrmEntity>,
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly paymentRepo: Repository<PaymentRecordOrmEntity>,
    @InjectRepository(CartOrmEntity, 'write')
    private readonly cartRepo: Repository<CartOrmEntity>,
  ) {}

  async execute(query: GetAdminAnalyticsQuery): Promise<AdminAnalyticsResult> {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const [pageViews, visitors, topPages, geo, bounceRate, avgTime, funnel] =
      await Promise.all([
        this.getPageViews(from, to),
        this.getVisitors(from, to),
        this.getTopPages(from, to),
        this.getGeo(from, to),
        this.getBounceRate(from, to),
        this.getAvgTime(from, to),
        this.getFunnel(from, to),
      ]);

    return { pageViews, visitors, topPages, geo, funnel, bounceRate, avgTime };
  }

  private async getPageViews(
    from: Date,
    to: Date,
  ): Promise<Array<{ date: string; views: number; visitors: number }>> {
    const rows = await this.eventRepo
      .createQueryBuilder('ae')
      .select("TO_CHAR(ae.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'views')
      .addSelect('COUNT(DISTINCT ae.sessionId)', 'visitors')
      .where('ae.createdAt >= :from', { from })
      .andWhere('ae.createdAt <= :to', { to })
      .groupBy("TO_CHAR(ae.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; views: string; visitors: string }>();

    return rows.map((r) => ({
      date: r.date,
      views: parseInt(r.views, 10),
      visitors: parseInt(r.visitors, 10),
    }));
  }

  private async getVisitors(from: Date, to: Date): Promise<number> {
    const row = await this.eventRepo
      .createQueryBuilder('ae')
      .select('COUNT(DISTINCT ae.sessionId)', 'count')
      .where('ae.createdAt >= :from', { from })
      .andWhere('ae.createdAt <= :to', { to })
      .getRawOne<{ count: string }>();

    return parseInt(row?.count ?? '0', 10);
  }

  private async getTopPages(
    from: Date,
    to: Date,
  ): Promise<Array<{ path: string; views: number; uniques: number }>> {
    const rows = await this.eventRepo
      .createQueryBuilder('ae')
      .select('ae.path', 'path')
      .addSelect('COUNT(*)', 'views')
      .addSelect('COUNT(DISTINCT ae.sessionId)', 'uniques')
      .where('ae.createdAt >= :from', { from })
      .andWhere('ae.createdAt <= :to', { to })
      .groupBy('ae.path')
      .orderBy('views', 'DESC')
      .limit(20)
      .getRawMany<{ path: string; views: string; uniques: string }>();

    return rows.map((r) => ({
      path: r.path,
      views: parseInt(r.views, 10),
      uniques: parseInt(r.uniques, 10),
    }));
  }

  private async getGeo(
    from: Date,
    to: Date,
  ): Promise<Array<{ country: string; visits: number }>> {
    const rows = await this.eventRepo
      .createQueryBuilder('ae')
      .select('ae.country', 'country')
      .addSelect('COUNT(DISTINCT ae.sessionId)', 'visits')
      .where('ae.createdAt >= :from', { from })
      .andWhere('ae.createdAt <= :to', { to })
      .andWhere('ae.country IS NOT NULL')
      .groupBy('ae.country')
      .orderBy('visits', 'DESC')
      .limit(10)
      .getRawMany<{ country: string; visits: string }>();

    return rows.map((r) => ({
      country: r.country,
      visits: parseInt(r.visits, 10),
    }));
  }

  private async getBounceRate(from: Date, to: Date): Promise<number> {
    const row = await this.eventRepo.manager.query<
      Array<{ rate: string | null }>
    >(
      `SELECT
        ROUND(
          COUNT(CASE WHEN cnt = 1 THEN 1 END)::numeric
          / NULLIF(COUNT(*), 0) * 100,
          1
        ) AS rate
       FROM (
         SELECT session_id, COUNT(*) AS cnt
         FROM analytics_events
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY session_id
       ) s`,
      [from, to],
    );

    return parseFloat(row[0]?.rate ?? '0');
  }

  private async getAvgTime(from: Date, to: Date): Promise<number> {
    const row = await this.eventRepo.manager.query<
      Array<{ avg_time: string | null }>
    >(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (max_t - min_t)))::numeric, 1) AS avg_time
       FROM (
         SELECT session_id, MIN(created_at) AS min_t, MAX(created_at) AS max_t
         FROM analytics_events
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY session_id
         HAVING MAX(created_at) > MIN(created_at)
       ) s`,
      [from, to],
    );

    return parseFloat(row[0]?.avg_time ?? '0');
  }

  private async getFunnel(
    from: Date,
    to: Date,
  ): Promise<Array<{ name: string; value: number; percent: number }>> {
    const [totalOrders, paidOrders, checkoutOrders, cartRaw] =
      await Promise.all([
        this.orderRepo
          .createQueryBuilder('o')
          .where('o.created_at >= :from', { from })
          .andWhere('o.created_at <= :to', { to })
          .getCount(),
        this.paymentRepo
          .createQueryBuilder('p')
          .where('p.status = :status', { status: 'completed' })
          .andWhere('p.createdAt >= :from', { from })
          .andWhere('p.createdAt <= :to', { to })
          .getCount(),
        this.orderRepo
          .createQueryBuilder('o')
          .where("o.status != 'pending_payment'")
          .andWhere('o.created_at >= :from', { from })
          .andWhere('o.created_at <= :to', { to })
          .getCount(),
        this.cartRepo
          .createQueryBuilder('c')
          .innerJoin(
            'cart_items',
            'ci',
            'ci.cart_id = c.id AND ci.created_at >= :from AND ci.created_at <= :to',
            { from, to },
          )
          .select('COUNT(DISTINCT c.buyer_id)', 'count')
          .getRawOne<{ count: string }>(),
      ]);

    const cartCount = parseInt(cartRaw?.count ?? '0', 10);

    return [
      { name: 'Cart', value: cartCount, percent: 100 },
      {
        name: 'Checkout',
        value: totalOrders,
        percent:
          cartCount > 0 ? Math.round((totalOrders / cartCount) * 100) : 0,
      },
      {
        name: 'Order Placed',
        value: checkoutOrders,
        percent:
          cartCount > 0 ? Math.round((checkoutOrders / cartCount) * 100) : 0,
      },
      {
        name: 'Payment',
        value: paidOrders,
        percent: cartCount > 0 ? Math.round((paidOrders / cartCount) * 100) : 0,
      },
    ];
  }
}
