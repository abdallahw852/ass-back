import { DomainEvent } from '../../../../shared/domain/domain-event';

export interface ProductCreatedPayload {
  internalId: number;
  supplierId: number;
  type: string;
  status: string;
  name: string;
  sku: string | null;
  description: string | null;
  mainTitle: string | null;
  promotionalTitle: string | null;
  images: string[];
  categoryId: string | null;
  subcategoryId: string | null;
  costPrice: number;
  shippingPrice: number;
  discountedPrice: number | null;
  discountPercentage: number | null;
  discountEndDate: Date | null;
  stockQuantity: number;
  maxPerCustomer: number;
  trackInventory: boolean;
  requiresShipping: boolean;
  optionGroups: { name: string; values: string[] }[];
  bookingAvailableTime: string | null;
  bookingAvailableDate: Date | null;
  bookingCapacity: number | null;
  digitalFileUrl: string | null;
  digitalFileType: string | null;
  digitalFileSize: string | null;
  bundlePrice: number | null;
  moq: number;
  unitCount: number | null;
  unitType: string | null;
  condition: string;
  currency: string;
  attributes: { key: string; value: string; group?: string }[];
  viewCount: number;
  variants: {
    internalId: number;
    _id: string;
    sku: string | null;
    initialStock: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProductCreatedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    public readonly payload: ProductCreatedPayload,
  ) {
    super(aggregateId, 'Product', 1);
  }

  static create(
    aggregateId: string,
    payload: ProductCreatedPayload,
  ): ProductCreatedEvent {
    return new ProductCreatedEvent(aggregateId, payload);
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
