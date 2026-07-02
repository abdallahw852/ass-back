import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetConversionFunnelQuery } from './get-conversion-funnel.query';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { PaymentRecordOrmEntity } from '../../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { CartOrmEntity } from '../../../cart/infrastructure/persistence/cart.orm-entity';

export interface ConversionFunnelResult {
  stages: Array<{ name: string; value: number; percent: number }>;
}

@QueryHandler(GetConversionFunnelQuery)
export class GetConversionFunnelHandler implements IQueryHandler<GetConversionFunnelQuery> {
  constructor(
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly paymentRepo: Repository<PaymentRecordOrmEntity>,
    @InjectRepository(CartOrmEntity, 'write')
    private readonly cartRepo: Repository<CartOrmEntity>,
  ) {}

  async execute(
    query: GetConversionFunnelQuery,
  ): Promise<ConversionFunnelResult> {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const totalOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.created_at >= :from', { from })
      .andWhere('o.created_at <= :to', { to })
      .getCount();

    const paidOrders = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: 'completed' })
      .andWhere('p.createdAt >= :from', { from })
      .andWhere('p.createdAt <= :to', { to })
      .getCount();

    const checkoutOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status != 'pending_payment'")
      .andWhere('o.created_at >= :from', { from })
      .andWhere('o.created_at <= :to', { to })
      .getCount();

    const cartRaw = await this.cartRepo
      .createQueryBuilder('c')
      .innerJoin(
        'cart_items',
        'ci',
        'ci.cart_id = c.id AND ci.created_at >= :from AND ci.created_at <= :to',
        { from, to },
      )
      .select('COUNT(DISTINCT c.buyer_id)', 'count')
      .getRawOne<{ count: string }>();
    const cartCount = parseInt(cartRaw?.count ?? '0', 10);

    const stages = [
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

    return { stages };
  }
}
