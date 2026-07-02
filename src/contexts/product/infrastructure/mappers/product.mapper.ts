import { Product } from '../../domain/product.entity';
import { ProductVariant } from '../../domain/product-variant.entity';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import { ProductVariantMapper } from './product-variant.mapper';
import { BundleItemMapper } from './bundle-item.mapper';

/**
 * Maps between the {@link Product} aggregate root and the
 * {@link ProductOrmEntity} persistence representation.
 *
 * Child collections (variants, bundle items) are mapped via their
 * own dedicated mappers.
 */
export class ProductMapper {
  /**
   * Reconstitute the full aggregate from an ORM entity.
   *
   * Expects `variants` and `bundleItems` relations to be loaded
   * on the ORM entity; if absent they default to empty arrays.
   */
  static toDomain(orm: ProductOrmEntity): Product {
    const variants = (orm.variants ?? []).map((v) =>
      ProductVariantMapper.toDomain(v),
    );
    const bundleItems = (orm.bundleItems ?? []).map((b) =>
      BundleItemMapper.toDomain(b),
    );

    return Product.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      supplierId: orm.supplierId,
      type: orm.type,
      status: orm.status,
      name: orm.name,
      nameAr: orm.nameAr ?? null,
      sku: orm.sku ?? null,
      description: orm.description,
      descriptionAr: orm.descriptionAr ?? null,
      mainTitle: orm.mainTitle,
      mainTitleAr: orm.mainTitleAr ?? null,
      promotionalTitle: orm.promotionalTitle,
      promotionalTitleAr: orm.promotionalTitleAr ?? null,
      images: orm.images ?? [],
      categoryId: orm.categoryId,
      subcategoryId: orm.subcategoryId,
      costPrice: Number(orm.costPrice),
      shippingPrice: Number(orm.shippingPrice ?? 0),
      usePlatformShipping: orm.usePlatformShipping ?? false,
      weightKg: orm.weightKg !== null ? Number(orm.weightKg) : null,
      discountedPrice:
        orm.discountedPrice !== null ? Number(orm.discountedPrice) : null,
      discountPercentage: orm.discountPercentage,
      discountEndDate: orm.discountEndDate,
      stockQuantity: orm.stockQuantity,
      maxPerCustomer: orm.maxPerCustomer,
      trackInventory: orm.trackInventory,
      requiresShipping: orm.requiresShipping,
      optionGroups: orm.optionGroups ?? [],
      bookingAvailableTime: orm.bookingAvailableTime,
      bookingAvailableDate: orm.bookingAvailableDate,
      bookingCapacity: orm.bookingCapacity,
      digitalFileUrl: orm.digitalFileUrl,
      digitalFileType: orm.digitalFileType,
      digitalFileSize: orm.digitalFileSize,
      bundlePrice: orm.bundlePrice !== null ? Number(orm.bundlePrice) : null,
      moq: orm.moq ?? 1,
      unitCount: orm.unitCount ?? null,
      unitType: orm.unitType ?? null,
      unitTypeAr: orm.unitTypeAr ?? null,
      condition: orm.condition,
      currency: orm.currency ?? 'SAR',
      attributes: orm.attributes ?? [],
      viewCount: orm.viewCount ?? 0,
      variants,
      bundleItems,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      rejectionReason: orm.rejectionReason ?? null,
      reviewedAt: orm.reviewedAt ?? null,
      reviewedById: orm.reviewedById ?? null,
    });
  }

  /** Map a single variant domain entity to a clean response POJO. */
  static variantToResponse(
    this: void,
    v: ProductVariant,
  ): Record<string, unknown> {
    const variant: Record<string, unknown> = {
      _id: v.id,
      price: v.price,
      quantity: v.quantity,
      isActive: v.isActive,
    };
    if (v.sku !== null) variant.sku = v.sku;
    if (v.color !== null) variant.color = v.color;
    if (v.size !== null) variant.size = v.size;
    if (v.sizeAr !== null) variant.sizeAr = v.sizeAr;
    return variant;
  }

  /**
   * Map the aggregate root to a clean plain object safe for API responses.
   *
   * - Uses public getters only (no `_`-prefixed private fields)
   * - Omits internal PKs (`internalId`, `supplierId`)
   * - Omits null-valued optional fields
   * - Maps `type` value object to its string value
   */
  static toResponse(domain: Product): Record<string, unknown> {
    const base: Record<string, unknown> = {
      _id: domain.id,
      type: domain.type.value,
      status: domain.status,
      rejectionReason: domain.rejectionReason,
      reviewedAt: domain.reviewedAt,
      reviewedById: domain.reviewedById,
      name: domain.name,
      sku: domain.sku,
      images: domain.images,
      costPrice: domain.costPrice,
      shippingPrice: domain.shippingPrice,
      usePlatformShipping: domain.usePlatformShipping,
      weightKg: domain.weightKg,
      moq: domain.moq,
      condition: domain.condition,
      currency: domain.currency,
      stockQuantity: domain.stockQuantity,
      maxPerCustomer: domain.maxPerCustomer,
      trackInventory: domain.trackInventory,
      requiresShipping: domain.requiresShipping,
      optionGroups: domain.optionGroups,
      attributes: domain.attributes,
      viewCount: domain.viewCount,
      variants: domain.variants.map(ProductMapper.variantToResponse),
      bundleItems: domain.bundleItems.map((b) => ({
        _id: b.id,
        childProductId: b.childProductId,
      })),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };

    const nullable: Record<string, unknown> = {
      nameAr: domain.nameAr,
      description: domain.description,
      descriptionAr: domain.descriptionAr,
      mainTitle: domain.mainTitle,
      mainTitleAr: domain.mainTitleAr,
      promotionalTitle: domain.promotionalTitle,
      promotionalTitleAr: domain.promotionalTitleAr,
      categoryId: domain.categoryId,
      subcategoryId: domain.subcategoryId,
      discountedPrice: domain.discountedPrice,
      discountPercentage: domain.discountPercentage,
      discountEndDate: domain.discountEndDate,
      bookingAvailableTime: domain.bookingAvailableTime,
      bookingAvailableDate: domain.bookingAvailableDate,
      bookingCapacity: domain.bookingCapacity,
      digitalFileUrl: domain.digitalFileUrl,
      digitalFileType: domain.digitalFileType,
      digitalFileSize: domain.digitalFileSize,
      bundlePrice: domain.bundlePrice,
      unitCount: domain.unitCount,
      unitType: domain.unitType,
      unitTypeAr: domain.unitTypeAr,
    };
    for (const [k, v] of Object.entries(nullable)) {
      if (v !== null) base[k] = v;
    }

    return base;
  }

  /**
   * Map the aggregate root to an ORM entity for persistence.
   *
   * When the product already has an `internalId` (loaded from DB),
   * the `id` column is set so TypeORM performs an UPDATE. Child
   * collections are mapped via their own mappers and assigned to
   * the ORM entity's relation arrays.
   */
  static toOrm(domain: Product): ProductOrmEntity {
    const orm = new ProductOrmEntity();
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm._id = domain.id;
    orm.supplierId = domain.supplierId;
    orm.type = domain.type.value;
    orm.status = domain.status;
    orm.rejectionReason = domain.rejectionReason;
    orm.reviewedAt = domain.reviewedAt;
    orm.reviewedById = domain.reviewedById;
    orm.name = domain.name;
    orm.nameAr = domain.nameAr;
    orm.sku = domain.sku;
    orm.description = domain.description;
    orm.descriptionAr = domain.descriptionAr;
    orm.mainTitle = domain.mainTitle;
    orm.mainTitleAr = domain.mainTitleAr;
    orm.promotionalTitle = domain.promotionalTitle;
    orm.promotionalTitleAr = domain.promotionalTitleAr;
    orm.images = domain.images;
    orm.categoryId = domain.categoryId;
    orm.subcategoryId = domain.subcategoryId;
    orm.costPrice = domain.costPrice;
    orm.shippingPrice = domain.shippingPrice;
    orm.usePlatformShipping = domain.usePlatformShipping;
    orm.weightKg = domain.weightKg;
    orm.discountedPrice = domain.discountedPrice;
    orm.discountPercentage = domain.discountPercentage;
    orm.discountEndDate = domain.discountEndDate;
    orm.stockQuantity = domain.stockQuantity;
    orm.maxPerCustomer = domain.maxPerCustomer;
    orm.trackInventory = domain.trackInventory;
    orm.requiresShipping = domain.requiresShipping;
    orm.optionGroups = domain.optionGroups;
    orm.bookingAvailableTime = domain.bookingAvailableTime;
    orm.bookingAvailableDate = domain.bookingAvailableDate;
    orm.bookingCapacity = domain.bookingCapacity;
    orm.digitalFileUrl = domain.digitalFileUrl;
    orm.digitalFileType = domain.digitalFileType;
    orm.digitalFileSize = domain.digitalFileSize;
    orm.bundlePrice = domain.bundlePrice;
    orm.moq = domain.moq;
    orm.unitCount = domain.unitCount;
    orm.unitType = domain.unitType;
    orm.unitTypeAr = domain.unitTypeAr;
    orm.condition = domain.condition;
    orm.currency = domain.currency;
    orm.attributes = domain.attributes;
    orm.viewCount = domain.viewCount;
    orm.variants = domain.variants.map((v) => ProductVariantMapper.toOrm(v));
    orm.bundleItems = domain.bundleItems.map((b) => BundleItemMapper.toOrm(b));
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
