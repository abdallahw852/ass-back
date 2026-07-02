import { randomUUID } from 'node:crypto';

export interface CreateVariantProps {
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  sizeAr?: string | null;
  price: number;
  quantity?: number;
  isActive?: boolean;
}

export interface ReconstitutedVariantProps {
  _id: string;
  internalId: number;
  productId: number;
  sku: string | null;
  color: string | null;
  size: string | null;
  sizeAr: string | null;
  price: number;
  quantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain entity representing a purchasable SKU — a specific
 * colour / size combination within a parent product.
 */
export class ProductVariant {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private _productId: number | null,
    private _sku: string | null,
    private _color: string | null,
    private _size: string | null,
    private _sizeAr: string | null,
    private _price: number,
    private _quantity: number,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  /** Create a new variant (not yet persisted). */
  static create(props: CreateVariantProps): ProductVariant {
    return new ProductVariant(
      randomUUID(),
      null,
      null,
      props.sku ?? null,
      props.color ?? null,
      props.size ?? null,
      props.sizeAr ?? null,
      props.price,
      props.quantity ?? 0,
      props.isActive ?? true,
      new Date(),
      new Date(),
    );
  }

  /** Reconstitute from persistence (trusted data, no validation). */
  static reconstitute(props: ReconstitutedVariantProps): ProductVariant {
    return new ProductVariant(
      props._id,
      props.internalId,
      props.productId,
      props.sku,
      props.color,
      props.size,
      props.sizeAr,
      props.price,
      props.quantity,
      props.isActive,
      props.createdAt,
      props.updatedAt,
    );
  }

  // ── Getters ───────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get internalId(): number | null {
    return this._internalId;
  }
  get productId(): number | null {
    return this._productId;
  }
  get sku(): string | null {
    return this._sku;
  }
  get color(): string | null {
    return this._color;
  }
  get size(): string | null {
    return this._size;
  }
  get sizeAr(): string | null {
    return this._sizeAr;
  }
  get price(): number {
    return this._price;
  }
  get quantity(): number {
    return this._quantity;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ── Behaviour ─────────────────────────────────────────────────

  /** Assign the parent product's internal PK (set by the repository after persist). */
  assignProductId(productId: number): void {
    this._productId = productId;
  }

  /** Check whether this variant matches a given colour/size combination. */
  matchesColorSize(color: string | null, size: string | null): boolean {
    return this._color === color && this._size === size;
  }

  /** Apply a partial update to mutable fields. */
  update(partial: Partial<CreateVariantProps>): void {
    if (partial.sku !== undefined) this._sku = partial.sku ?? null;
    if (partial.color !== undefined) this._color = partial.color ?? null;
    if (partial.size !== undefined) this._size = partial.size ?? null;
    if (partial.sizeAr !== undefined) this._sizeAr = partial.sizeAr ?? null;
    if (partial.price !== undefined) this._price = partial.price;
    if (partial.quantity !== undefined) this._quantity = partial.quantity;
    if (partial.isActive !== undefined) this._isActive = partial.isActive;
    this._updatedAt = new Date();
  }
}
