export class GetClientOrdersQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
