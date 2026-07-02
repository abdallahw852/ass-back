export class ListCatalogProductsQuery {
  constructor(
    public readonly filters: {
      categoryId?: string;
      subcategoryId?: string;
      condition?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      search?: string;
      sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'most_viewed';
      page?: number;
      limit?: number;
    },
  ) {}
}
