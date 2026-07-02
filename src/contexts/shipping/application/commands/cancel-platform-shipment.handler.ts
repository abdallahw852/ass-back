import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CancelPlatformShipmentCommand } from './cancel-platform-shipment.command';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';
import type { IShipmentRepository } from '../../domain/shipment.repository.interface';
import { SHIPMENT_REPOSITORY } from '../../domain/shipment.repository.interface';
import type { IPlatformShippingPort } from '../ports/platform-shipping.port';
import { PLATFORM_SHIPPING_PORT } from '../ports/platform-shipping.port';
import { OrderNotFoundException } from '../../../order/domain/order.exceptions';

@CommandHandler(CancelPlatformShipmentCommand)
export class CancelPlatformShipmentHandler implements ICommandHandler<CancelPlatformShipmentCommand> {
  private readonly logger = new Logger(CancelPlatformShipmentHandler.name);

  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipmentRepo: IShipmentRepository,
    @Inject(PLATFORM_SHIPPING_PORT)
    private readonly platformShipping: IPlatformShippingPort,
  ) {}

  async execute(command: CancelPlatformShipmentCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order || !order.internalId) {
      throw new OrderNotFoundException(command.orderId);
    }

    const shipment = await this.shipmentRepo.findByOrderId(order.internalId);
    if (!shipment) {
      this.logger.warn(
        `No shipment found for cancelled order '${command.orderId}' — skipping cancel.`,
      );
      return;
    }

    if (shipment.vendorOrderId) {
      try {
        await this.platformShipping.cancelShipment(shipment.vendorOrderId);
      } catch (err) {
        this.logger.error(
          `Failed to cancel Torod shipment '${shipment.vendorOrderId}' for order '${command.orderId}': ${String(err)}. Marking local shipment cancelled anyway.`,
        );
      }
    }

    shipment.appendEvent({
      timestamp: new Date(),
      status: 'cancelled',
      description: 'Shipment cancelled due to order cancellation.',
    });

    await this.shipmentRepo.update(shipment);
  }
}
