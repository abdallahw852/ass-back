import { Test, type TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { PRODUCT_VARIANT_REPOSITORY } from '../../../domain/product-variant.repository.interface';
import { PRODUCT_BUNDLE_ITEM_REPOSITORY } from '../../../domain/product-bundle-item.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../../category/domain/category.repository.interface';
import { UpdateProductCommand } from '../update-product.command';
import { UpdateProductHandler } from './update-product.handler';
import { Product } from '../../../domain/product.entity';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductCondition } from '../../../domain/enums/product-condition.enum';
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

describe('UpdateProductHandler', () => {
  let handler: UpdateProductHandler;

  const productRepository = {
    findByPublicIdWithRelations: jest.fn(),
    findByPublicId: jest.fn(),
    update: jest.fn(),
  };

  const variantRepository = { remove: jest.fn() };
  const bundleItemRepository = { removeByParentProductId: jest.fn() };
  const categoryRepository = { findByPublicId: jest.fn() };

  // Minimal DataSource mock with queryRunner
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const dataSource = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
  };

  const eventBus = { publish: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductHandler,
        { provide: PRODUCT_REPOSITORY, useValue: productRepository },
        { provide: PRODUCT_VARIANT_REPOSITORY, useValue: variantRepository },
        {
          provide: PRODUCT_BUNDLE_ITEM_REPOSITORY,
          useValue: bundleItemRepository,
        },
        { provide: CATEGORY_REPOSITORY, useValue: categoryRepository },
        { provide: getDataSourceToken('write'), useValue: dataSource },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(UpdateProductHandler);
  });

  it('edit of ACTIVE product reverts to PENDING and publishes ProductUpdatedEvent', async () => {
    const product = makeProduct(ProductStatus.ACTIVE);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new UpdateProductCommand('prod-uuid-1', 10, {
      name: 'Updated Name',
    });
    const result = await handler.execute(command);

    expect(result.product.status).toBe(ProductStatus.PENDING);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(ProductUpdatedEvent),
    );
  });

  it('edit of DRAFT product keeps DRAFT status (revertToPendingForReview is a no-op)', async () => {
    const product = makeProduct(ProductStatus.DRAFT);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new UpdateProductCommand('prod-uuid-1', 10, {
      name: 'Updated Name',
    });
    const result = await handler.execute(command);

    expect(result.product.status).toBe(ProductStatus.DRAFT);
  });
});
