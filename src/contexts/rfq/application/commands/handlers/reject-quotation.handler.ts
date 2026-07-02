import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { IQuotationRepository } from '../../../domain/quotation.repository.interface';
import { QUOTATION_REPOSITORY } from '../../../domain/quotation.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  InvalidQuotationAcceptanceException,
  QuotationNotFoundException,
  RfqAccessDeniedException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import { QuotationStatus } from '../../../domain/rfq.types';
import { RejectQuotationCommand } from '../reject-quotation.command';

@CommandHandler(RejectQuotationCommand)
export class RejectQuotationHandler implements ICommandHandler<RejectQuotationCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
  ) {}

  async execute(
    command: RejectQuotationCommand,
  ): Promise<Record<string, unknown>> {
    const rfq = await this.rfqRepository.findByPublicId(command.rfqId);
    if (!rfq) {
      throw new RfqNotFoundException(command.rfqId);
    }

    if (rfq.buyerId !== command.buyerId) {
      throw new RfqAccessDeniedException();
    }

    const quotation = await this.quotationRepository.findByPublicId(
      command.quotationId,
    );
    if (!quotation || quotation.rfqId !== rfq.id) {
      throw new QuotationNotFoundException(command.quotationId);
    }

    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new InvalidQuotationAcceptanceException();
    }

    const saved = await this.quotationRepository.update(quotation.id, {
      status: QuotationStatus.REJECTED,
      buyerViewedAt: quotation.buyerViewedAt ?? new Date(),
    });

    return { quotation: saved };
  }
}
