import { EventsHandler, CommandBus, type IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCreatedEvent } from '../../../product/domain/events/product-created.event';
import { ProductUpdatedEvent } from '../../../product/domain/events/product-updated.event';
import { ProductDeletedEvent } from '../../../product/domain/events/product-deleted.event';
import { IndexDocumentCommand } from '../../application/commands/index-document.command';
import { DeleteDocumentCommand } from '../../application/commands/delete-document.command';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { CategoryOrmEntity } from '../../../category/infrastructure/persistence/category.orm-entity';

@EventsHandler(ProductCreatedEvent, ProductUpdatedEvent)
export class SearchIndexerListener implements IEventHandler<
  ProductCreatedEvent | ProductUpdatedEvent
> {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(CategoryOrmEntity, 'write')
    private readonly categoryRepo: Repository<CategoryOrmEntity>,
  ) {}

  async handle(
    event: ProductCreatedEvent | ProductUpdatedEvent,
  ): Promise<void> {
    const p = event.payload;

    // Load latest data from DB to denormalize into the search doc
    const [product, supplier] = await Promise.all([
      this.productRepo.findOne({ where: { id: p.internalId } }),
      this.supplierRepo.findOne({ where: { id: p.supplierId } }),
    ]);

    if (!product || !supplier) return;

    const categoryPath = product.categoryId
      ? await this.resolveCategoryPath(product.categoryId)
      : [];

    await this.commandBus.execute(
      new IndexDocumentCommand({
        id: event.aggregateId,
        nameEn: product.name,
        nameAr: product.nameAr ?? null,
        descriptionEn: product.description ?? null,
        descriptionAr: product.descriptionAr ?? null,
        costPrice: Number(product.costPrice),
        discountedPrice:
          product.discountedPrice !== null
            ? Number(product.discountedPrice)
            : null,
        moq: product.moq,
        viewCount: product.viewCount ?? 0,
        supplierId: supplier.id,
        supplierCountry: supplier.country,
        supplierType: supplier.supplierType ?? null,
        supplierIsVerified: supplier.isVerified,
        categoryId: product.categoryId ?? null,
        categoryPath,
        currency: product.currency,
        condition: product.condition,
        status: product.status,
        createdAt: product.createdAt,
      }),
    );
  }

  private async resolveCategoryPath(categoryId: string): Promise<string[]> {
    const path: string[] = [];
    let current = await this.categoryRepo.findOne({
      where: { _id: categoryId },
      select: ['_id', 'parentId'],
    });

    while (current && path.length < 5) {
      path.push(current._id);
      if (current.parentId === null) break;
      current = await this.categoryRepo.findOne({
        where: { id: current.parentId },
        select: ['_id', 'parentId'],
      });
    }

    return path;
  }
}

@EventsHandler(ProductDeletedEvent)
export class SearchDeleteListener implements IEventHandler<ProductDeletedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ProductDeletedEvent): Promise<void> {
    await this.commandBus.execute(new DeleteDocumentCommand(event.aggregateId));
  }
}
