export class GetClientQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
  ) {}
}
