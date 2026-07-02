import { MarkOrderShippedByPlatformCommand } from '../../../order/application/commands/mark-order-shipped-by-platform.command';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TradeOrder } from '../../../order/domain/trade-order.entity';
import { Shipment } from '../../domain/shipment.entity';
import type { IShipmentRepository } from '../../domain/shipment.repository.interface';
import { ShipmentAlreadyExistsException } from '../../domain/shipping.exceptions';
import type { IPlatformShippingPort } from '../ports/platform-shipping.port';
import { RequestPlatformShipmentCommand } from './request-platform-shipment.command';
import { RequestPlatformShipmentHandler } from './request-platform-shipment.handler';

function makePlatformOrder(): TradeOrder {
  return TradeOrder.reconstitute({
    _id: 'order-public-id',
    internalId: 1,
    referenceNumber: 'ORD-2026-00001',
    buyerId: 10,
    supplierId: 20,
    lines: [],
    subtotal: 100,
    currency: 'SAR',
    status: 'paid',
    paymentIntentId: null,
    paymobOrderId: null,
    cartItemIds: [],
    shippingMethod: 'platform',
    platformShippingSnapshot: {
      courierPartnerId: 1,
      destination: { line1: '123 Main St', cityId: 42, country: 'SA' },
    },
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
    shippedAt: null,
    deliveredAt: null,
    releasedAt: null,
    autoReleaseAt: null,
    protectionWindowDays: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('RequestPlatformShipmentHandler', () => {
  const tradeOrderRepo: jest.Mocked<ITradeOrderRepository> = {
    save: jest.fn(),
    saveMany: jest.fn(),
    findByPublicId: jest.fn(),
    findByInternalId: jest.fn(),
    findByPaymobOrderId: jest.fn(),
    findByBuyerId: jest.fn(),
    findBySupplierId: jest.fn(),
    findDeliveredForAutoRelease: jest.fn(),
    update: jest.fn(),
  };
  const shipmentRepo: jest.Mocked<IShipmentRepository> = {
    save: jest.fn(),
    findByPublicId: jest.fn(),
    findByOrderId: jest.fn(),
    findByVendorOrderId: jest.fn(),
    update: jest.fn(),
  };
  const platformShipping: jest.Mocked<IPlatformShippingPort> = {
    getRates: jest.fn(),
    requestLabel: jest.fn(),
    cancelShipment: jest.fn(),
  };
  const commandBus = { execute: jest.fn() };
  const userRepo = { findOne: jest.fn().mockResolvedValue(null) };

  let handler: RequestPlatformShipmentHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new RequestPlatformShipmentHandler(
      tradeOrderRepo,
      shipmentRepo,
      platformShipping,
      commandBus as never,
      userRepo as never,
    );
  });

  it('creates a shipment and marks the order shipped by platform', async () => {
    tradeOrderRepo.findByPublicId.mockResolvedValue(makePlatformOrder());
    shipmentRepo.findByOrderId.mockResolvedValue(null);
    platformShipping.requestLabel.mockResolvedValue({
      carrier: 'torod',
      trackingNumber: null,
      trackingUrl: null,
      vendorOrderId: 'TOROD-123',
    });
    shipmentRepo.save.mockResolvedValue({} as never);
    commandBus.execute.mockResolvedValue(undefined);

    await handler.execute(
      new RequestPlatformShipmentCommand('order-public-id'),
    );

    const savedShipment = shipmentRepo.save.mock.calls[0][0];
    expect(savedShipment.carrier).toBe('torod');
    expect(savedShipment.vendorOrderId).toBe('TOROD-123');
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(MarkOrderShippedByPlatformCommand),
    );
  });

  it('rejects duplicate platform shipments', async () => {
    tradeOrderRepo.findByPublicId.mockResolvedValue(makePlatformOrder());
    shipmentRepo.findByOrderId.mockResolvedValue(
      Shipment.create({
        orderId: 1,
        carrier: 'torod',
        trackingNumber: null,
        trackingUrl: null,
        vendorOrderId: 'TOROD-123',
      }),
    );

    await expect(
      handler.execute(new RequestPlatformShipmentCommand('order-public-id')),
    ).rejects.toThrow(ShipmentAlreadyExistsException);
  });
});
