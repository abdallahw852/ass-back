import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListOrdersQuery } from './list-orders.query';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
  ) {}

  async execute(query: ListOrdersQuery): Promise<Record<string, unknown>[]> {
    const orders = await this.tradeOrderRepo.findByBuyerId(query.buyerId);

    return orders.map((order) => ({
      id: order.id,
      referenceNumber: order.referenceNumber,
      buyerId: order.buyerId,
      supplierId: order.supplierId,
      lines: order.lines,
      subtotal: order.subtotal,
      currency: order.currency,
      status: order.status,
      shippingMethod: order.shippingMethod,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shippedAt: order.shippedAt,
      paymentIntentId: order.paymentIntentId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }
}
