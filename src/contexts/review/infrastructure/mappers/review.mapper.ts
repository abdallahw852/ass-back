import { Review } from '../../domain/review.entity';
import { ReviewOrmEntity } from '../persistence/review.orm-entity';

export class ReviewMapper {
  static toDomain(orm: ReviewOrmEntity): Review {
    return Review.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      productId: orm.productId,
      buyerId: orm.buyerId,
      rating: orm.rating,
      title: orm.title,
      body: orm.body,
      images: orm.images ?? [],
      isVerifiedPurchase: orm.isVerifiedPurchase,
      helpfulCount: orm.helpfulCount,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: Review): ReviewOrmEntity {
    const orm = new ReviewOrmEntity();
    orm._id = domain.id;
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm.productId = domain.productId;
    orm.buyerId = domain.buyerId;
    orm.rating = domain.rating;
    orm.title = domain.title;
    orm.body = domain.body;
    orm.images = domain.images;
    orm.isVerifiedPurchase = domain.isVerifiedPurchase;
    orm.helpfulCount = domain.helpfulCount;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static toResponse(domain: Review): Record<string, unknown> {
    return {
      id: domain.id,
      productId: domain.productId,
      buyerId: domain.buyerId,
      rating: domain.rating,
      title: domain.title,
      body: domain.body,
      images: domain.images,
      isVerifiedPurchase: domain.isVerifiedPurchase,
      helpfulCount: domain.helpfulCount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
