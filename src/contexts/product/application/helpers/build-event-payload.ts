import type { Product } from '../../domain/product.entity';
import type { ProductCreatedPayload } from '../../domain/events/product-created.event';
import type { ProductUpdatedPayload } from '../../domain/events/product-updated.event';

/**
 * Build a {@link ProductCreatedPayload} from a domain aggregate.
 *
 * Called after the aggregate (including any inline variants) has been
 * persisted, so {@link Product.variants} is already populated.
 */
export function buildCreatedPayload(product: Product): ProductCreatedPayload {
  return {
    internalId: product.internalId!,
    supplierId: product.supplierId,
    sku: product.sku,
    type: product.type.value,
    status: product.status,
    name: product.name,
    description: product.description,
    mainTitle: product.mainTitle,
    promotionalTitle: product.promotionalTitle,
    images: product.images,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    costPrice: product.costPrice,
    shippingPrice: product.shippingPrice,
    discountedPrice: product.discountedPrice,
    discountPercentage: product.discountPercentage,
    discountEndDate: product.discountEndDate,
    stockQuantity: product.stockQuantity,
    maxPerCustomer: product.maxPerCustomer,
    trackInventory: product.trackInventory,
    requiresShipping: product.requiresShipping,
    optionGroups: product.optionGroups,
    bookingAvailableTime: product.bookingAvailableTime,
    bookingAvailableDate: product.bookingAvailableDate,
    bookingCapacity: product.bookingCapacity,
    digitalFileUrl: product.digitalFileUrl,
    digitalFileType: product.digitalFileType,
    digitalFileSize: product.digitalFileSize,
    bundlePrice: product.bundlePrice,
    moq: product.moq,
    unitCount: product.unitCount,
    unitType: product.unitType,
    condition: product.condition,
    currency: product.currency,
    attributes: product.attributes,
    viewCount: product.viewCount,
    variants: product.variants.map((v) => ({
      internalId: v.internalId!,
      _id: v.id,
      sku: v.sku,
      initialStock: v.quantity ?? 0,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Build a {@link ProductUpdatedPayload} from a domain aggregate
 * (including its child variants and bundle items).
 *
 * Used after any mutation that changes the product or its children.
 */
export function buildUpdatedPayload(
  product: Product,
  removedVariantInternalIds: number[] = [],
): ProductUpdatedPayload {
  return {
    internalId: product.internalId!,
    supplierId: product.supplierId,
    removedVariantInternalIds,
    type: product.type.value,
    status: product.status,
    name: product.name,
    description: product.description,
    mainTitle: product.mainTitle,
    promotionalTitle: product.promotionalTitle,
    images: product.images,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    costPrice: product.costPrice,
    shippingPrice: product.shippingPrice,
    discountedPrice: product.discountedPrice,
    discountPercentage: product.discountPercentage,
    discountEndDate: product.discountEndDate,
    stockQuantity: product.stockQuantity,
    maxPerCustomer: product.maxPerCustomer,
    trackInventory: product.trackInventory,
    requiresShipping: product.requiresShipping,
    optionGroups: product.optionGroups,
    bookingAvailableTime: product.bookingAvailableTime,
    bookingAvailableDate: product.bookingAvailableDate,
    bookingCapacity: product.bookingCapacity,
    digitalFileUrl: product.digitalFileUrl,
    digitalFileType: product.digitalFileType,
    digitalFileSize: product.digitalFileSize,
    bundlePrice: product.bundlePrice,
    moq: product.moq,
    unitCount: product.unitCount,
    unitType: product.unitType,
    condition: product.condition,
    currency: product.currency,
    attributes: product.attributes,
    viewCount: product.viewCount,
    variants: product.variants.map((v) => ({
      internalId: v.internalId!,
      _id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      price: v.price,
      quantity: v.quantity,
      isActive: v.isActive,
    })),
    bundleItems: product.bundleItems.map((b) => ({
      _id: b.id,
      childProductId: b.childProductId,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
