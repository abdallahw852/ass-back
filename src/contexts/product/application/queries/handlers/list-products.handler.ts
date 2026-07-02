import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListProductsQuery } from '../list-products.query';
import type { IProductReadRepository } from '../../../domain/product-read.repository.interface';
import { PRODUCT_READ_REPOSITORY } from '../../../domain/product-read.repository.interface';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<ListProductsQuery> {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly readRepository: IProductReadRepository,
  ) {}

  async execute(query: ListProductsQuery) {
    const page = query.options?.page ?? 1;
    const limit = query.options?.limit ?? 20;

    const { items, total } = await this.readRepository.findBySupplierId(
      query.supplierId,
      query.options,
    );

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
