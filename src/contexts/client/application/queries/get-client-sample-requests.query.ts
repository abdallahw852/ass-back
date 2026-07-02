export class GetClientSampleRequestsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
  ) {}
}
