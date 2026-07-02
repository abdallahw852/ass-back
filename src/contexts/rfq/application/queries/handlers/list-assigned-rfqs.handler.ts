import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IRfqReadRepository } from '../../../domain/rfq-read.repository.interface';
import { RFQ_READ_REPOSITORY } from '../../../domain/rfq-read.repository.interface';
import { RfqAccessDeniedException } from '../../../domain/rfq.exceptions';
import { ListAssignedRfqsQuery } from '../list-assigned-rfqs.query';

@QueryHandler(ListAssignedRfqsQuery)
export class ListAssignedRfqsHandler implements IQueryHandler<ListAssignedRfqsQuery> {
  constructor(
    @Inject(RFQ_READ_REPOSITORY)
    private readonly rfqReadRepository: IRfqReadRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    query: ListAssignedRfqsQuery,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const supplier = await this.supplierRepository.findByUserId(
      query.supplierId,
    );
    if (!supplier) {
      throw new RfqAccessDeniedException();
    }

    return this.rfqReadRepository.listAssignedRfqs({
      supplierId: supplier.id,
      page: query.filters.page,
      limit: query.filters.limit,
    });
  }
}
