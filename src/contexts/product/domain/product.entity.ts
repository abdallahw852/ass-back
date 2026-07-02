import { randomUUID } from 'node:crypto';
import { ProductTypeVO } from './product-type.value-object';
import { ProductVariant, CreateVariantProps } from './product-variant.entity';
import { BundleItem } from './product-group.entity';
import { ProductStatus } from './enums/product-status.enum';
import { ProductCondition } from './enums/product-condition.enum';
import {
  ProductNotFoundException,
  DuplicateVariantException,
  BundleItemSelfReferenceException,
  DuplicateBundleItemException,
  MaxImagesExceededException,
  InvalidProductStatusTransitionException,
} from './product.exceptions';

// ── Constants ──────────────────────────────────────────────────

/** Maximum number of images a product can have. */
const MAX_IMAGES = 8;

// ── Interfaces ─────────────────────────────────────────────────

/**
 * Properties required to create a brand-new product.
 * Only the truly mandatory fields are non-optional; everything
 * else falls back to sensible defaults inside `Product.create()`.
 */
export interface CreateProductProps {
  supplierId: number;
  type: string;
  name: string;
  nameAr?: string | null;
  sku?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  mainTitle?: string | null;
  mainTitleAr?: string | null;
  promotionalTitle?: string | null;
  promotionalTitleAr?: string | null;
  images?: string[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  costPrice?: number;
  shippingPrice?: number;
  usePlatformShipping?: boolean;
  weightKg?: number;
  discountedPrice?: number | null;
  discountPercentage?: number | null;
  discountEndDate?: Date | null;
  stockQuantity?: number;
  maxPerCustomer?: number;
  trackInventory?: boolean;
  requiresShipping?: boolean;
  optionGroups?: { name: string; values: string[] }[];
  bookingAvailableTime?: string | null;
  bookingAvailableDate?: Date | null;
  bookingCapacity?: number | null;
  digitalFileUrl?: string | null;
  digitalFileType?: string | null;
  digitalFileSize?: string | null;
  bundlePrice?: number | null;
  moq?: number;
  unitCount?: number | null;
  unitType?: string | null;
  unitTypeAr?: string | null;
  condition?: ProductCondition;
  currency?: string;
  attributes?: { key: string; value: string; group?: string }[];
  status?: string;
}

/**
 * Full property bag used by `Product.reconstitute()` to rebuild
 * an aggregate from persistence. Every field is required because
 * all values must already exist in the database row.
 */
export interface ReconstitutedProductProps {
  _id: string;
  internalId: number;
  supplierId: number;
  type: string;
  status: string;
  name: string;
  nameAr: string | null;
  sku: string | null;
  description: string | null;
  descriptionAr: string | null;
  mainTitle: string | null;
  mainTitleAr: string | null;
  promotionalTitle: string | null;
  promotionalTitleAr: string | null;
  images: string[];
  categoryId: string | null;
  subcategoryId: string | null;
  costPrice: number;
  shippingPrice: number;
  usePlatformShipping: boolean;
  weightKg: number | null;
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
  unitTypeAr: string | null;
  condition: ProductCondition;
  currency: string;
  attributes: { key: string; value: string; group?: string }[];
  viewCount: number;
  variants: ProductVariant[];
  bundleItems: BundleItem[];
  createdAt: Date;
  updatedAt: Date;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
  reviewedById?: number | null;
}

/**
 * Partial property bag for updating mutable product fields.
 * Only the fields present in the object will be applied.
 */
export interface UpdateProductProps {
  name?: string;
  nameAr?: string | null;
  sku?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  mainTitle?: string | null;
  mainTitleAr?: string | null;
  promotionalTitle?: string | null;
  promotionalTitleAr?: string | null;
  images?: string[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  costPrice?: number;
  shippingPrice?: number;
  usePlatformShipping?: boolean;
  weightKg?: number | null;
  discountedPrice?: number | null;
  discountPercentage?: number | null;
  discountEndDate?: Date | null;
  stockQuantity?: number;
  maxPerCustomer?: number;
  trackInventory?: boolean;
  requiresShipping?: boolean;
  optionGroups?: { name: string; values: string[] }[];
  bookingAvailableTime?: string | null;
  bookingAvailableDate?: Date | null;
  bookingCapacity?: number | null;
  digitalFileUrl?: string | null;
  digitalFileType?: string | null;
  digitalFileSize?: string | null;
  bundlePrice?: number | null;
  moq?: number;
  unitCount?: number | null;
  unitType?: string | null;
  unitTypeAr?: string | null;
  condition?: ProductCondition;
  currency?: string;
  attributes?: { key: string; value: string; group?: string }[];
}

// ── Aggregate Root ─────────────────────────────────────────────

/**
 * Product aggregate root.
 *
 * Encapsulates all invariants for a supplier's product — type rules,
 * image limits, variant uniqueness, bundle self-reference guards, and
 * status transitions. Child entities ({@link ProductVariant} and
 * {@link BundleItem}) are managed through this aggregate.
 *
 * Use {@link Product.create} for new products and
 * {@link Product.reconstitute} when loading from persistence.
 */
export class Product {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _supplierId: number,
    private readonly _type: ProductTypeVO,
    private _status: ProductStatus,
    private _name: string,
    private _nameAr: string | null,
    private _sku: string | null,
    private _description: string | null,
    private _descriptionAr: string | null,
    private _mainTitle: string | null,
    private _mainTitleAr: string | null,
    private _promotionalTitle: string | null,
    private _promotionalTitleAr: string | null,
    private _images: string[],
    private _categoryId: string | null,
    private _subcategoryId: string | null,
    private _costPrice: number,
    private _shippingPrice: number,
    private _usePlatformShipping: boolean,
    private _weightKg: number | null,
    private _discountedPrice: number | null,
    private _discountPercentage: number | null,
    private _discountEndDate: Date | null,
    private _stockQuantity: number,
    private _maxPerCustomer: number,
    private _trackInventory: boolean,
    private _requiresShipping: boolean,
    private _optionGroups: { name: string; values: string[] }[],
    private _bookingAvailableTime: string | null,
    private _bookingAvailableDate: Date | null,
    private _bookingCapacity: number | null,
    private _digitalFileUrl: string | null,
    private _digitalFileType: string | null,
    private _digitalFileSize: string | null,
    private _bundlePrice: number | null,
    private _moq: number,
    private _unitCount: number | null,
    private _unitType: string | null,
    private _unitTypeAr: string | null,
    private _condition: ProductCondition,
    private _currency: string,
    private _attributes: { key: string; value: string; group?: string }[],
    private _viewCount: number,
    private _variants: ProductVariant[],
    private _bundleItems: BundleItem[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _rejectionReason: string | null = null,
    private _reviewedAt: Date | null = null,
    private _reviewedById: number | null = null,
  ) {}

