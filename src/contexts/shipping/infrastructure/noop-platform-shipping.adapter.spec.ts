import { NoopPlatformShippingAdapter } from './noop-platform-shipping.adapter';

describe('NoopPlatformShippingAdapter', () => {
  it('returns placeholder platform tracking details', async () => {
    const adapter = new NoopPlatformShippingAdapter();

    const result = await adapter.requestLabel({
      orderId: 'order-public-id',
      courierPartnerId: 1,
      recipient: {
        name: 'Test',
        email: 'test@example.com',
        phone: '0500000000',
      },
      destination: { line1: 'Street 1', cityId: 1, country: 'SA' },
      items: [],
      totals: { amount: 100, currency: 'SAR' },
      weightKg: 1,
      boxCount: 1,
    });

    expect(result.carrier).toBe('noop-carrier');
    expect(result.trackingNumber).toBeNull();
    expect(result.vendorOrderId).toMatch(/^NOOP-[0-9A-F]{8}$/);
  });

  it('returns rate options', async () => {
    const adapter = new NoopPlatformShippingAdapter();
    const rates = await adapter.getRates({
      destination: { cityId: 1, country: 'SA' },
      weightKg: 1,
      boxCount: 1,
      totals: { amount: 100, currency: 'SAR' },
    });
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].courierPartnerId).toBe(1);
  });
});
