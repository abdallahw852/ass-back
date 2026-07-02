import type { Review } from './review.entity';

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

export interface IReviewRepository {
  findByPublicId(id: string): Promise<Review | null>;
  findByBuyerAndProduct(
    buyerId: number,
    productId: number,
  ): Promise<Review | null>;
  save(review: Review): Promise<Review>;
  update(review: Review): Promise<Review>;
  findByProductId(
    productId: number,
    options?: { page?: number; limit?: number },
  ): Promise<{ items: Review[]; total: number }>;
  getSummary(productId: number): Promise<{
    averageRating: number;
    totalCount: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }>;
}
