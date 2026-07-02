import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UpdateShipmentFromWebhookCommand } from './update-shipment-from-webhook.command';
import type { IShipmentRepository } from '../../domain/shipment.repository.interface';
import { SHIPMENT_REPOSITORY } from '../../domain/shipment.repository.interface';
import { MarkOrderDeliveredCommand } from '../../../order/application/commands/mark-order-delivered.command';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';

@CommandHandler(UpdateShipmentFromWebhookCommand)
export class UpdateShipmentFromWebhookHandler implements ICommandHandler<UpdateShipmentFromWebhookCommand> {
  private readonly logger = new Logger(UpdateShipmentFromWebhookHandler.name);

  constructor(
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipmentRepo: IShipmentRepository,
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateShipmentFromWebhookCommand): Promise<void> {
    const { payload } = command;

    const shipment = await this.shipmentRepo.findByVendorOrderId(
      String(payload.order_id),
    );
    if (!shipment) {
      this.logger.warn(
        `Webhook received for unknown vendor order '${payload.order_id}' — ignoring.`,
      );
      return;
    }

    const normalizedStatus = (payload.status ?? '').toLowerCase();

    const parsedDate = payload.date_time ? new Date(payload.date_time) : null;
    const eventTimestamp =
      parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

    const isDuplicate = shipment.events.some(
      (e) =>
        e.timestamp.getTime() === eventTimestamp.getTime() &&
        e.status === normalizedStatus,
    );

    if (isDuplicate) {
      this.logger.log(
        `Duplicate webhook event for order '${payload.order_id}' status '${normalizedStatus}' — skipping.`,
      );
      return;
    }

    shipment.appendEvent({
      timestamp: eventTimestamp,
      status: normalizedStatus,
      description:
        payload.torod_description ??
        payload.description ??
        payload.courier_status ??
        normalizedStatus,
    });

    await this.shipmentRepo.update(shipment);

    if (normalizedStatus === 'delivered') {
      const order = await this.tradeOrderRepo.findByInternalId(
        shipment.orderId,
      );
      if (order) {
        await this.commandBus.execute(
          new MarkOrderDeliveredCommand(order.id, order.supplierId),
        );
      }
    }
  }
}
