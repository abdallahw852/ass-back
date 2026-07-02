import type { ProductVariant } from './product-variant.entity';

/**
 * Product variant repository contract.
 *
 * Manages persistence for product variants (colour/size combinations).
 * Each variant represents a purchasable SKU within a parent product.
 *
 * All methods accept and return domain entities — mapping to/from
 * the ORM layer is the repository implementation's responsibility.
 */
export interface IProductVariantRepository {
  /** Find a variant by its public UUID (_id). */
  findByPublicId(publicId: string): Promise<ProductVariant | null>;

  /** Retrieve all variants belonging to a given product. */
  findByProductId(productId: number): Promise<ProductVariant[]>;

  /** Persist a new variant entity. */
  save(variant: ProductVariant): Promise<ProductVariant>;

  /** Soft-delete a variant by its internal id (sets deletedAt, preserves FK history). */
  remove(internalId: number): Promise<void>;
}

/** DI token for the product variant repository. */
export const PRODUCT_VARIANT_REPOSITORY = Symbol('PRODUCT_VARIANT_REPOSITORY');
