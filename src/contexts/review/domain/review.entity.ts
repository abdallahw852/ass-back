import { randomUUID } from 'node:crypto';
import { InvalidRatingException } from './review.exceptions';

export interface CreateReviewProps {
  productId: number;
  buyerId: number;
  rating: number;
  title?: string | null;
  body?: string | null;
  images?: string[];
  isVerifiedPurchase?: boolean;
}

export interface ReconstitutedReviewProps {
  _id: string;
  internalId: number;
  productId: number;
  buyerId: number;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Review {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _productId: number,
    private readonly _buyerId: number,
    private _rating: number,
    private _title: string | null,
    private _body: string | null,
    private _images: string[],
    private _isVerifiedPurchase: boolean,
    private _helpfulCount: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateReviewProps): Review {
    if (props.rating < 1 || props.rating > 5) {
      throw new InvalidRatingException();
    }
    return new Review(
      randomUUID(),
      null,
      props.productId,
      props.buyerId,
      props.rating,
      props.title ?? null,
      props.body ?? null,
      props.images ?? [],
      props.isVerifiedPurchase ?? false,
      0,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedReviewProps): Review {
    return new Review(
      props._id,
      props.internalId,
      props.productId,
      props.buyerId,
      props.rating,
      props.title,
      props.body,
      props.images,
      props.isVerifiedPurchase,
      props.helpfulCount,
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
  get productId(): number {
    return this._productId;
  }
  get buyerId(): number {
    return this._buyerId;
  }
  get rating(): number {
    return this._rating;
  }
  get title(): string | null {
    return this._title;
  }
  get body(): string | null {
    return this._body;
  }
  get images(): string[] {
    return [...this._images];
  }
  get isVerifiedPurchase(): boolean {
    return this._isVerifiedPurchase;
  }
  get helpfulCount(): number {
    return this._helpfulCount;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  incrementHelpful(): void {
    this._helpfulCount += 1;
    this._updatedAt = new Date();
  }
}
