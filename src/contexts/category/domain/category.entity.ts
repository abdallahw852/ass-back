import { randomUUID } from 'node:crypto';

export interface CreateCategoryProps {
  name: string;
  nameAr?: string | null;
  slug: string;
  parentId?: number | null;
  imageUrl?: string | null;
  iconUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  level?: number;
}

export interface ReconstitutedCategoryProps {
  _id: string;
  internalId: number;
  name: string;
  nameAr: string | null;
  slug: string;
  parentId: number | null;
  imageUrl: string | null;
  iconUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  level: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCategoryProps {
  name?: string;
  nameAr?: string | null;
  slug?: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Re-parent: pass the new parent's internalId (null for top-level). */
  parentId?: number | null;
  /** Derived level; set by the handler, not by clients directly. */
  level?: number;
}

export class Category {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private _name: string,
    private _nameAr: string | null,
    private _slug: string,
    private _parentId: number | null,
    private _imageUrl: string | null,
    private _iconUrl: string | null,
    private _description: string | null,
    private _sortOrder: number,
    private _isActive: boolean,
    private _level: number,
    private _productCount: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateCategoryProps): Category {
    return new Category(
      randomUUID(),
      null,
      props.name,
      props.nameAr ?? null,
      props.slug,
      props.parentId ?? null,
      props.imageUrl ?? null,
      props.iconUrl ?? null,
      props.description ?? null,
      props.sortOrder ?? 0,
      true,
      props.level ?? 0,
      0,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedCategoryProps): Category {
    return new Category(
      props._id,
      props.internalId,
      props.name,
      props.nameAr,
      props.slug,
      props.parentId,
      props.imageUrl,
      props.iconUrl,
      props.description,
      props.sortOrder,
      props.isActive,
      props.level,
      props.productCount,
      props.createdAt,
      props.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get internalId(): number | null {
    return this._internalId;
  }

  get name(): string {
    return this._name;
  }

  get nameAr(): string | null {
    return this._nameAr;
  }

  get slug(): string {
    return this._slug;
  }

  get parentId(): number | null {
    return this._parentId;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get iconUrl(): string | null {
    return this._iconUrl;
  }

  get description(): string | null {
    return this._description;
  }

  get sortOrder(): number {
    return this._sortOrder;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get level(): number {
    return this._level;
  }

  get productCount(): number {
    return this._productCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDetails(partial: UpdateCategoryProps): void {
    if (partial.name !== undefined) this._name = partial.name;
    if (partial.nameAr !== undefined) this._nameAr = partial.nameAr;
    if (partial.slug !== undefined) this._slug = partial.slug;
    if (partial.imageUrl !== undefined) this._imageUrl = partial.imageUrl;
    if (partial.iconUrl !== undefined) this._iconUrl = partial.iconUrl;
    if (partial.description !== undefined)
      this._description = partial.description;
    if (partial.sortOrder !== undefined) this._sortOrder = partial.sortOrder;
    if (partial.isActive !== undefined) this._isActive = partial.isActive;
    if (partial.parentId !== undefined) this._parentId = partial.parentId;
    if (partial.level !== undefined) this._level = partial.level;
    this._updatedAt = new Date();
  }

  incrementProductCount(): void {
    this._productCount += 1;
  }

  decrementProductCount(): void {
    if (this._productCount > 0) this._productCount -= 1;
  }
}
