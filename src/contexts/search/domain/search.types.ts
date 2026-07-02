export type SearchSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'moq_asc'
  | 'moq_desc'
  | 'newest';

export interface SearchFilters {
  q?: string;
  categoryIds?: string[];
  countries?: string[];
  supplierTypes?: string[];
  verifiedOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  moqMin?: number;
  moqMax?: number;
  sort?: SearchSort;
  page?: number;
  limit?: number;
  facets?: boolean;
}
