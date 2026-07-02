import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CreateOrderDraftFromQuotationCommand } from '../../../../order/application/commands/create-order-draft-from-quotation.command';
import type { OrderDraftOrmEntity } from '../../../../order/infrastructure/persistence/order-draft.orm-entity';
import type { IQuotationRepository } from '../../../domain/quotation.repository.interface';
import { QUOTATION_REPOSITORY } from '../../../domain/quotation.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  InvalidQuotationAcceptanceException,
  QuotationNotFoundException,
  RfqAccessDeniedException,
  RfqAlreadyAwardedException,
  RfqClosedException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import { QuotationStatus, RfqStatus } from '../../../domain/rfq.types';
import { AcceptQuotationCommand } from '../accept-quotation.command';

// Note: RFQ status updates and order draft creation are no longer atomic — acceptable per architecture decision.

@CommandHandler(AcceptQuotationCommand)
export class AcceptQuotationHandler implements ICommandHandler<AcceptQuotationCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: AcceptQuotationCommand,
  ): Promise<Record<string, unknown>> {
    const rfq = await this.rfqRepository.findByPublicIdWithRelations(
      command.rfqId,
    );
    if (!rfq) {
      throw new RfqNotFoundException(command.rfqId);
    }

    if (rfq.buyerId !== command.buyerId) {
      throw new RfqAccessDeniedException();
    }

    if (rfq.status === RfqStatus.AWARDED) {
      throw new RfqAlreadyAwardedException();
    }

    if (rfq.status !== RfqStatus.OPEN) {
      throw new RfqClosedException();
    }

    const quotation =
      await this.quotationRepository.findByPublicIdWithRelations(
        command.quotationId,
      );
    if (!quotation || quotation.rfqId !== rfq.id) {
      throw new QuotationNotFoundException(command.quotationId);
    }

    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new InvalidQuotationAcceptanceException();
    }

    const now = new Date();

    await this.quotationRepository.update(quotation.id, {
      status: QuotationStatus.ACCEPTED,
      buyerViewedAt: now,
    });

    await this.quotationRepository.rejectOtherSubmitted(rfq.id, quotation.id);

    await this.rfqRepository.update(rfq.id, {
      status: RfqStatus.AWARDED,
      awardedQuotationId: quotation.id,
      buyerViewedAt: now,
    });

    const orderDraft = await this.commandBus.execute<
      CreateOrderDraftFromQuotationCommand,
      OrderDraftOrmEntity
    >(
      new CreateOrderDraftFromQuotationCommand(
        rfq.buyerId,
        quotation.supplierId,
        rfq._id,
        quotation._id,
        quotation.productName,
        Number(quotation.quantity),
        Number(quotation.unitPrice),
        Number(quotation.totalPrice),
        quotation.currency,
        [
          {
            rfqId: rfq._id,
            quotationId: quotation._id,
            productName: quotation.productName,
            quantity: Number(quotation.quantity),
            unitPrice: Number(quotation.unitPrice),
            totalPrice: Number(quotation.totalPrice),
          },
        ],
        {
          rfq: {
            id: rfq._id,
            referenceNumber: rfq.referenceNumber,
            type: rfq.type,
            productName: rfq.productName,
            quantity: Number(rfq.quantity),
            quantityUnit: rfq.quantityUnit,
            message: rfq.message,
            technicalSpecs: rfq.technicalSpecs,
            sampleReadiness: rfq.sampleReadiness,
            requestedDeliveryDate: rfq.requestedDeliveryDate,
            customizations: (rfq.customizations ?? []).map((customization) => ({
              name: customization.name,
              value: customization.value,
            })),
          },
          quotation: {
            id: quotation._id,
            supplierId: quotation.supplier?._id ?? null,
            supplierName: quotation.supplier?.companyName ?? null,
            productName: quotation.productName,
            quantity: Number(quotation.quantity),
            weightKg:
              quotation.weightKg === null ? null : Number(quotation.weightKg),
            lengthCm:
              quotation.lengthCm === null ? null : Number(quotation.lengthCm),
            widthCm:
              quotation.widthCm === null ? null : Number(quotation.widthCm),
            heightCm:
              quotation.heightCm === null ? null : Number(quotation.heightCm),
            unitPrice: Number(quotation.unitPrice),
            totalPrice: Number(quotation.totalPrice),
            currency: quotation.currency,
            deliveryTimeDays: quotation.deliveryTimeDays,
            paymentTerms: quotation.paymentTerms,
            validUntil: quotation.validUntil,
            shippingDetails: quotation.shippingDetails,
            additionalNotes: quotation.additionalNotes,
            customizations: (quotation.customizations ?? []).map(
              (customization) => ({
                name: customization.name,
                value: customization.value,
              }),
            ),
          },
        },
      ),
    );

    const updatedRfq = await this.rfqRepository.findByPublicIdWithRelations(
      rfq._id,
    );
    const updatedQuotation =
      await this.quotationRepository.findByPublicIdWithRelations(quotation._id);

    return {
      rfq: updatedRfq,
      quotation: updatedQuotation,
      order: orderDraft,
    };
  }
}
