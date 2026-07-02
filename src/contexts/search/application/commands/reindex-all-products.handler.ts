import { ConflictException, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReindexAllProductsCommand } from './reindex-all-products.command';
import { ElasticsearchService } from '../../infrastructure/elasticsearch.service';
import type { SearchProductDocument } from '../../domain/search-product-document.interface';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { CategoryOrmEntity } from '../../../category/infrastructure/persistence/category.orm-entity';
import { ProductStatus } from '../../../product/domain/enums/product-status.enum';

const BATCH_SIZE = 100;

@CommandHandler(ReindexAllProductsCommand)
export class ReindexAllProductsHandler implements ICommandHandler<ReindexAllProductsCommand> {
  private readonly logger = new Logger(ReindexAllProductsHandler.name);
  private isRunning = false;

  constructor(
    private readonly es: ElasticsearchService,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(CategoryOrmEntity, 'write')
    private readonly categoryRepo: Repository<CategoryOrmEntity>,
  ) {}

  execute(): Promise<{ status: string }> {
    if (this.isRunning) {
      throw new ConflictException('Reindex already in progress');
    }
    this.isRunning = true;
    void this.runReindex().catch((err: unknown) =>
      this.logger.error(`Reindex failed unexpectedly: ${String(err)}`),
    );
    return Promise.resolve({ status: 'accepted' });
  }

  private async runReindex(): Promise<void> {
    let offset = 0;
    let indexed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      while (true) {
        const products = await this.productRepo.find({
          where: { status: ProductStatus.ACTIVE },
          order: { id: 'ASC' },
          take: BATCH_SIZE,
          skip: offset,
        });

        if (products.length === 0) break;

        const supplierIds = [...new Set(products.map((p) => p.supplierId))];
        const supplierRows = await this.supplierRepo.findBy({
          id: In(supplierIds),
        });
        const supplierMap = new Map(supplierRows.map((s) => [s.id, s]));

        const docs: SearchProductDocument[] = [];

        for (const product of products) {
          const supplier = supplierMap.get(product.supplierId);
          if (!supplier) {
            this.logger.warn(
              `Supplier ${product.supplierId} not found for product ${product._id}, skipping`,
            );
            skipped++;
            continue;
          }

          const categoryPath = product.categoryId
            ? await this.resolveCategoryPath(product.categoryId)
            : [];

          docs.push({
            id: product._id,
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
          });
        }

        if (docs.length > 0) {
          const result = await this.es.bulk(docs);
          indexed += result.indexed;
          failed += result.failed;
        }

        offset += BATCH_SIZE;
      }
    } finally {
      this.isRunning = false;
      this.logger.log(
        `Reindex complete: ${indexed} indexed, ${failed} failed, ${skipped} skipped`,
      );
    }
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
