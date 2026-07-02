import { CheckoutCartCommand } from './checkout-cart.command';
import { CheckoutCartHandler } from './checkout-cart.handler';
import { InsufficientStockException } from '../../../inventory/domain/inventory.exceptions';
import { ProductStatus } from '../../../product/domain/enums';

function makeCartItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    _id: 'cart-item-uuid-1',
    productId: 1,
    productPublicId: 'prod-uuid-1',
    productName: 'Test Product',
    variantPublicId: null,
    quantity: 5,
    supplierId: 10,
    ...overrides,
  };
}

function makeProduct(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 1,
    status: ProductStatus.ACTIVE,
    moq: 1,
    stockQuantity: 100,
    costPrice: '50.00',
    discountedPrice: null,
    ...overrides,
  };
}

function buildHandler(
  cartItems: Record<string, unknown>[],
  products: Record<string, unknown>[],
): CheckoutCartHandler {
  const cartRepo = {
    findOrCreateByBuyer: jest.fn().mockResolvedValue({
      items: cartItems,
      supplierGroups: [],
    }),
  };

  const productRepo = {
    find: jest.fn().mockResolvedValue(products),
  };

  const tierRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const tradeOrderRepo = {
    saveMany: jest.fn().mockResolvedValue([
      {
        id: 'order-uuid-1',
        referenceNumber: 'REF-001',
        buyerId: 1,
        supplierId: 10,
        subtotal: 250,
        status: 'pending',
        createdAt: new Date(),
      },
    ]),
  };

  const paymentGateway = {
    createPaymentIntention: jest.fn().mockResolvedValue({
      paymentIntentId: 'pi_123',
      clientSecret: 'cs_123',
    }),
  };

  return new CheckoutCartHandler(
    tradeOrderRepo as never,
    cartRepo as never,
    tierRepo as never,
    productRepo as never,
    paymentGateway as never,
  );
}

describe('CheckoutCartHandler — stock check', () => {
  it('throws InsufficientStockException when requested quantity exceeds stockQuantity', async () => {
    const cartItem = makeCartItem({ quantity: 50 });
    const product = makeProduct({ stockQuantity: 10 });

    const handler = buildHandler([cartItem], [product]);

    await expect(
      handler.execute(new CheckoutCartCommand(1, [])),
    ).rejects.toThrow(InsufficientStockException);
  });

  it('throws InsufficientStockException when stockQuantity is 0 and quantity > 0', async () => {
    const cartItem = makeCartItem({ quantity: 1 });
    const product = makeProduct({ stockQuantity: 0 });

    const handler = buildHandler([cartItem], [product]);

    await expect(
      handler.execute(new CheckoutCartCommand(1, [])),
    ).rejects.toThrow(InsufficientStockException);
  });

  it('proceeds normally when quantity is within stock', async () => {
    const cartItem = makeCartItem({ quantity: 5 });
    const product = makeProduct({ stockQuantity: 100 });

    const handler = buildHandler([cartItem], [product]);

    await expect(
      handler.execute(new CheckoutCartCommand(1, [])),
    ).resolves.toBeDefined();
  });

  it('proceeds normally when quantity exactly equals stockQuantity', async () => {
    const cartItem = makeCartItem({ quantity: 100 });
    const product = makeProduct({ stockQuantity: 100 });

    const handler = buildHandler([cartItem], [product]);

    await expect(
      handler.execute(new CheckoutCartCommand(1, [])),
    ).resolves.toBeDefined();
  });
});
