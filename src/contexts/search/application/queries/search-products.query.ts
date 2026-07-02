import type { SearchFilters } from '../../domain/search.types';

export class SearchProductsQuery {
  constructor(public readonly filters: SearchFilters) {}
}
