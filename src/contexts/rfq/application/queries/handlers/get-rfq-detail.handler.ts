import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IRfqReadRepository } from '../../../domain/rfq-read.repository.interface';
import { RFQ_READ_REPOSITORY } from '../../../domain/rfq-read.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  RfqAccessDeniedException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import { RfqStatus, RfqType } from '../../../domain/rfq.types';
import { GetRfqDetailQuery } from '../get-rfq-detail.query';

@QueryHandler(GetRfqDetailQuery)
export class GetRfqDetailHandler implements IQueryHandler<GetRfqDetailQuery> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(RFQ_READ_REPOSITORY)
    private readonly rfqReadRepository: IRfqReadRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(query: GetRfqDetailQuery): Promise<Record<string, unknown>> {
    const rfq = await this.rfqRepository.findByPublicIdWithRelations(
      query.rfqId,
    );
    if (!rfq) {
      throw new RfqNotFoundException(query.rfqId);
    }

    const isAdmin = query.role === 'admin';
    const isSupplier = query.role === 'supplier';

    if (!isAdmin && isSupplier) {
      const supplier = await this.supplierRepository.findByUserId(query.userId);
      if (!supplier) {
        throw new RfqAccessDeniedException();
      }

      const ownQuotation = (rfq.quotations ?? []).find(
        (quotation) => quotation.supplierId === supplier.id,
      );

      if (
        rfq.type === RfqType.PRODUCT_DIRECTED &&
        rfq.targetSupplierId !== supplier.id
      ) {
        throw new RfqAccessDeniedException();
      }

      if (
        rfq.type === RfqType.GENERAL_CUSTOM &&
        rfq.status !== RfqStatus.OPEN &&
        !ownQuotation
      ) {
        throw new RfqAccessDeniedException();
      }
    } else if (!isAdmin) {
      if (rfq.buyerId !== Number(query.userId)) {
        throw new RfqAccessDeniedException();
      }
    }

    const detail = await this.rfqReadRepository.getRfqDetail(query.rfqId);
    if (!detail) {
      throw new RfqNotFoundException(query.rfqId);
    }

    return detail;
  }
}
