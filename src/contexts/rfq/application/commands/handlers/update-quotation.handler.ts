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
  SupplierNotFoundException,
} from '../../../domain/rfq.exceptions';
import { QuotationStatus } from '../../../domain/rfq.types';
import { UpdateQuotationCommand } from '../update-quotation.command';

@CommandHandler(UpdateQuotationCommand)
export class UpdateQuotationHandler implements ICommandHandler<UpdateQuotationCommand> {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    command: UpdateQuotationCommand,
  ): Promise<Record<string, unknown>> {
    const supplier = await this.supplierRepository.findByUserId(
      command.supplierUserId,
    );
    const quotation =
      await this.quotationRepository.findByPublicIdWithRelations(
        command.quotationId,
      );

    if (!quotation) {
      throw new QuotationNotFoundException(command.quotationId);
    }

    if (!supplier) {
      throw new SupplierNotFoundException();
    }

    if (quotation.supplierId !== supplier.id) {
      throw new QuotationAccessDeniedException();
    }

    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new QuotationAlreadyFinalizedException();
    }

    const saved = await this.quotationRepository.update(quotation.id, {
      productName: command.input.productName ?? quotation.productName,
      quantity: command.input.quantity ?? quotation.quantity,
      weightKg:
        command.input.weightKg === undefined
          ? quotation.weightKg
          : command.input.weightKg,
      lengthCm:
        command.input.lengthCm === undefined
          ? quotation.lengthCm
          : command.input.lengthCm,
      widthCm:
        command.input.widthCm === undefined
          ? quotation.widthCm
          : command.input.widthCm,
      heightCm:
        command.input.heightCm === undefined
          ? quotation.heightCm
          : command.input.heightCm,
      unitPrice: command.input.unitPrice ?? quotation.unitPrice,
      currency: command.input.currency ?? quotation.currency,
      totalPrice: command.input.totalPrice ?? quotation.totalPrice,
      deliveryTimeDays:
        command.input.deliveryTimeDays ?? quotation.deliveryTimeDays,
      paymentTerms: command.input.paymentTerms ?? quotation.paymentTerms,
      validUntil: command.input.validUntil
        ? new Date(command.input.validUntil)
        : quotation.validUntil,
      shippingDetails:
        command.input.shippingDetails === undefined
          ? quotation.shippingDetails
          : command.input.shippingDetails,
      additionalNotes:
        command.input.additionalNotes === undefined
          ? quotation.additionalNotes
          : command.input.additionalNotes,
      customizations:
        command.input.customizations === undefined
          ? quotation.customizations
          : command.input.customizations.map((customization) => ({
              name: customization.name,
              value: customization.value,
            })),
    });

    return { quotation: saved };
  }
}
