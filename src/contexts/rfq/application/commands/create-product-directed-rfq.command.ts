import type { CustomFieldInput } from '../../domain/rfq.types';

export class CreateProductDirectedRfqCommand {
  constructor(
    public readonly buyerId: number,
    public readonly productId: string,
    public readonly input: {
      quantity: number;
      quantityUnit?: string;
      message?: string;
      technicalSpecs?: string;
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
