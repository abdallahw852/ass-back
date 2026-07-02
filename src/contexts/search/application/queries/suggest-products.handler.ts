import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { SuggestProductsQuery } from './suggest-products.query';
import { ElasticsearchService } from '../../infrastructure/elasticsearch.service';

@QueryHandler(SuggestProductsQuery)
export class SuggestProductsHandler implements IQueryHandler<SuggestProductsQuery> {
  constructor(private readonly es: ElasticsearchService) {}

  async execute(
    query: SuggestProductsQuery,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.es.suggest(query.q);
    return { suggestions };
  }
}