  private _removedVariantInternalIds: number[] = [];

  // ── Factory Methods ────────────────────────────────────────────

  /**
   * Create a brand-new product aggregate.
   *
   * Validates the product type via {@link ProductTypeVO.fromString} and
   * sets sensible defaults for every optional field. The product starts
   * in `DRAFT` status with no variants or bundle items.
   */
  static create(props: CreateProductProps): Product {
    const type = ProductTypeVO.fromString(props.type);
    // Always start as DRAFT — callers cannot bypass this security boundary.
    const status = ProductStatus.DRAFT;

    return new Product(
      randomUUID(),
      null,
      props.supplierId,
      type,
      status,
      props.name,
      props.nameAr ?? null,
      props.sku ?? null,
      props.description ?? null,
      props.descriptionAr ?? null,
      props.mainTitle ?? null,
      props.mainTitleAr ?? null,
      props.promotionalTitle ?? null,
      props.promotionalTitleAr ?? null,
      props.images ?? [],
      props.categoryId ?? null,
      props.subcategoryId ?? null,
      props.costPrice ?? 0,
      props.shippingPrice ?? 0,
      props.usePlatformShipping ?? false,
      props.weightKg ?? null,
      props.discountedPrice ?? null,
      props.discountPercentage ?? null,
      props.discountEndDate ?? null,
      props.stockQuantity ?? 0,
      props.maxPerCustomer ?? 0,
      props.trackInventory ?? false,
      props.requiresShipping ?? type.requiresShipping(),
      props.optionGroups ?? [],
      props.bookingAvailableTime ?? null,
      props.bookingAvailableDate ?? null,
      props.bookingCapacity ?? null,
      props.digitalFileUrl ?? null,
      props.digitalFileType ?? null,
      props.digitalFileSize ?? null,
      props.bundlePrice ?? null,
      props.moq ?? 1,
      props.unitCount ?? null,
      props.unitType ?? null,
      props.unitTypeAr ?? null,
      props.condition ?? ProductCondition.NEW,
      props.currency ?? 'SAR',
      props.attributes ?? [],
      0,
      [],
      [],
      new Date(),
      new Date(),
      null,
    );
  }

