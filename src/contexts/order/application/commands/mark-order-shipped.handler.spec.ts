import { MarkOrderShippedCommand } from './mark-order-shipped.command';
import { MarkOrderShippedHandler } from './mark-order-shipped.handler';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TradeOrder } from '../../domain/trade-order.entity';
import { PlatformShipmentNotAllowedFromSupplierException } from '../../domain/order.exceptions';

function makeOrder(shippingMethod: 'platform' | 'supplier'): TradeOrder {
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
    shippingMethod,
    platformShippingSnapshot: null,
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

describe('MarkOrderShippedHandler', () => {
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
  const eventBus = { publish: jest.fn() };

  let handler: MarkOrderShippedHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new MarkOrderShippedHandler(tradeOrderRepo, eventBus as never);
  });

  it('marks a supplier-shipping order shipped with tracking URL', async () => {
    const order = makeOrder('supplier');
    tradeOrderRepo.findByPublicId.mockResolvedValue(order);
    tradeOrderRepo.update.mockResolvedValue(undefined);

    await handler.execute(
      new MarkOrderShippedCommand(
        'order-public-id',
        20,
        'DHL',
        'TRK123',
        'https://track.example/TRK123',
      ),
    );

    expect(order.status).toBe('shipped');
    expect(order.trackingUrl).toBe('https://track.example/TRK123');
    expect(tradeOrderRepo.update.mock.calls[0][0]).toBe(order);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('rejects supplier shipment for platform-shipping orders', async () => {
    tradeOrderRepo.findByPublicId.mockResolvedValue(makeOrder('platform'));

    await expect(
      handler.execute(
        new MarkOrderShippedCommand('order-public-id', 20, 'DHL', 'TRK123'),
      ),
    ).rejects.toThrow(PlatformShipmentNotAllowedFromSupplierException);
  });
});
