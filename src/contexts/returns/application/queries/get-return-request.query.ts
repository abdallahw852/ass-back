export class GetReturnRequestQuery {
  constructor(
    public readonly returnId: string,
    public readonly supplierId: number,
  ) {}
}
