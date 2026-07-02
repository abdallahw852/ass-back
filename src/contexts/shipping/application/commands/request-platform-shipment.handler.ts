import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RequestPlatformShipmentCommand } from './request-platform-shipment.command';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';
import { OrderNotFoundException } from '../../../order/domain/order.exceptions';
import { MarkOrderShippedByPlatformCommand } from '../../../order/application/commands/mark-order-shipped-by-platform.command';
import { Shipment } from '../../domain/shipment.entity';
import type { IShipmentRepository } from '../../domain/shipment.repository.interface';
import { SHIPMENT_REPOSITORY } from '../../domain/shipment.repository.interface';
import { ShipmentAlreadyExistsException } from '../../domain/shipping.exceptions';
import type { IPlatformShippingPort } from '../ports/platform-shipping.port';
import { PLATFORM_SHIPPING_PORT } from '../ports/platform-shipping.port';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { MissingPlatformShippingSnapshotException } from '../../domain/shipping.exceptions';

@CommandHandler(RequestPlatformShipmentCommand)
export class RequestPlatformShipmentHandler implements ICommandHandler<RequestPlatformShipmentCommand> {
  private readonly logger = new Logger(RequestPlatformShipmentHandler.name);

  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipmentRepo: IShipmentRepository,
    @Inject(PLATFORM_SHIPPING_PORT)
    private readonly platformShipping: IPlatformShippingPort,
    private readonly commandBus: CommandBus,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(command: RequestPlatformShipmentCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order || !order.internalId) {
      throw new OrderNotFoundException(command.orderId);
    }

    const existingShipment = await this.shipmentRepo.findByOrderId(
      order.internalId,
    );
    if (existingShipment) {
      throw new ShipmentAlreadyExistsException(order.id);
    }

    const snapshot = order.platformShippingSnapshot;
    if (!snapshot) {
      throw new MissingPlatformShippingSnapshotException(order.id);
    }

    const buyer = await this.userRepo.findOne({ where: { id: order.buyerId } });
    if (!buyer) {
      this.logger.error(
        `Buyer '${order.buyerId}' not found for order '${order.id}' — cannot request shipping label.`,
      );
      throw new NotFoundException(
        `Buyer account for order '${order.id}' no longer exists.`,
      );
    }

    const label = await this.platformShipping.requestLabel({
      orderId: order.id,
      courierPartnerId: snapshot.courierPartnerId,
      recipient: {
        name: buyer.name ?? buyer.email,
        email: buyer.email,
        phone: buyer.phone ?? '',
      },
      destination: snapshot.destination,
      items: order.lines.map((l) => ({
        description: l.productName,
        qty: l.quantity,
        price: l.unitPrice,
      })),
      totals: { amount: order.subtotal, currency: order.currency },
      weightKg: 1,
      boxCount: 1,
    });

    const shipment = Shipment.create({
      orderId: order.internalId,
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl,
      vendorOrderId: label.vendorOrderId,
      status: 'label_created',
      events: [
        {
          timestamp: new Date(),
          status: 'label_created',
          description: 'Platform shipping label created.',
        },
      ],
    });

    await this.shipmentRepo.save(shipment);
    await this.commandBus.execute(
      new MarkOrderShippedByPlatformCommand(
        order.id,
        label.carrier,
        label.trackingNumber ?? label.vendorOrderId,
        label.trackingUrl ?? null,
      ),
    );
  }
}
