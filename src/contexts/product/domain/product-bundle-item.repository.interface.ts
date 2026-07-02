import type { BundleItem } from './product-group.entity';

/**
 * Product bundle item repository contract.
 *
 * Manages persistence for bundle/group products.
 * A bundle product aggregates multiple child products under a single
 * parent, each tracked as a {@link BundleItem}.
 *
 * All methods accept and return domain entities — mapping to/from
 * the ORM layer is the repository implementation's responsibility.
 */
export interface IProductBundleItemRepository {
  /** Retrieve all child items belonging to a bundle (parent) product. */
  findByParentProductId(parentProductId: number): Promise<BundleItem[]>;

  /** Persist a new bundle item linking a child product to a parent bundle. */
  save(bundleItem: BundleItem): Promise<BundleItem>;

  /** Remove a specific child product from a bundle by parent id and child public UUID. */
  removeByParentAndChild(
    parentProductId: number,
    childProductId: string,
  ): Promise<void>;

  /** Hard-delete all bundle items belonging to a parent product. */
  removeByParentProductId(parentProductId: number): Promise<void>;
}

/** DI token for the product bundle item repository. */
export const PRODUCT_BUNDLE_ITEM_REPOSITORY = Symbol(
  'PRODUCT_BUNDLE_ITEM_REPOSITORY',
);
