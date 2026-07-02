import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { IReviewRepository } from '../../domain/review.repository.interface';
import type { Review } from '../../domain/review.entity';
import { ReviewOrmEntity } from '../persistence/review.orm-entity';
import { ReviewMapper } from '../mappers/review.mapper';

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(
    @InjectRepository(ReviewOrmEntity, 'write')
    private readonly repo: Repository<ReviewOrmEntity>,
  ) {}

  async findByPublicId(id: string): Promise<Review | null> {
    const orm = await this.repo.findOne({ where: { _id: id } });
    return orm ? ReviewMapper.toDomain(orm) : null;
  }

  async findByBuyerAndProduct(
    buyerId: number,
    productId: number,
  ): Promise<Review | null> {
    const orm = await this.repo.findOne({ where: { buyerId, productId } });
    return orm ? ReviewMapper.toDomain(orm) : null;
  }

  async save(review: Review): Promise<Review> {
    const orm = ReviewMapper.toOrm(review);
    const saved = await this.repo.save(orm);
    return ReviewMapper.toDomain(saved);
  }

  async update(review: Review): Promise<Review> {
    const orm = ReviewMapper.toOrm(review);
    const saved = await this.repo.save(orm);
    return ReviewMapper.toDomain(saved);
  }

  async findByProductId(
    productId: number,
    options?: { page?: number; limit?: number },
  ): Promise<{ items: Review[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;

    const [items, total] = await this.repo.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: items.map((o) => ReviewMapper.toDomain(o)), total };
  }

  async getSummary(productId: number): Promise<{
    averageRating: number;
    totalCount: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    const rows = (await this.repo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .groupBy('r.rating')
      .getRawMany()) as unknown as { rating: string; count: string }[];

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let total = 0;
    let sum = 0;

    for (const row of rows) {
      const r = Number(row.rating);
      const c = Number(row.count);
      distribution[r] = c;
      total += c;
      sum += r * c;
    }

    return {
      averageRating: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
      totalCount: total,
      distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
    };
  }
}
