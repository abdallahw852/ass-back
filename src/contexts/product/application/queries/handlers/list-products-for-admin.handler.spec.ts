import { Test, type TestingModule } from '@nestjs/testing';
import { PRODUCT_READ_REPOSITORY } from '../../../domain/product-read.repository.interface';
import { ListProductsForAdminQuery } from '../list-products-for-admin.query';
import { ListProductsForAdminHandler } from './list-products-for-admin.handler';
import { ProductOrmEntity } from '../../../infrastructure/persistence/product.orm-entity';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductCondition } from '../../../domain/enums/product-condition.enum';

function makeOrmProduct(
  overrides: Partial<ProductOrmEntity> = {},
): ProductOrmEntity {
  const entity = new ProductOrmEntity();
  entity.id = 1;
  entity._id = 'prod-uuid-1';
  entity.supplierId = 10;
  entity.type = 'ready';
  entity.status = ProductStatus.PENDING;
  entity.name = 'Test Product';
  entity.costPrice = 100;
  entity.shippingPrice = 10;
  entity.usePlatformShipping = false;
  entity.stockQuantity = 5;
  entity.maxPerCustomer = 0;
  entity.trackInventory = false;
  entity.requiresShipping = true;
  entity.moq = 1;
  entity.condition = ProductCondition.NEW;
  entity.currency = 'SAR';
  entity.images = [];
  entity.optionGroups = [];
  entity.attributes = [];
  entity.viewCount = 0;
  entity.variants = [];
  entity.bundleItems = [];
  entity.createdAt = new Date('2024-01-01');
  entity.updatedAt = new Date('2024-01-01');
  Object.assign(entity, overrides);
  return entity;
}

describe('ListProductsForAdminHandler', () => {
  let handler: ListProductsForAdminHandler;

  const readRepository = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListProductsForAdminHandler,
        { provide: PRODUCT_READ_REPOSITORY, useValue: readRepository },
      ],
    }).compile();

    handler = module.get(ListProductsForAdminHandler);
  });

  it('returns a paginated list with items, total, page, and limit', async () => {
    const ormProduct = makeOrmProduct();
    readRepository.findAll.mockResolvedValue({ items: [ormProduct], total: 1 });

    const query = new ListProductsForAdminQuery({ page: 1, limit: 20 });
    const result = await handler.execute(query);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]._id).toBe('prod-uuid-1');
  });

  it('passes status filter to the repository', async () => {
    readRepository.findAll.mockResolvedValue({ items: [], total: 0 });

    const query = new ListProductsForAdminQuery({
      status: 'pending',
      page: 1,
      limit: 20,
    });
    await handler.execute(query);

    expect(readRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('uses defaults when no options provided', async () => {
    readRepository.findAll.mockResolvedValue({ items: [], total: 0 });

    const query = new ListProductsForAdminQuery();
    const result = await handler.execute(query);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
