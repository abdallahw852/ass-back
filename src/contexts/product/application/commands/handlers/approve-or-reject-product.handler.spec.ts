import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ApproveOrRejectProductCommand } from '../approve-or-reject-product.command';
import { ApproveOrRejectProductHandler } from './approve-or-reject-product.handler';
import { Product } from '../../../domain/product.entity';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductCondition } from '../../../domain/enums/product-condition.enum';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { InvalidProductStatusTransitionException } from '../../../domain/product.exceptions';
import { ProductApprovedEvent } from '../../../domain/events/product-approved.event';
import { ProductRejectedEvent } from '../../../domain/events/product-rejected.event';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { AppendAuditEventCommand } from '../../../../audit-log/application/commands/append-audit-event.command';

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

describe('ApproveOrRejectProductHandler', () => {
  let handler: ApproveOrRejectProductHandler;

  const productRepository = {
    findByPublicIdWithRelations: jest.fn(),
    update: jest.fn(),
  };

  const commandBus = {
    execute: jest.fn().mockResolvedValue(undefined),
  };

  const eventBus = { publish: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveOrRejectProductHandler,
        { provide: PRODUCT_REPOSITORY, useValue: productRepository },
        { provide: CommandBus, useValue: commandBus },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(ApproveOrRejectProductHandler);
  });

  it('approves a PENDING product: saves with ACTIVE status, dispatches audit event, publishes ProductApprovedEvent and ProductUpdatedEvent', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'approve',
      null,
      42,
      'admin',
    );
    const result = await handler.execute(command);

    expect(result.product.status).toBe(ProductStatus.ACTIVE);
    expect(productRepository.update).toHaveBeenCalledTimes(1);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AppendAuditEventCommand),
    );
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'product.approved' }),
    );

    const publishedEvents = eventBus.publish.mock.calls.map(
      (call: [unknown]) => call[0],
    );
    expect(publishedEvents.some((e) => e instanceof ProductApprovedEvent)).toBe(
      true,
    );
    expect(publishedEvents.some((e) => e instanceof ProductUpdatedEvent)).toBe(
      true,
    );
  });

  it('rejects a PENDING product: saves with REJECTED status and reason, publishes ProductRejectedEvent', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'reject',
      'Missing description',
      42,
      'admin',
    );
    const result = await handler.execute(command);

    expect(result.product.status).toBe(ProductStatus.REJECTED);
    expect(result.product.rejectionReason).toBe('Missing description');

    const publishedEvents = eventBus.publish.mock.calls.map(
      (call: [unknown]) => call[0],
    );
    expect(publishedEvents.some((e) => e instanceof ProductRejectedEvent)).toBe(
      true,
    );
  });

  it('throws ProductNotFoundException when product is not found', async () => {
    productRepository.findByPublicIdWithRelations.mockResolvedValue(null);

    const command = new ApproveOrRejectProductCommand(
      'nonexistent',
      'approve',
      null,
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ProductNotFoundException,
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('uses "No reason provided" as fallback when rejecting with null reason', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'reject',
      null,
      42,
      'admin',
    );
    const result = await handler.execute(command);

    expect(result.product.status).toBe(ProductStatus.REJECTED);
    expect(result.product.rejectionReason).toBe('No reason provided');
  });

  it('throws InvalidProductStatusTransitionException when approving a DRAFT product', async () => {
    const product = makeProduct(ProductStatus.DRAFT);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'approve',
      null,
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidProductStatusTransitionException,
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('dispatches audit event with correct entityType and eventName for approve', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'approve',
      null,
      42,
      'admin',
    );
    await handler.execute(command);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'product',
        eventName: 'product.approved',
        actorId: 42,
        actorRole: 'admin',
      }),
    );
  });

  it('dispatches audit event with correct entityType and eventName for reject', async () => {
    const product = makeProduct(ProductStatus.PENDING);
    productRepository.findByPublicIdWithRelations.mockResolvedValue(product);
    productRepository.update.mockImplementation((p: Product) =>
      Promise.resolve(p),
    );

    const command = new ApproveOrRejectProductCommand(
      'prod-uuid-1',
      'reject',
      'Bad content',
      42,
      'admin',
    );
    await handler.execute(command);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'product',
        eventName: 'product.rejected',
        actorId: 42,
        actorRole: 'admin',
      }),
    );
  });
});
