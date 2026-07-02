import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { IQuotationRepository } from '../../../domain/quotation.repository.interface';
import { QUOTATION_REPOSITORY } from '../../../domain/quotation.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import type { ISubscriptionRepository } from '../../../../supplier/subscription/domain/subscription.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../../supplier/subscription/domain/subscription.repository.interface';
import {
  InvalidDirectedRfqSupplierException,
  RfqClosedException,
  RfqNotFoundException,
  SupplierNotFoundException,
} from '../../../domain/rfq.exceptions';
import { QuotationStatus, RfqStatus, RfqType } from '../../../domain/rfq.types';
import { SubmitQuotationCommand } from '../submit-quotation.command';
import { QuotaService } from '../../../../entitlement/infrastructure/quota.service';
import { ENTITLEMENT_SERVICE } from '../../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../../entitlement/domain/entitlement.service.interface';

@CommandHandler(SubmitQuotationCommand)
export class SubmitQuotationHandler implements ICommandHandler<SubmitQuotationCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: IQuotationRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly quotaService: QuotaService,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(
    command: SubmitQuotationCommand,
  ): Promise<Record<string, unknown>> {
    const supplier = await this.supplierRepository.findByUserId(
      command.supplierUserId,
    );
    const rfq = await this.rfqRepository.findByPublicIdWithRelations(
      command.rfqId,
    );

    if (!rfq) {
      throw new RfqNotFoundException(command.rfqId);
    }

    if (!supplier) {
      throw new SupplierNotFoundException();
    }

    // Enforce max_rfq_responses quota
    const rfqLimit = await this.entitlementService.getLimit(
      supplier.id,
      'max_rfq_responses',
    );
    const now = new Date();
    const subscription = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    let periodStart: Date;
    let periodEnd: Date;
    if (subscription && subscription.status === 'active') {
      periodStart = subscription.currentPeriodStart;
      periodEnd = subscription.currentPeriodEnd;
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }
    const rfqCount =
      await this.quotationRepository.countSupplierQuotationsInPeriod(
        supplier.id,
        periodStart,
        periodEnd,
      );
    this.quotaService.assertWithinQuota(
      supplier.id,
      'max_rfq_responses',
      rfqCount,
      rfqLimit,
    );

    if (rfq.status !== RfqStatus.OPEN && rfq.status !== RfqStatus.AWARDED) {
      throw new RfqClosedException();
    }

    if (
      rfq.type === RfqType.PRODUCT_DIRECTED &&
      rfq.targetSupplierId !== supplier.id
    ) {
      throw new InvalidDirectedRfqSupplierException();
    }

    const existing = await this.quotationRepository.findByRfqAndSupplier(
      rfq.id,
      supplier.id,
    );

    if (existing) {
      if (existing.status === QuotationStatus.ACCEPTED) {
        await this.rfqRepository.update(rfq.id, { status: RfqStatus.OPEN });
      }
      await this.quotationRepository.update(existing.id, {
        status: QuotationStatus.CANCELLED,
      });
    }

    const saved = await this.quotationRepository.save({
      rfqId: rfq.id,
      supplierId: supplier.id,
      status: QuotationStatus.SUBMITTED,
      productName: command.input.productName ?? rfq.productName,
      quantity: command.input.quantity,
      weightKg: command.input.weightKg ?? null,
      lengthCm: command.input.lengthCm ?? null,
      widthCm: command.input.widthCm ?? null,
      heightCm: command.input.heightCm ?? null,
      unitPrice: command.input.totalPrice / command.input.quantity,
      currency: command.input.currency ?? 'SAR',
      totalPrice: command.input.totalPrice,
      deliveryTimeDays: command.input.deliveryTimeDays,
      paymentTerms: null,
      validUntil: new Date(command.input.validUntil),
      shippingDetails: command.input.shippingDetails ?? null,
      additionalNotes: command.input.additionalNotes ?? null,
      customizations: (command.input.customizations ?? []).map((c) => ({
        name: c.name,
        value: c.value,
      })),
    });

    return { quotation: saved };
  }
}
