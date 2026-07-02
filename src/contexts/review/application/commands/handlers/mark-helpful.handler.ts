import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkHelpfulCommand } from '../mark-helpful.command';
import type { IReviewRepository } from '../../../domain/review.repository.interface';
import { REVIEW_REPOSITORY } from '../../../domain/review.repository.interface';
import { ReviewNotFoundException } from '../../../domain/review.exceptions';
import { ReviewMapper } from '../../../infrastructure/mappers/review.mapper';

@CommandHandler(MarkHelpfulCommand)
export class MarkHelpfulHandler implements ICommandHandler<MarkHelpfulCommand> {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepo: IReviewRepository,
  ) {}

  async execute(
    command: MarkHelpfulCommand,
  ): Promise<{ review: Record<string, unknown> }> {
    const review = await this.reviewRepo.findByPublicId(command.reviewId);
    if (!review) throw new ReviewNotFoundException(command.reviewId);

    review.incrementHelpful();
    const updated = await this.reviewRepo.update(review);
    return { review: ReviewMapper.toResponse(updated) };
  }
}
