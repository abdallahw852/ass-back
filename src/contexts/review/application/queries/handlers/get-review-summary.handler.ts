import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetReviewSummaryQuery } from '../get-review-summary.query';
import type { IReviewRepository } from '../../../domain/review.repository.interface';
import { REVIEW_REPOSITORY } from '../../../domain/review.repository.interface';

@QueryHandler(GetReviewSummaryQuery)
export class GetReviewSummaryHandler implements IQueryHandler<GetReviewSummaryQuery> {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepo: IReviewRepository,
  ) {}

  async execute(query: GetReviewSummaryQuery): Promise<{
    averageRating: number;
    totalCount: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    return this.reviewRepo.getSummary(query.productId);
  }
}
