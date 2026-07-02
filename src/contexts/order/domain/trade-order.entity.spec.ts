import { TradeOrder } from './trade-order.entity';
import {
  OrderTransitionException,
  PlatformShipmentNotAllowedFromSupplierException,
  SupplierShipmentNotAllowedFromPlatformException,
} from './order.exceptions';

function makeOrder(
  status = 'pending_payment',
  shippingMethod: 'platform' | 'supplier' = 'supplier',
): TradeOrder {
  const o = TradeOrder.reconstitute({
    _id: 'test-uuid',
    internalId: 1,
    referenceNumber: 'ORD-2025-00001',
    buyerId: 10,
    supplierId: 20,
    lines: [],
    subtotal: 1000,
    currency: 'SAR',
    status: status as any,
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
  return o;
}

describe('TradeOrder state machine', () => {
  // ── Valid transitions ────────────────────────────────────────────────────
  it('pending_payment → paid', () => {
    const o = makeOrder('pending_payment');
    o.markAsPaid();
    expect(o.status).toBe('paid');
  });

  it('paid → shipped', () => {
    const o = makeOrder('paid');
    o.markAsShippedBySupplier('DHL', 'TRK123', 'https://track.example/TRK123');
    expect(o.status).toBe('shipped');
    expect(o.carrier).toBe('DHL');
    expect(o.trackingNumber).toBe('TRK123');
    expect(o.trackingUrl).toBe('https://track.example/TRK123');
    expect(o.shippedAt).not.toBeNull();
  });

  it('paid → shipped through platform shipping', () => {
    const o = makeOrder('paid', 'platform');
    o.markAsShippedByPlatform(
      'asas-platform',
      'PLAT-123',
      'https://shipping.asas.local/track/PLAT-123',
    );
    expect(o.status).toBe('shipped');
    expect(o.carrier).toBe('asas-platform');
    expect(o.trackingNumber).toBe('PLAT-123');
    expect(o.trackingUrl).toBe('https://shipping.asas.local/track/PLAT-123');
    expect(o.shippedAt).not.toBeNull();
  });

  it('shipped → delivered (sets autoReleaseAt)', () => {
    const o = makeOrder('shipped');
    const before = Date.now();
    o.markAsDelivered();
    const after = Date.now();
    expect(o.status).toBe('delivered');
    expect(o.deliveredAt).not.toBeNull();
    const autoRelease = o.autoReleaseAt!.getTime();
    // autoReleaseAt should be ~14 days after now
    const expectedMs = 14 * 24 * 60 * 60 * 1000;
    expect(autoRelease).toBeGreaterThanOrEqual(before + expectedMs);
    expect(autoRelease).toBeLessThanOrEqual(after + expectedMs);
  });

  it('delivered → released via confirmReceipt', () => {
    const o = makeOrder('delivered');
    o.confirmReceipt();
    expect(o.status).toBe('released');
    expect(o.releasedAt).not.toBeNull();
  });

  it('delivered → released via release', () => {
    const o = makeOrder('delivered');
    o.release();
    expect(o.status).toBe('released');
  });

  it('disputed → released via release (after dispute resolved supplier)', () => {
    const o = makeOrder('disputed');
    o.release();
    expect(o.status).toBe('released');
  });

  it('released → completed', () => {
    const o = makeOrder('released');
    o.complete();
    expect(o.status).toBe('completed');
  });

  it('shipped → disputed', () => {
    const o = makeOrder('shipped');
    o.openDispute();
    expect(o.status).toBe('disputed');
  });

  it('delivered → disputed', () => {
    const o = makeOrder('delivered');
    o.openDispute();
    expect(o.status).toBe('disputed');
  });

  it('disputed → refunded', () => {
    const o = makeOrder('disputed');
    o.refund();
    expect(o.status).toBe('refunded');
  });

  it('pending_payment → cancelled', () => {
    const o = makeOrder('pending_payment');
    o.cancel();
    expect(o.status).toBe('cancelled');
  });

  // ── Invalid transitions ──────────────────────────────────────────────────
  it('throws on pay from paid', () => {
    const o = makeOrder('paid');
    expect(() => o.markAsPaid()).toThrow(OrderTransitionException);
  });

  it('throws on ship from pending_payment', () => {
    const o = makeOrder('pending_payment');
    expect(() => o.markAsShippedBySupplier('DHL', 'X')).toThrow(
      OrderTransitionException,
    );
  });

  it('throws when supplier ships a platform-shipping order', () => {
    const o = makeOrder('paid', 'platform');
    expect(() => o.markAsShippedBySupplier('DHL', 'X')).toThrow(
      PlatformShipmentNotAllowedFromSupplierException,
    );
  });

  it('throws when platform ships a supplier-shipping order', () => {
    const o = makeOrder('paid', 'supplier');
    expect(() =>
      o.markAsShippedByPlatform(
        'asas-platform',
        'PLAT-123',
        'https://shipping.asas.local/track/PLAT-123',
      ),
    ).toThrow(SupplierShipmentNotAllowedFromPlatformException);
  });

  it('throws on deliver from pending_payment', () => {
    const o = makeOrder('pending_payment');
    expect(() => o.markAsDelivered()).toThrow(OrderTransitionException);
  });

  it('throws on confirmReceipt from shipped', () => {
    const o = makeOrder('shipped');
    expect(() => o.confirmReceipt()).toThrow(OrderTransitionException);
  });

  it('throws on dispute from paid', () => {
    const o = makeOrder('paid');
    expect(() => o.openDispute()).toThrow(OrderTransitionException);
  });

  it('throws on dispute from completed', () => {
    const o = makeOrder('completed');
    expect(() => o.openDispute()).toThrow(OrderTransitionException);
  });

  it('throws on cancel from paid', () => {
    const o = makeOrder('paid');
    expect(() => o.cancel()).toThrow(OrderTransitionException);
  });

  it('throws on cancel from shipped', () => {
    const o = makeOrder('shipped');
    expect(() => o.cancel()).toThrow(OrderTransitionException);
  });

  it('throws on complete from disputed', () => {
    const o = makeOrder('disputed');
    expect(() => o.complete()).toThrow(OrderTransitionException);
  });

  it('throws on release from pending_payment', () => {
    const o = makeOrder('pending_payment');
    expect(() => o.release()).toThrow(OrderTransitionException);
  });
});