  /**
   * Reconstitute an existing product from persistence data.
   *
   * No validation is performed — the data is assumed trustworthy
   * because it was already validated when the aggregate was first
   * created. Variants and bundle items are passed as pre-built
   * domain entities.
   */
  static reconstitute(props: ReconstitutedProductProps): Product {
    return new Product(
      props._id,
      props.internalId,
      props.supplierId,
      ProductTypeVO.fromString(props.type),
      props.status as ProductStatus,
      props.name,
      props.nameAr,
      props.sku,
      props.description,
      props.descriptionAr,
      props.mainTitle,
      props.mainTitleAr,
      props.promotionalTitle,
      props.promotionalTitleAr,
      props.images,
      props.categoryId,
      props.subcategoryId,
      props.costPrice,
      props.shippingPrice,
      props.usePlatformShipping,
      props.weightKg,
      props.discountedPrice,
      props.discountPercentage,
      props.discountEndDate,
      props.stockQuantity,
      props.maxPerCustomer,
      props.trackInventory,
      props.requiresShipping,
      props.optionGroups,
      props.bookingAvailableTime,
      props.bookingAvailableDate,
      props.bookingCapacity,
      props.digitalFileUrl,
      props.digitalFileType,
      props.digitalFileSize,
      props.bundlePrice,
      props.moq,
      props.unitCount,
      props.unitType,
      props.unitTypeAr,
      props.condition,
      props.currency,
      props.attributes,
      props.viewCount,
      props.variants,
      props.bundleItems,
      props.createdAt,
      props.updatedAt,
      props.rejectionReason ?? null,
      props.reviewedAt ?? null,
      props.reviewedById ?? null,
    );
  }

  // ── Getters ────────────────────────────────────────────────────

  /** Public UUID exposed in API responses and route params. */
  get id(): string {
    return this._id;
  }

  /** Auto-increment PK assigned by the database after first persist. */
  get internalId(): number | null {
    return this._internalId;
  }

  /** Internal PK of the owning supplier. */
  get supplierId(): number {
    return this._supplierId;
  }

  /** Product type value object with behaviour queries. */
  get type(): ProductTypeVO {
    return this._type;
  }

  /** Current lifecycle status (draft, active, inactive, archived). */
  get status(): ProductStatus {
    return this._status;
  }

  get name(): string {
    return this._name;
  }

  get nameAr(): string | null {
    return this._nameAr;
  }

  get sku(): string | null {
    return this._sku;
  }

  get description(): string | null {
    return this._description;
  }

  get descriptionAr(): string | null {
    return this._descriptionAr;
  }

  get mainTitle(): string | null {
    return this._mainTitle;
  }

  get promotionalTitle(): string | null {
    return this._promotionalTitle;
  }

  get mainTitleAr(): string | null {
    return this._mainTitleAr;
  }

  get promotionalTitleAr(): string | null {
    return this._promotionalTitleAr;
  }

  /** Up to {@link MAX_IMAGES} image URLs. */
  get images(): string[] {
    return [...this._images];
  }

  get categoryId(): string | null {
    return this._categoryId;
  }

  get subcategoryId(): string | null {
    return this._subcategoryId;
  }

  get costPrice(): number {
    return this._costPrice;
  }

  get shippingPrice(): number {
    return this._shippingPrice;
  }

  get usePlatformShipping(): boolean {
    return this._usePlatformShipping;
  }

  get weightKg(): number | null {
    return this._weightKg;
  }

