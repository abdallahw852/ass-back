export class GetClientStatsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
  ) {}
}
