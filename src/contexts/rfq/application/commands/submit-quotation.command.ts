import type { CustomFieldInput } from '../../domain/rfq.types';

export type SubmitQuotationCommandInput = {
  productName?: string;
  quantity: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  currency?: string;
  totalPrice: number;
  deliveryTimeDays: string;
  validUntil: string;
  shippingDetails?: string;
  additionalNotes?: string;
  customizations?: CustomFieldInput[];
};

export class SubmitQuotationCommand {
  constructor(
    public readonly rfqId: string,
    public readonly supplierUserId: number,
    public readonly input: SubmitQuotationCommandInput,
  ) {}
}

export const createSubmitQuotationCommand = (
  rfqId: string,
  supplierUserId: number,
  input: SubmitQuotationCommandInput,
): SubmitQuotationCommand =>
  new SubmitQuotationCommand(rfqId, supplierUserId, input);