  get discountedPrice(): number | null {
    return this._discountedPrice;
  }

  get discountPercentage(): number | null {
    return this._discountPercentage;
  }

  get discountEndDate(): Date | null {
    return this._discountEndDate;
  }

  get stockQuantity(): number {
    return this._stockQuantity;
  }

  get maxPerCustomer(): number {
    return this._maxPerCustomer;
  }

  get trackInventory(): boolean {
    return this._trackInventory;
  }

  get requiresShipping(): boolean {
    return this._requiresShipping;
  }

  get optionGroups(): { name: string; values: string[] }[] {
    return this._optionGroups.map((g) => ({ ...g, values: [...g.values] }));
  }

  get bookingAvailableTime(): string | null {
    return this._bookingAvailableTime;
  }

  get bookingAvailableDate(): Date | null {
    return this._bookingAvailableDate;
  }

  get bookingCapacity(): number | null {
    return this._bookingCapacity;
  }

  get digitalFileUrl(): string | null {
    return this._digitalFileUrl;
  }

  get digitalFileType(): string | null {
    return this._digitalFileType;
  }

  get digitalFileSize(): string | null {
    return this._digitalFileSize;
  }

  get bundlePrice(): number | null {
    return this._bundlePrice;
  }

  get moq(): number {
    return this._moq;
  }

  get unitCount(): number | null {
    return this._unitCount;
  }

  get unitType(): string | null {
    return this._unitType;
  }

  get unitTypeAr(): string | null {
    return this._unitTypeAr;
  }

  get condition(): ProductCondition {
    return this._condition;
  }

  get currency(): string {
    return this._currency;
  }

  get attributes(): { key: string; value: string; group?: string }[] {
    return this._attributes.map((a) => ({ ...a }));
  }

  get viewCount(): number {
    return this._viewCount;
  }

  /** Snapshot of current variants (defensive copy). */
  get variants(): ProductVariant[] {
    return [...this._variants];
  }

  /** Snapshot of current bundle items (defensive copy). */
  get bundleItems(): BundleItem[] {
    return [...this._bundleItems];
  }

