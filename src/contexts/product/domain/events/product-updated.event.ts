import { DomainEvent } from '../../../../shared/domain/domain-event';

export interface ProductUpdatedPayload {
  internalId: number;
  supplierId: number;
  removedVariantInternalIds: number[];
  type: string;
  status: string;
  name: string;
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
    color: string | null;
    size: string | null;
    price: number;
    quantity: number;
    isActive: boolean;
  }[];
  bundleItems: {
    _id: string;
    childProductId: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProductUpdatedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    public readonly payload: ProductUpdatedPayload,
  ) {
    super(aggregateId, 'Product', 1);
  }

  static create(
    aggregateId: string,
    payload: ProductUpdatedPayload,
  ): ProductUpdatedEvent {
    return new ProductUpdatedEvent(aggregateId, payload);
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
