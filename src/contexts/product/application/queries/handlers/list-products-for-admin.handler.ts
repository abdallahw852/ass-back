import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListProductsForAdminQuery } from '../list-products-for-admin.query';
import type { IProductReadRepository } from '../../../domain/product-read.repository.interface';
import { PRODUCT_READ_REPOSITORY } from '../../../domain/product-read.repository.interface';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

/**
 * Returns a paginated list of all products for admin review,
 * optionally filtered by status (e.g. "pending").
 */
@QueryHandler(ListProductsForAdminQuery)
export class ListProductsForAdminHandler implements IQueryHandler<ListProductsForAdminQuery> {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly readRepository: IProductReadRepository,
  ) {}

  async execute(query: ListProductsForAdminQuery) {
    const page = query.options?.page ?? 1;
    const limit = query.options?.limit ?? 20;

    const { items, total } = await this.readRepository.findAll(query.options);

    return {
      items: items.map((orm) =>
        ProductMapper.toResponse(ProductMapper.toDomain(orm)),
      ),
      total,
      page,
      limit,
    };
  }
}
