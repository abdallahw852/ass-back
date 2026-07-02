import { FileReturnRequestCommand } from './file-return-request.command';
import { FileReturnRequestHandler } from './file-return-request.handler';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TradeOrder } from '../../../order/domain/trade-order.entity';
import { OrderNotFoundForReturnException } from '../../domain/returns.exceptions';
import type { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';

function makeOrder(overrides: { supplierId?: number } = {}): TradeOrder {
  return TradeOrder.reconstitute({
    _id: 'order-public-id',
    internalId: 10,
    referenceNumber: 'ORD-2026-00001',
    buyerId: 20,
    supplierId: overrides.supplierId ?? 1,
    lines: [
      {
        productId: 'p1',
        productName: 'Product 1',
        variantId: null,
        quantity: 2,
        unitPrice: 50,
        lineTotal: 100,
      },
    ],
    subtotal: 100,
    shippingCost: 0,
    currency: 'SAR',
    status: 'delivered',
    paymentIntentId: null,
    paymobOrderId: null,
    cartItemIds: [],
    shippingMethod: 'supplier',
    platformShippingSnapshot: null,
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
    shippedAt: null,
    deliveredAt: new Date('2026-01-01T00:00:00Z'),
    releasedAt: null,
    autoReleaseAt: null,
    protectionWindowDays: 14,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
}

describe('FileReturnRequestHandler', () => {
  const tradeOrderRepo: jest.Mocked<ITradeOrderRepository> = {
    save: jest.fn(),
    saveMany: jest.fn(),
    findByPublicId: jest.fn(),
    findByInternalId: jest.fn(),
    findByPaymobOrderId: jest.fn(),
    findByBuyerId: jest.fn(),
    findBySupplierId: jest.fn(),
    findDeliveredForAutoRelease: jest.fn(),
    findPendingPaymentByRfqAndBuyer: jest.fn(),
    findStatusByRfqId: jest.fn(),
    setRfqLink: jest.fn(),
    update: jest.fn(),
  };

  const returnRequestRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  let handler: FileReturnRequestHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new FileReturnRequestHandler(
      tradeOrderRepo,
      returnRequestRepo as never,
      userRepo as never,
    );
  });

  it('throws OrderNotFoundForReturnException when the order does not exist', async () => {
    tradeOrderRepo.findByPublicId.mockResolvedValue(null);

    await expect(
      handler.execute(
        new FileReturnRequestCommand('missing-order', 1, 99, 'Damaged'),
      ),
    ).rejects.toThrow(OrderNotFoundForReturnException);
  });

  it('throws OrderNotFoundForReturnException when the order belongs to another supplier', async () => {
    tradeOrderRepo.findByPublicId.mockResolvedValue(
      makeOrder({ supplierId: 2 }),
    );

    await expect(
      handler.execute(
        new FileReturnRequestCommand('order-public-id', 1, 99, 'Damaged'),
      ),
    ).rejects.toThrow(OrderNotFoundForReturnException);
  });

  it('files a return request for an order owned by the supplier', async () => {
    const order = makeOrder({ supplierId: 1 });
    tradeOrderRepo.findByPublicId.mockResolvedValue(order);

    const createdEntity: Partial<ReturnRequestOrmEntity> = {
      order_id: 10,
      supplier_id: 1,
      buyer_id: 20,
      reason: 'Damaged',
      status: 'pending',
      total_amount: 100,
      currency: 'SAR',
      items_count: 1,
    };
    returnRequestRepo.create.mockReturnValue(createdEntity);
    returnRequestRepo.save.mockResolvedValue({
      ...createdEntity,
      _id: 'return-public-id',
      created_at: new Date('2026-01-03T00:00:00Z'),
      refund_amount: null,
    });
    userRepo.findOne.mockResolvedValue({ id: 20, name: 'John Buyer' });

    const result = await handler.execute(
      new FileReturnRequestCommand('order-public-id', 1, 99, 'Damaged'),
    );

    expect(returnRequestRepo.create.mock.calls[0]?.[0]).toMatchObject({
      order_id: 10,
      supplier_id: 1,
      buyer_id: 20,
      reason: 'Damaged',
      status: 'pending',
      total_amount: 100,
      currency: 'SAR',
      items_count: 1,
    });
    expect(result).toMatchObject({
      id: 'return-public-id',
      orderId: 'order-public-id',
      customerName: 'John Buyer',
      status: 'pending',
      totalAmount: 100,
      items: 1,
      reason: 'Damaged',
    });
  });
});
