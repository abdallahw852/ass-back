import { randomUUID } from 'node:crypto';

export interface ReconstitutedBundleItemProps {
  _id: string;
  internalId: number;
  parentProductId: number;
  childProductId: string;
  createdAt: Date;
}

/**
 * Domain entity representing a child product linked to a parent bundle.
 *
 * Despite the file name (`product-group.entity.ts`), this models the
 * `product_bundle_items` concept — a link between a parent bundle
 * product and one of its child products.
 */
export class BundleItem {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private _parentProductId: number | null,
    private readonly _childProductId: string,
    private readonly _createdAt: Date,
  ) {}

  /** Create a new bundle item (not yet persisted). */
  static create(childProductId: string): BundleItem {
    return new BundleItem(randomUUID(), null, null, childProductId, new Date());
  }

  /** Reconstitute from persistence. */
  static reconstitute(props: ReconstitutedBundleItemProps): BundleItem {
    return new BundleItem(
      props._id,
      props.internalId,
      props.parentProductId,
      props.childProductId,
      props.createdAt,
    );
  }

  // ── Getters ───────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get internalId(): number | null {
    return this._internalId;
  }
  get parentProductId(): number | null {
    return this._parentProductId;
  }
  get childProductId(): string {
    return this._childProductId;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  /** Assign the parent product's internal PK. */
  assignParentProductId(parentProductId: number): void {
    this._parentProductId = parentProductId;
  }
}
