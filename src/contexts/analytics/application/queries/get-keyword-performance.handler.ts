import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetKeywordPerformanceQuery } from './get-keyword-performance.query';
import { AnalyticsEventOrmEntity } from '../../infrastructure/persistence/analytics-event.orm-entity';

export interface KeywordPerformanceResult {
  results: Array<{ path: string; views: number; uniques: number }>;
}

@QueryHandler(GetKeywordPerformanceQuery)
export class GetKeywordPerformanceHandler implements IQueryHandler<GetKeywordPerformanceQuery> {
  constructor(
    @InjectRepository(AnalyticsEventOrmEntity, 'write')
    private readonly repo: Repository<AnalyticsEventOrmEntity>,
  ) {}

  async execute(
    query: GetKeywordPerformanceQuery,
  ): Promise<KeywordPerformanceResult> {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const rows = await this.repo
      .createQueryBuilder('ae')
      .select('ae.path', 'path')
      .addSelect('COUNT(*)', 'views')
      .addSelect('COUNT(DISTINCT ae.sessionId)', 'uniques')
      .where('ae.createdAt >= :from', { from })
      .andWhere('ae.createdAt <= :to', { to })
      .groupBy('ae.path')
      .orderBy('views', 'DESC')
      .limit(20)
      .getRawMany<{ path: string; views: string; uniques: string }>();

    return {
      results: rows.map((r) => ({
        path: r.path,
        views: parseInt(r.views, 10),
        uniques: parseInt(r.uniques, 10),
      })),
    };
  }
}
