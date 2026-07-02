import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListCatalogProductsQuery } from '../list-catalog-products.query';
import { CatalogRepository } from '../../../infrastructure/repositories/catalog.repository';

@QueryHandler(ListCatalogProductsQuery)
@Injectable()
export class ListCatalogProductsHandler implements IQueryHandler<ListCatalogProductsQuery> {
  constructor(private readonly catalogRepo: CatalogRepository) {}

  async execute(query: ListCatalogProductsQuery) {
    const { filters } = query;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const { items, total } = await this.catalogRepo.findActive(filters);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