  /** Internal PKs of variants removed by the last replaceVariants call (for soft-delete in the handler). */
  get removedVariantInternalIds(): number[] {
    return [...this._removedVariantInternalIds];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Reason provided by the admin when rejecting the product, or null if not rejected. */
  get rejectionReason(): string | null {
    return this._rejectionReason;
  }

  /** Timestamp of the last admin review decision (approve or reject). */
  get reviewedAt(): Date | null {
    return this._reviewedAt;
  }

  /** Internal ID of the admin who last reviewed the product. */
  get reviewedById(): number | null {
    return this._reviewedById;
  }

  // ── Behaviour ──────────────────────────────────────────────────

  /**
   * Guard that ensures the given supplier owns this product.
   *
   * @throws {ProductNotFoundException} if the supplier ID does not match.
   */
  assertOwnedBy(supplierId: number): void {
    if (this._supplierId !== supplierId) {
      throw new ProductNotFoundException(this._id);
    }
  }

  /**
   * Submit the product for admin review.
   *
   * Valid from DRAFT or REJECTED only.
   * @throws {InvalidProductStatusTransitionException} for any other starting state.
   */
  submitForApproval(): void {
    if (
      this._status !== ProductStatus.DRAFT &&
      this._status !== ProductStatus.REJECTED
    ) {
      throw new InvalidProductStatusTransitionException(
        this._status,
        'pending',
      );
    }
    this._status = ProductStatus.PENDING;
    this._updatedAt = new Date();
  }

  /**
   * Approve a pending product, making it publicly visible.
   *
   * Valid from PENDING only.
   * @throws {InvalidProductStatusTransitionException} for any other starting state.
   */
  approve(reviewerId: number): void {
    if (this._status !== ProductStatus.PENDING) {
      throw new InvalidProductStatusTransitionException(this._status, 'active');
    }
    this._status = ProductStatus.ACTIVE;
    this._reviewedAt = new Date();
    this._reviewedById = reviewerId;
    this._updatedAt = new Date();
  }

  /**
   * Reject a product with a reason.
   *
   * Valid from PENDING or ACTIVE (admin revoke).
   * @throws {InvalidProductStatusTransitionException} for any other starting state.
   */
  reject(reason: string, reviewerId: number): void {
    if (
      this._status !== ProductStatus.PENDING &&
      this._status !== ProductStatus.ACTIVE
    ) {
      throw new InvalidProductStatusTransitionException(
        this._status,
        'rejected',
      );
    }
    this._status = ProductStatus.REJECTED;
    this._rejectionReason = reason;
    this._reviewedAt = new Date();
    this._reviewedById = reviewerId;
    this._updatedAt = new Date();
  }

  /**
   * Deactivate an active product (supplier-initiated).
   *
   * Valid from ACTIVE only.
   * @throws {InvalidProductStatusTransitionException} for any other starting state.
   */
  deactivate(): void {
    if (this._status !== ProductStatus.ACTIVE) {
      throw new InvalidProductStatusTransitionException(
        this._status,
        'inactive',
      );
    }
    this._status = ProductStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Reactivate a previously deactivated product (supplier-initiated).
   *
   * Valid from INACTIVE only.
   * @throws {InvalidProductStatusTransitionException} for any other starting state.
   */
  activate(): void {
    if (this._status !== ProductStatus.INACTIVE) {
      throw new InvalidProductStatusTransitionException(this._status, 'active');
    }
    this._status = ProductStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Archive the product, removing it from supplier management.
   *
   * Valid from any status except ARCHIVED.
   * @throws {InvalidProductStatusTransitionException} if already archived.
   */
  archive(): void {
    if (this._status === ProductStatus.ARCHIVED) {
      throw new InvalidProductStatusTransitionException(
        this._status,
        'archived',
      );
    }
    this._status = ProductStatus.ARCHIVED;
    this._updatedAt = new Date();
  }

  /**
   * Revert the product back to PENDING for re-review after an edit.
   *
   * Valid from ACTIVE or INACTIVE. No-op for all other states.
   */
  revertToPendingForReview(): void {
    if (
      this._status !== ProductStatus.ACTIVE &&
      this._status !== ProductStatus.INACTIVE
    ) {
      return; // no-op for states that don't need re-review
    }
    this._status = ProductStatus.PENDING;
    this._updatedAt = new Date();
  }

  /**
   * Supplier-facing status change gate.
   *
   * Suppliers may only self-initiate INACTIVE, ACTIVE (from INACTIVE), and ARCHIVED
   * transitions. They cannot reach ACTIVE from PENDING/REJECTED (that requires admin
   * approval via {@link approve}) and cannot set PENDING directly.
   *
   * @throws {InvalidProductStatusTransitionException} for disallowed targets.
   */
  changeStatus(target: ProductStatus): void {
    switch (target) {
      case ProductStatus.INACTIVE:
        this.deactivate();
        break;
      case ProductStatus.ACTIVE:
        this.activate(); // only valid from INACTIVE (already approved)
        break;
      case ProductStatus.ARCHIVED:
        this.archive();
        break;
      default:
        throw new InvalidProductStatusTransitionException(this._status, target);
    }
  }

  /**
   * Apply a partial update to mutable product fields.
   *
   * Only the properties present in {@link UpdateProductProps} are
   * overwritten; everything else is left untouched.
   */
  updateDetails(partial: UpdateProductProps): void {
    if (partial.name !== undefined) this._name = partial.name;
    if (partial.nameAr !== undefined) this._nameAr = partial.nameAr;
    if (partial.sku !== undefined) this._sku = partial.sku;
    if (partial.description !== undefined)
      this._description = partial.description;
    if (partial.descriptionAr !== undefined)
      this._descriptionAr = partial.descriptionAr;
    if (partial.mainTitle !== undefined) this._mainTitle = partial.mainTitle;
    if (partial.mainTitleAr !== undefined)
      this._mainTitleAr = partial.mainTitleAr;
    if (partial.promotionalTitle !== undefined)
      this._promotionalTitle = partial.promotionalTitle;
    if (partial.promotionalTitleAr !== undefined)
      this._promotionalTitleAr = partial.promotionalTitleAr;
    if (partial.images !== undefined) {
      if (partial.images.length > MAX_IMAGES) {
        throw new MaxImagesExceededException(MAX_IMAGES);
      }
      this._images = partial.images;
    }
    if (partial.categoryId !== undefined) this._categoryId = partial.categoryId;
    if (partial.subcategoryId !== undefined)
      this._subcategoryId = partial.subcategoryId;
    if (partial.costPrice !== undefined) this._costPrice = partial.costPrice;
    if (partial.shippingPrice !== undefined)
      this._shippingPrice = partial.shippingPrice;
    if (partial.usePlatformShipping !== undefined)
      this._usePlatformShipping = partial.usePlatformShipping;
    if (partial.weightKg !== undefined) this._weightKg = partial.weightKg;
    if (partial.discountedPrice !== undefined)
      this._discountedPrice = partial.discountedPrice;
    if (partial.discountPercentage !== undefined)
      this._discountPercentage = partial.discountPercentage;
    if (partial.discountEndDate !== undefined)
      this._discountEndDate = partial.discountEndDate;
    if (partial.stockQuantity !== undefined)
      this._stockQuantity = partial.stockQuantity;
    if (partial.maxPerCustomer !== undefined)
      this._maxPerCustomer = partial.maxPerCustomer;
    if (partial.trackInventory !== undefined)
      this._trackInventory = partial.trackInventory;
    if (partial.requiresShipping !== undefined)
      this._requiresShipping = partial.requiresShipping;
    if (partial.optionGroups !== undefined)
      this._optionGroups = partial.optionGroups;
    if (partial.bookingAvailableTime !== undefined)
      this._bookingAvailableTime = partial.bookingAvailableTime;
    if (partial.bookingAvailableDate !== undefined)
      this._bookingAvailableDate = partial.bookingAvailableDate;
    if (partial.bookingCapacity !== undefined)
      this._bookingCapacity = partial.bookingCapacity;
    if (partial.digitalFileUrl !== undefined)
      this._digitalFileUrl = partial.digitalFileUrl;
    if (partial.digitalFileType !== undefined)
      this._digitalFileType = partial.digitalFileType;
    if (partial.digitalFileSize !== undefined)
      this._digitalFileSize = partial.digitalFileSize;
    if (partial.bundlePrice !== undefined)
      this._bundlePrice = partial.bundlePrice;
    if (partial.moq !== undefined) this._moq = partial.moq;
    if (partial.unitCount !== undefined) this._unitCount = partial.unitCount;
    if (partial.unitType !== undefined) this._unitType = partial.unitType;
    if (partial.unitTypeAr !== undefined) this._unitTypeAr = partial.unitTypeAr;
    if (partial.condition !== undefined) this._condition = partial.condition;
    if (partial.currency !== undefined) this._currency = partial.currency;
    if (partial.attributes !== undefined) this._attributes = partial.attributes;
    this._updatedAt = new Date();
  }

  incrementViewCount(): void {
    this._viewCount += 1;
  }

  /**
   * Append image URLs to the product's image list.
   *
   * @throws {MaxImagesExceededException} if adding the new images
   *   would push the total count past {@link MAX_IMAGES}.
   */
  addImages(urls: string[]): void {
    if (this._images.length + urls.length > MAX_IMAGES) {
      throw new MaxImagesExceededException(MAX_IMAGES);
    }
    this._images.push(...urls);
    this._updatedAt = new Date();
  }

  /**
   * Add a new variant to this product.
   *
   * @throws {DuplicateVariantException} if a variant with the same
   *   colour/size combination already exists.
   */
  addVariant(props: CreateVariantProps): ProductVariant {
    const duplicate = this._variants.find((v) =>
      v.matchesColorSize(props.color ?? null, props.size ?? null),
    );
    if (duplicate) {
      throw new DuplicateVariantException(
        props.color ?? null,
        props.size ?? null,
      );
    }
    const variant = ProductVariant.create(props);
    if (this._internalId !== null) {
      variant.assignProductId(this._internalId);
    }
    this._variants.push(variant);
    this._updatedAt = new Date();
    return variant;
  }

  /**
   * Update an existing variant within this aggregate by its public UUID.
   *
   * @throws {ProductVariantNotFoundException} (from caller) if not found.
   * @returns the updated {@link ProductVariant}, or `undefined` if not found.
   */
  updateVariant(
    variantId: string,
    partial: Partial<CreateVariantProps>,
  ): ProductVariant | undefined {
    const variant = this._variants.find((v) => v.id === variantId);
    if (!variant) return undefined;
    variant.update(partial);
    this._updatedAt = new Date();
    return variant;
  }

  /**
   * Remove a variant by its public UUID.
   *
   * @returns the removed {@link ProductVariant}, or `undefined`
   *   if no matching variant was found.
   */
  removeVariant(variantId: string): ProductVariant | undefined {
    const idx = this._variants.findIndex((v) => v.id === variantId);
    if (idx === -1) return undefined;
    const [removed] = this._variants.splice(idx, 1);
    this._updatedAt = new Date();
    return removed;
  }

  /**
   * Add a child product to this bundle.
   *
   * @throws {BundleItemSelfReferenceException} if the child product
   *   ID matches this product's own public UUID.
   */
  addBundleItem(childProductId: string): BundleItem {
    if (childProductId === this._id) {
      throw new BundleItemSelfReferenceException();
    }
    const duplicate = this._bundleItems.find(
      (b) => b.childProductId === childProductId,
    );
    if (duplicate) {
      throw new DuplicateBundleItemException(childProductId);
    }
    const item = BundleItem.create(childProductId);
    if (this._internalId !== null) {
      item.assignParentProductId(this._internalId);
    }
    this._bundleItems.push(item);
    this._updatedAt = new Date();
    return item;
  }

  /**
   * Remove a bundle item by its public UUID.
   *
   * @returns the removed {@link BundleItem}, or `undefined`
   *   if no matching item was found.
   */
  removeBundleItem(bundleItemId: string): BundleItem | undefined {
    const idx = this._bundleItems.findIndex((b) => b.id === bundleItemId);
    if (idx === -1) return undefined;
    const [removed] = this._bundleItems.splice(idx, 1);
    this._updatedAt = new Date();
    return removed;
  }

  /**
   * Replace the variant set using a merge-by-id strategy.
   *
   * Items that carry a matching `id` (public UUID) are updated in-place,
   * preserving their internal PK and inventory identity.  Items without an
   * `id`, or whose `id` is not among the current variants, are treated as
   * new and inserted.  Existing variants whose `id` is absent from the
   * input are removed; their `internalId`s are recorded in
   * {@link removedVariantInternalIds} so the handler can soft-delete them.
   */
  replaceVariants(items: (CreateVariantProps & { id?: string })[]): void {
    const existingById = new Map<string, ProductVariant>(
      this._variants.map((v) => [v.id, v]),
    );

    const nextVariants: ProductVariant[] = [];
    const keptIds = new Set<string>();

    for (const item of items) {
      if (item.id && existingById.has(item.id)) {
        const existing = existingById.get(item.id)!;
        existing.update(item);
        nextVariants.push(existing);
        keptIds.add(item.id);
      } else {
        const duplicate = nextVariants.find((v) =>
          v.matchesColorSize(item.color ?? null, item.size ?? null),
        );
        if (duplicate) {
          throw new DuplicateVariantException(
            item.color ?? null,
            item.size ?? null,
          );
        }
        const variant = ProductVariant.create(item);
        if (this._internalId !== null) {
          variant.assignProductId(this._internalId);
        }
        nextVariants.push(variant);
      }
    }

    this._removedVariantInternalIds = this._variants
      .filter((v) => !keptIds.has(v.id) && v.internalId !== null)
      .map((v) => v.internalId!);

    this._variants = nextVariants;
    this._updatedAt = new Date();
  }

  /**
   * Replace all bundle items with a new set of child product IDs.
   *
   * Clears the current bundle item list and adds each new child,
   * enforcing the self-reference guard via {@link addBundleItem}.
   * Caller is responsible for deleting old bundle item rows from persistence.
   */
  replaceBundleItems(childProductIds: string[]): void {
    this._bundleItems = [];
    for (const childId of childProductIds) {
      this.addBundleItem(childId);
    }
  }
}
