export class ListBuyerRfqsQuery {
  constructor(
    public readonly buyerId: number,
    public readonly filters: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {}
}
