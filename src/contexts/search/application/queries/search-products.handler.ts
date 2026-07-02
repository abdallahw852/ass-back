import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { SearchProductsQuery } from './search-products.query';
import { ElasticsearchService } from '../../infrastructure/elasticsearch.service';
import type { SearchProductDocument } from '../../domain/search-product-document.interface';

@QueryHandler(SearchProductsQuery)
export class SearchProductsHandler implements IQueryHandler<SearchProductsQuery> {
  constructor(private readonly es: ElasticsearchService) {}

  async execute(query: SearchProductsQuery): Promise<{
    items: SearchProductDocument[];
    total: number;
    page: number;
    limit: number;
    facets: Record<string, unknown>;
  }> {
    const { filters } = query;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 24;
    const result = await this.es.search(filters);
    return { ...result, page, limit };
  }
}
