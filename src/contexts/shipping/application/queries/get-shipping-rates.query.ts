export class GetShippingRatesQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerId: number,
  ) {}
}
