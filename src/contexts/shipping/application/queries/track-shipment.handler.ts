import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { TrackShipmentQuery } from './track-shipment.query';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';
import {
  OrderAccessDeniedException,
  OrderNotFoundException,
} from '../../../order/domain/order.exceptions';
import type { IShipmentRepository } from '../../domain/shipment.repository.interface';
import { SHIPMENT_REPOSITORY } from '../../domain/shipment.repository.interface';
import { ShipmentNotFoundException } from '../../domain/shipping.exceptions';

@QueryHandler(TrackShipmentQuery)
export class TrackShipmentHandler implements IQueryHandler<TrackShipmentQuery> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipmentRepo: IShipmentRepository,
  ) {}

  async execute(query: TrackShipmentQuery): Promise<Record<string, unknown>> {
    const order = await this.tradeOrderRepo.findByPublicId(query.orderId);
    if (!order || !order.internalId) {
      throw new OrderNotFoundException(query.orderId);
    }
    if (order.buyerId !== query.buyerId) {
      throw new OrderAccessDeniedException(query.orderId);
    }

    const shipment = await this.shipmentRepo.findByOrderId(order.internalId);
    if (!shipment) {
      if (order.shippingMethod === 'supplier' && order.trackingNumber) {
        return {
          status: order.status,
          carrier: order.carrier,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          events: [],
        };
      }

      throw new ShipmentNotFoundException(query.orderId);
    }

    return {
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      events: shipment.events,
    };
  }
}
