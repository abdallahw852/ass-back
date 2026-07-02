export class ListAssignedRfqsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly filters: {
      page?: number;
      limit?: number;
    },
  ) {}
}
