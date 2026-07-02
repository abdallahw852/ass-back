import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductVariantsQuery } from '../get-product-variants.query';
import type { IProductReadRepository } from '../../../domain/product-read.repository.interface';
import { PRODUCT_READ_REPOSITORY } from '../../../domain/product-read.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

@QueryHandler(GetProductVariantsQuery)
export class GetProductVariantsHandler implements IQueryHandler<GetProductVariantsQuery> {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly readRepository: IProductReadRepository,
  ) {}

  async execute(query: GetProductVariantsQuery) {
    const orm = await this.readRepository.findByPublicId(query.productId);
    if (!orm || orm.supplierId !== query.supplierId)
      throw new ProductNotFoundException(query.productId);
    return ProductMapper.toDomain(orm).variants.map(
      ProductMapper.variantToResponse,
    );
  }
}
