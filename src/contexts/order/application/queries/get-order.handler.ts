import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrderQuery } from './get-order.query';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { OrderNotFoundException } from '../../domain/order.exceptions';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
  ) {}

  async execute(query: GetOrderQuery): Promise<Record<string, unknown>> {
    const order = await this.tradeOrderRepo.findByPublicId(query.orderId);

    if (!order || order.buyerId !== query.buyerId) {
      throw new OrderNotFoundException(query.orderId);
    }

    return {
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
    };
  }
}
