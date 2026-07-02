import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SubmitReviewCommand } from '../submit-review.command';
import type { IReviewRepository } from '../../../domain/review.repository.interface';
import { REVIEW_REPOSITORY } from '../../../domain/review.repository.interface';
import { Review } from '../../../domain/review.entity';
import { DuplicateReviewException } from '../../../domain/review.exceptions';
import { ReviewMapper } from '../../../infrastructure/mappers/review.mapper';

@CommandHandler(SubmitReviewCommand)
export class SubmitReviewHandler implements ICommandHandler<SubmitReviewCommand> {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepo: IReviewRepository,
  ) {}

  async execute(
    command: SubmitReviewCommand,
  ): Promise<{ review: Record<string, unknown> }> {
    const existing = await this.reviewRepo.findByBuyerAndProduct(
      command.buyerId,
      command.productId,
    );
    if (existing) throw new DuplicateReviewException();

    const review = Review.create({
      productId: command.productId,
      buyerId: command.buyerId,
      rating: command.rating,
      title: command.title,
      body: command.body,
      images: command.images,
      isVerifiedPurchase: command.isVerifiedPurchase,
    });

    const saved = await this.reviewRepo.save(review);
    return { review: ReviewMapper.toResponse(saved) };
  }
}
