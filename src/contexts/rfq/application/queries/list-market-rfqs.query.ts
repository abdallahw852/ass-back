export class ListMarketRfqsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly filters: {
      search?: string;
      categoryId?: string;
      country?: string;
      page?: number;
      limit?: number;
    },
  ) {}
}
