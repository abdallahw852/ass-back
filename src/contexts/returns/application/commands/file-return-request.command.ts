export class FileReturnRequestCommand {
  constructor(
    public readonly orderId: string,
    public readonly supplierId: number,
    public readonly reviewerId: number,
    public readonly reason: string,
  ) {}
}
