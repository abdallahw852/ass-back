export class ListSupplierQuotationsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly filters: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {}
}
