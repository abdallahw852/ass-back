import type { CustomFieldInput } from '../../domain/rfq.types';

export class CreateGeneralCustomRfqCommand {
  constructor(
    public readonly buyerId: number,
    public readonly input: {
      productName: string;
      categoryId?: string;
      quantity: number;
      quantityUnit?: string;
      message?: string;
      technicalSpecs?: string;
      sampleReadiness?: string;
      requestedDeliveryDate?: string;
      customizations?: CustomFieldInput[];
      attachments?: {
        url: string;
        originalName: string;
        mimeType: string;
        size: number;
      }[];
    },
  ) {}
}
