export class TrackShipmentQuery {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
  ) {}
}
