import type { CustomFieldInput } from '../../domain/rfq.types';

export class UpdateQuotationCommand {
  constructor(
    public readonly quotationId: string,
    public readonly supplierUserId: number,
    public readonly input: {
      productName?: string;
      quantity?: number;
      weightKg?: number;
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
      unitPrice?: number;
      currency?: string;
      totalPrice?: number;
      deliveryTimeDays?: string;
      paymentTerms?: string;
      validUntil?: string;
      shippingDetails?: string;
      additionalNotes?: string;
      customizations?: CustomFieldInput[];
    },
  ) {}
}
