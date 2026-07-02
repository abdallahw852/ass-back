export class GetOrderQuery {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
  ) {}
}
