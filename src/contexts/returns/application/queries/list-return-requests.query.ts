export class ListReturnRequestsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly status: string | undefined,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
