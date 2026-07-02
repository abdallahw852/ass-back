import type { Product } from './product.entity';

/**
 * Product repository contract.
 *
 * Defines persistence operations for the Product aggregate root.
 * Implementations live in the infrastructure layer and are injected
 * via the {@link PRODUCT_REPOSITORY} symbol token.
 *
 * All methods accept and return domain entities — mapping to/from
 * the ORM layer is the repository implementation's responsibility.
 */
export interface IProductRepository {
  /** Find a product by its public UUID (_id). */
  findByPublicId(publicId: string): Promise<Product | null>;

  /** Find a product by its public UUID with eager-loaded variants and bundle items. */
  findByPublicIdWithRelations(publicId: string): Promise<Product | null>;

  /** Find a product by its internal auto-increment PK with eager-loaded relations. */
  findByInternalIdWithRelations(internalId: number): Promise<Product | null>;

  /** Persist a new product aggregate (including child variants and bundle items). */
  save(product: Product): Promise<Product>;

  /** Persist changes to an existing product aggregate. */
  update(product: Product): Promise<Product>;

  /** Soft-delete a product by its internal id (sets deletedAt). */
  remove(internalId: number): Promise<void>;

  /** Count non-archived products for a supplier (for quota enforcement). */
  countActiveBySupplierId(supplierId: number): Promise<number>;
}

/** DI token for the product repository. */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
