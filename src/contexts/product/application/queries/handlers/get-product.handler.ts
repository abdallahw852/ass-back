import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductQuery } from '../get-product.query';
import type { IProductReadRepository } from '../../../domain/product-read.repository.interface';
import { PRODUCT_READ_REPOSITORY } from '../../../domain/product-read.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery> {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly readRepository: IProductReadRepository,
  ) {}

  async execute(query: GetProductQuery) {
    const orm = await this.readRepository.findByPublicId(query.productId);
    if (!orm || orm.supplierId !== query.supplierId)
      throw new ProductNotFoundException(query.productId);
    return ProductMapper.toResponse(ProductMapper.toDomain(orm));
  }
}
