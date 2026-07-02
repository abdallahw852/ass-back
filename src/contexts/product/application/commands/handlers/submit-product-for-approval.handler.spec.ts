import { Test, type TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { SubmitProductForApprovalCommand } from '../submit-product-for-approval.command';
import { SubmitProductForApprovalHandler } from './submit-product-for-approval.handler';
import { Product } from '../../../domain/product.entity';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductCondition } from '../../../domain/enums/product-condition.enum';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { InvalidProductStatusTransitionException } from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';

function makeProduct(status: ProductStatus, supplierId = 10): Product {
  return Product.reconstitute({
    _id: 'prod-uuid-1',
    internalId: 1,
    supplierId,
    type: 'ready',
    status,
    name: 'Test Product',
    nameAr: null,
    sku: null,
    description: null,
    descriptionAr: null,
    mainTitle: null,
    mainTitleAr: null,
    promotionalTitle: null,
    promotionalTitleAr: null,
    images: [],
    categoryId: null,
    subcategoryId: null,
    costPrice: 100,
    shippingPrice: 10,
    usePlatformShipping: false,
    weightKg: null,
    discountedPrice: null,
    discountPercentage: null,
    discountEndDate: null,
    stockQuantity: 5,
    maxPerCustomer: 0,
    trackInventory: false,
    requiresShipping: true,
    optionGroups: [],
    bookingAvailableTime: null,
    bookingAvailableDate: null,
    bookingCapacity: null,
    digitalFileUrl: null,
    digitalFileType: null,
    digitalFileSize: null,
    bundlePrice: null,
    moq: 1,
    unitCount: null,
    unitType: null,
    unitTypeAr: null,
    condition: ProductCondition.NEW,
    currency: 'SAR',
    attributes: [],
    viewCount: 0,
    variants: [],
    bundleItems: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    rejectionReason: null,
  });
}

describe('SubmitProductForApprovalHandler', () => {
  let handler: SubmitProductForApprovalHandler;

  const productRepository = {
    findByPublicIdWithRelations: jest.fn(),
    update: jest.fn(),
  };

  const eventBus = { publish: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitProductForApprovalHandler,
        { provide: PRODUCT_REPOSITORY, useValue: productRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(SubmitProductForApprovalHandler);
  });

  it('happy path (DRAFT → PENDING): saves product with PENDING status and publishes ProductUpdatedEvent', async () => {
    const product = makeProduct(ProductStatus.DRAFT);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    // update() returns the saved product (re-use same domain entity)
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new SubmitProductForApprovalCommand('prod-uuid-1', 10);
    const result = await handler.execute(command);

    expect(productRepository.update).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(ProductUpdatedEvent),
    );
    expect(result.product).toBeDefined();
    expect(result.product.status).toBe(ProductStatus.PENDING);
  });

  it('throws ProductNotFoundException when product is not found', async () => {
    productRepository.findByPublicIdWithRelations.mockResolvedValue(null);

    const command = new SubmitProductForApprovalCommand('nonexistent', 10);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ProductNotFoundException,
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('propagates error when assertOwnedBy throws (wrong supplier)', async () => {
    const product = makeProduct(ProductStatus.DRAFT, 99);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);

    const command = new SubmitProductForApprovalCommand('prod-uuid-1', 10);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ProductNotFoundException,
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('throws InvalidProductStatusTransitionException when product is already PENDING', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);

    const command = new SubmitProductForApprovalCommand('prod-uuid-1', 10);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidProductStatusTransitionException,
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });
});
