import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCatalogProductQuery } from '../get-catalog-product.query';
import { CatalogRepository } from '../../../infrastructure/repositories/catalog.repository';

@QueryHandler(GetCatalogProductQuery)
@Injectable()
export class GetCatalogProductHandler implements IQueryHandler<GetCatalogProductQuery> {
  constructor(private readonly catalogRepo: CatalogRepository) {}

  async execute(query: GetCatalogProductQuery) {
    const product = await this.catalogRepo.findOneActive(query.productId);
    if (!product) {
      throw new NotFoundException(`Product '${query.productId}' not found.`);
    }
    return { product };
  }
}
