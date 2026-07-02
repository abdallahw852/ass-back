import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { ProductOrmEntity } from '../../product/infrastructure/persistence/product.orm-entity';
import { ProductStatus } from '../../product/domain/enums/product-status.enum';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { SubmitReviewCommand } from '../application/commands/submit-review.command';
import { MarkHelpfulCommand } from '../application/commands/mark-helpful.command';
import { ListProductReviewsQuery } from '../application/queries/list-product-reviews.query';
import { GetReviewSummaryQuery } from '../application/queries/get-review-summary.query';
import { ReviewFormatter } from './review.formatter';

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@Controller()
export class ReviewController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
  ) {}

  private async resolveProductInternalId(publicId: string): Promise<number> {
    const product = await this.productRepo.findOne({
      where: { _id: publicId },
      select: ['id', 'status'],
    });
    if (!product || product.status !== ProductStatus.ACTIVE)
      throw new NotFoundException(`Product '${publicId}' not found.`);
    return product.id;
  }

  @Post('products/:productId/reviews')
  @UseGuards(SessionAuthGuard)
  async submit(
    @Param('productId') productId: string,
    @Body() dto: SubmitReviewDto,
    @Req() req: FastifyRequest,
  ): Promise<{ review: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const internalProductId = await this.resolveProductInternalId(productId);
    const result = (await this.commandBus.execute(
      new SubmitReviewCommand(
        internalProductId,
        buyerId,
        dto.rating,
        dto.title ?? null,
        dto.body ?? null,
        dto.images ?? [],
        false,
      ),
    )) as unknown as { review: Record<string, unknown> };
    return { review: ReviewFormatter.review(result.review) };
  }

  @AllowUnverified()
  @Get('products/:productId/reviews')
  async listByProduct(
    @Param('productId') productId: string,
    @Query() query: ListReviewsQueryDto,
  ): Promise<Record<string, unknown>> {
    const internalProductId = await this.resolveProductInternalId(productId);
    const result = (await this.queryBus.execute(
      new ListProductReviewsQuery(
        internalProductId,
        query.page ?? 1,
        query.limit ?? 10,
      ),
    )) as unknown as { items: Record<string, unknown>[]; total: number };
    return ReviewFormatter.list(result);
  }

  @AllowUnverified()
  @Get('products/:productId/reviews/summary')
  async summary(
    @Param('productId') productId: string,
  ): Promise<Record<string, unknown>> {
    const internalProductId = await this.resolveProductInternalId(productId);
    const result = (await this.queryBus.execute(
      new GetReviewSummaryQuery(internalProductId),
    )) as unknown as {
      averageRating: number;
      totalCount: number;
      distribution: Record<number, number>;
    };
    return ReviewFormatter.summary(result);
  }

  @Post('reviews/:reviewId/helpful')
  @UseGuards(SessionAuthGuard)
  async markHelpful(
    @Param('reviewId') reviewId: string,
  ): Promise<{ review: Record<string, unknown> }> {
    const result = (await this.commandBus.execute(
      new MarkHelpfulCommand(reviewId),
    )) as unknown as { review: Record<string, unknown> };
    return { review: ReviewFormatter.review(result.review) };
  }
}
