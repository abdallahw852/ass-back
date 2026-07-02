import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

import { ListCatalogProductsQuery } from '../application/queries/list-catalog-products.query';
import { GetCatalogProductQuery } from '../application/queries/get-catalog-product.query';
import { GetHomepageSectionsQuery } from '../application/queries/get-homepage-sections.query';
import { IncrementViewCountCommand } from '../application/commands/increment-view-count.command';

import { ListCatalogProductsDto } from './dto/list-catalog-products.dto';
import { CatalogFormatter } from './catalog.formatter';
import type {
  CatalogProductCard,
  CatalogProductDetail,
} from '../infrastructure/repositories/catalog.repository';

/**
 * Public buyer-facing catalog endpoints.
 * No authentication required — all routes are open.
 */
@AllowUnverified()
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly storageService: StorageService,
  ) {}

  /** Homepage sections: Recently Arrived, Best Deals, Top Rated. */
  @Get('homepage')
  async getHomepage(): Promise<Record<string, unknown>> {
    const result = (await this.queryBus.execute(
      new GetHomepageSectionsQuery(),
    )) as unknown as {
      sections: {
        type: string;
        title: string;
        titleAr: string;
        products: CatalogProductCard[];
      }[];
    };

    const sections = await Promise.all(
      result.sections.map(async (section) => ({
        ...section,
        products: await Promise.all(
          section.products.map((p) =>
            CatalogFormatter.card(p, this.storageService),
          ),
        ),
      })),
    );

    return { sections };
  }

  /** Paginated, filterable product listing for buyers. */
  @Get('products')
  async listProducts(
    @Query() dto: ListCatalogProductsDto,
  ): Promise<Record<string, unknown>> {
    const result = (await this.queryBus.execute(
      new ListCatalogProductsQuery({
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        condition: dto.condition,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        search: dto.search,
        sortBy: dto.sortBy,
        page: dto.page,
        limit: dto.limit,
      }),
    )) as unknown as {
      items: CatalogProductCard[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    return await CatalogFormatter.list(result, this.storageService);
  }

  /** Full product detail for a buyer. Increments view count asynchronously. */
  @Get('products/:productId')
  async getProduct(
    @Param('productId') productId: string,
  ): Promise<Record<string, unknown>> {
    const result = (await this.queryBus.execute(
      new GetCatalogProductQuery(productId),
    )) as unknown as { product: CatalogProductDetail };

    this.commandBus
      .execute(new IncrementViewCountCommand(productId))
      .catch((error: unknown) => {
        Logger.error(
          'Failed to increment view count',
          error instanceof Error ? error.stack : String(error),
          CatalogController.name,
        );
      });

    return {
      product: await CatalogFormatter.detail(
        result.product,
        this.storageService,
      ),
    };
  }
}
