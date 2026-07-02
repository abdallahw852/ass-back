import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IQuotationRepository } from '../../../domain/quotation.repository.interface';
import { QUOTATION_REPOSITORY } from '../../../domain/quotation.repository.interface';
import {
  QuotationAccessDeniedException,
  QuotationAlreadyFinalizedException,
  QuotationNotFoundException,
} from '../../../domain/rfq.exceptions';
import { QuotationStatus } from '../../../domain/rfq.types';
import { CancelQuotationCommand } from '../cancel-quotation.command';

@CommandHandler(CancelQuotationCommand)
export class CancelQuotationHandler implements ICommandHandler<CancelQuotationCommand> {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    command: CancelQuotationCommand,
  ): Promise<Record<string, unknown>> {
    const supplier = await this.supplierRepository.findByUserId(
      command.supplierUserId,
    );
    const quotation = await this.quotationRepository.findByPublicId(
      command.quotationId,
    );

    if (!supplier || !quotation) {
      throw new QuotationNotFoundException(command.quotationId);
    }

    if (quotation.supplierId !== supplier.id) {
      throw new QuotationAccessDeniedException();
    }

    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new QuotationAlreadyFinalizedException();
    }

    const saved = await this.quotationRepository.update(quotation.id, {
      status: QuotationStatus.CANCELLED,
    });

    return { quotation: saved };
  }
}
