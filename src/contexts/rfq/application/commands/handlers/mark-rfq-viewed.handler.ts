import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IQuotationRepository } from '../../../domain/quotation.repository.interface';
import { QUOTATION_REPOSITORY } from '../../../domain/quotation.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import { MarkRfqViewedCommand } from '../mark-rfq-viewed.command';

@CommandHandler(MarkRfqViewedCommand)
export class MarkRfqViewedHandler implements ICommandHandler<MarkRfqViewedCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(command: MarkRfqViewedCommand): Promise<void> {
    const rfq = await this.rfqRepository.findByPublicIdWithRelations(
      command.rfqPublicId,
    );
    if (!rfq) return;

    const now = new Date();

    if (command.viewerRole === 'supplier') {
      const supplier = await this.supplierRepository.findByUserId(
        command.viewerUserId,
      );
      if (!supplier) return;

      if (!rfq.supplierViewedAt) {
        await this.rfqRepository.update(rfq.id, { supplierViewedAt: now });
      }

      const ownQuotation = (rfq.quotations ?? []).find(
        (q) => q.supplierId === supplier.id,
      );

      if (ownQuotation && !ownQuotation.supplierViewedAt) {
        await this.quotationRepository.update(ownQuotation.id, {
          supplierViewedAt: now,
        });
      }
    } else {
      // buyer
      await this.rfqRepository.update(rfq.id, { buyerViewedAt: now });

      for (const quotation of rfq.quotations ?? []) {
        if (!quotation.buyerViewedAt) {
          await this.quotationRepository.update(quotation.id, {
            buyerViewedAt: now,
          });
        }
      }
    }
  }
}
