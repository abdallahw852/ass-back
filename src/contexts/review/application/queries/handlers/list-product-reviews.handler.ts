import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListProductReviewsQuery } from '../list-product-reviews.query';
import type { IReviewRepository } from '../../../domain/review.repository.interface';
import { REVIEW_REPOSITORY } from '../../../domain/review.repository.interface';
import { ReviewMapper } from '../../../infrastructure/mappers/review.mapper';

@QueryHandler(ListProductReviewsQuery)
export class ListProductReviewsHandler implements IQueryHandler<ListProductReviewsQuery> {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepo: IReviewRepository,
  ) {}

  async execute(
    query: ListProductReviewsQuery,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const { items, total } = await this.reviewRepo.findByProductId(
      query.productId,
      { page: query.page, limit: query.limit },
    );
    return { items: items.map((r) => ReviewMapper.toResponse(r)), total };
  }
}
