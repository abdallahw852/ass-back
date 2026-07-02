import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoryOrmEntity } from '../../../../category/infrastructure/persistence/category.orm-entity';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IRfqReadRepository } from '../../../domain/rfq-read.repository.interface';
import { RFQ_READ_REPOSITORY } from '../../../domain/rfq-read.repository.interface';
import { RfqAccessDeniedException } from '../../../domain/rfq.exceptions';
import { ListMarketRfqsQuery } from '../list-market-rfqs.query';

@QueryHandler(ListMarketRfqsQuery)
export class ListMarketRfqsHandler implements IQueryHandler<ListMarketRfqsQuery> {
  constructor(
    @Inject(RFQ_READ_REPOSITORY)
    private readonly rfqReadRepository: IRfqReadRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @InjectRepository(CategoryOrmEntity, 'write')
    private readonly categoryRepository: Repository<CategoryOrmEntity>,
  ) {}

  async execute(
    query: ListMarketRfqsQuery,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const supplier = await this.supplierRepository.findByUserId(
      query.supplierId,
    );
    if (!supplier) {
      throw new RfqAccessDeniedException();
    }

    const category = query.filters.categoryId
      ? await this.categoryRepository.findOne({
          where: { _id: query.filters.categoryId },
        })
      : null;

    if (query.filters.categoryId && !category) {
      return { items: [], total: 0 };
    }

    return this.rfqReadRepository.listMarketRfqs({
      supplierId: supplier.id,
      search: query.filters.search,
      categoryId: category?.id,
      country: query.filters.country,
      page: query.filters.page,
      limit: query.filters.limit,
    });
  }
}
